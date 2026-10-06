/**
 * Headless export: run the plugin's longform -> LaTeX pipeline on a vault
 * folder from node, with no Obsidian running.
 *
 * The plugin's parsing core (`parse_longform`) only needs two injected
 * functions, `read_tfile` and `find_file`, so the whole export can be driven
 * from disk. This module supplies filesystem versions of them, mirrors the
 * side files that `main.ts` writes around the .tex (header.tex, preamble.sty,
 * bibliography.bib, Files/, export_report.json), and leaves the plugin source
 * untouched.
 *
 * Driven by `tests/headless_export.test.ts` (jest, with the obsidian mock).
 */
import * as fs from "fs";
import * as path from "path";
import { TFile } from "obsidian";
import {
	parse_longform,
	write_with_template,
	write_without_template,
	get_header_tex,
	DEFAULT_SETTINGS,
	collected_warnings,
} from "../src/export_longform";
import type { ExportPluginSettings } from "../src/export_longform";
import type { ExportWarning } from "../src/export_longform";
import { address_is_image_file } from "../src/export_longform/interfaces";

export type VaultIndex = {
	root: string;
	/** lowercase vault-relative path (with extension) -> vault-relative path */
	by_path: Map<string, string>;
	/** lowercase note basename (or media file name) -> vault-relative paths */
	by_name: Map<string, string[]>;
};

export type HeadlessExportOptions = {
	/** absolute path of the vault root */
	vault: string;
	/** note to export: basename, vault-relative path, or absolute path */
	note: string;
	/** output folder; absolute, or vault-relative. Defaults as in the plugin. */
	out_dir?: string;
	/** overrides on top of DEFAULT_SETTINGS + the plugin's data.json */
	settings?: Partial<ExportPluginSettings>;
	/** read the plugin's own data.json for settings (default true) */
	use_plugin_settings?: boolean;
	/** reuse an index across exports of the same vault */
	index?: VaultIndex;
};

export type HeadlessExportResult = {
	out_dir: string;
	output_file: string;
	note_path: string;
	warnings: ExportWarning[];
	tex: string;
	media_files: string[];
};

const SKIPPED_DIRS = new Set(["node_modules", "__pycache__"]);

/** Index every file in the vault once; hidden folders (.obsidian, .git,
 * .trash) are skipped, as Obsidian's link resolution ignores them too. */
export function index_vault(root: string): VaultIndex {
	const index: VaultIndex = {
		root,
		by_path: new Map(),
		by_name: new Map(),
	};
	const walk = (dir: string) => {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			if (entry.name.startsWith(".") || SKIPPED_DIRS.has(entry.name)) {
				continue;
			}
			const abs = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				walk(abs);
				continue;
			}
			if (!entry.isFile()) {
				continue;
			}
			const rel = path.relative(root, abs);
			index.by_path.set(rel.toLowerCase(), rel);
			const key =
				path.extname(entry.name) === ".md"
					? path.basename(entry.name, ".md").toLowerCase()
					: entry.name.toLowerCase();
			const bucket = index.by_name.get(key);
			if (bucket === undefined) {
				index.by_name.set(key, [rel]);
			} else {
				bucket.push(rel);
			}
		}
	};
	walk(root);
	return index;
}

function make_tfile(rel_path: string): TFile {
	const file = new TFile();
	file.path = rel_path;
	file.name = path.basename(rel_path);
	file.basename = file.name.replace(/\.md$/, "");
	return file;
}

/** Filesystem stand-in for `metadataCache.getFirstLinkpathDest(address, "/")`:
 * exact vault-relative path first, then unique basename, shortest path on ties
 * (Obsidian resolves ties by proximity to the linking note; a headless run has
 * no "current note" notion, so the shallowest match wins). */
export function get_find_file(
	index: VaultIndex,
	on_ambiguous?: (address: string, matches: string[]) => void,
): (address: string) => TFile | undefined {
	return (address: string) => {
		const cleaned = address.replace(/^\.?\//, "").trim();
		const candidates = address_is_image_file(cleaned)
			? [cleaned]
			: [cleaned, cleaned + ".md"];
		for (const candidate of candidates) {
			const hit = index.by_path.get(candidate.toLowerCase());
			if (hit !== undefined) {
				return make_tfile(hit);
			}
		}
		const name_key = path.basename(cleaned).toLowerCase();
		const matches = index.by_name.get(name_key);
		if (matches === undefined || matches.length === 0) {
			return undefined;
		}
		if (matches.length > 1) {
			const sorted = [...matches].sort(
				(a, b) =>
					a.split(path.sep).length - b.split(path.sep).length ||
					a.length - b.length,
			);
			on_ambiguous?.(address, sorted);
			return make_tfile(sorted[0]);
		}
		return make_tfile(matches[0]);
	};
}

/** TFile paths are vault-relative, as in Obsidian; absolute paths are used for
 * the files this module writes itself (output .tex), so handle both. */
function to_abs(root: string, file_path: string): string {
	return path.isAbsolute(file_path) ? file_path : path.join(root, file_path);
}

export function get_read_tfile(root: string): (file: TFile) => Promise<string> {
	return async (file: TFile) =>
		fs.promises.readFile(to_abs(root, file.path), "utf-8");
}

function get_modify(root: string): (file: TFile, content: string) => Promise<void> {
	return async (file: TFile, content: string) => {
		const abs = to_abs(root, file.path);
		await fs.promises.mkdir(path.dirname(abs), { recursive: true });
		await fs.promises.writeFile(abs, content, "utf-8");
	};
}

function load_plugin_settings(): Partial<ExportPluginSettings> {
	const data_path = path.join(__dirname, "..", "data.json");
	if (!fs.existsSync(data_path)) {
		return {};
	}
	try {
		return JSON.parse(fs.readFileSync(data_path, "utf-8"));
	} catch (e) {
		return {};
	}
}

function resolve_note(index: VaultIndex, note: string): string {
	if (path.isAbsolute(note)) {
		const rel = path.relative(index.root, note);
		if (rel.startsWith("..")) {
			throw new Error(`Note is outside the vault: ${note}`);
		}
		if (!fs.existsSync(note)) {
			throw new Error(`Note not found: ${note}`);
		}
		return rel;
	}
	const found = get_find_file(index)(note);
	if (found === undefined) {
		throw new Error(`Note not found in vault ${index.root}: ${note}`);
	}
	return found.path;
}

async function copy_if_wanted(
	source_abs: string,
	destination_abs: string,
	overwrite: boolean,
): Promise<"copied" | "kept" | "missing"> {
	if (!fs.existsSync(source_abs)) {
		return "missing";
	}
	if (fs.existsSync(destination_abs) && !overwrite) {
		return "kept";
	}
	await fs.promises.copyFile(source_abs, destination_abs);
	return "copied";
}

/**
 * Export one longform note to LaTeX. Mirrors the in-vault export command of
 * `main.ts`: the .tex goes to `<out_dir>/<Note_Basename>/<basename>_output.tex`
 * with header.tex, preamble.sty, bibliography.bib and Files/ beside it, plus an
 * `export_report.json` carrying the same warning schema as the plugin's.
 */
export async function export_longform_headless(
	options: HeadlessExportOptions,
): Promise<HeadlessExportResult> {
	const root = path.resolve(options.vault);
	if (!fs.existsSync(root)) {
		throw new Error(`Vault not found: ${root}`);
	}
	const index = options.index ?? index_vault(root);
	const note_path = resolve_note(index, options.note);
	const note_file = make_tfile(note_path);

	const settings: ExportPluginSettings = {
		...DEFAULT_SETTINGS,
		...(options.use_plugin_settings === false
			? {}
			: load_plugin_settings()),
		...(options.settings ?? {}),
	};

	const ambiguous: string[] = [];
	const find_file = get_find_file(index, (address, matches) =>
		ambiguous.push(
			`Ambiguous address '${address}': using ${matches[0]} of ${matches.length} matches`,
		),
	);
	const read_tfile = get_read_tfile(root);

	collected_warnings.length = 0;
	const parsed = await parse_longform(
		read_tfile,
		find_file,
		note_file,
		settings,
	);

	// `out_dir` is a filesystem path (absolute paths allowed, so exports can
	// leave the vault); `export_dir` and `base_output_folder` are always
	// vault-relative, as in Obsidian, where "/" means the vault root.
	const in_vault_base =
		parsed.yaml["export_dir"] ??
		(settings.base_output_folder === ""
			? "/"
			: settings.base_output_folder);
	const base_folder =
		options.out_dir !== undefined
			? path.resolve(options.out_dir)
			: path.join(root, in_vault_base.replace(/^\//, ""));
	const out_dir = path.join(
		base_folder,
		note_file.basename.replace(/ /g, "_"),
	);
	await fs.promises.mkdir(out_dir, { recursive: true });

	const output_file = path.join(out_dir, note_file.basename + "_output.tex");
	const out_tfile = make_tfile(output_file);
	const modify = get_modify(root);

	const template = settings.template_path
		? find_file(settings.template_path)
		: undefined;
	// A bare "/" template path (the plugin's default-ish value) is not a file.
	const template_file =
		template !== undefined && /\.(tex|md|txt)$/i.test(template.name)
			? template
			: undefined;

	const preamble_source = path.join(root, settings.preamble_file);
	const preamble_destination = path.join(out_dir, "preamble.sty");
	const preamble_state = await copy_if_wanted(
		preamble_source,
		preamble_destination,
		settings.overwrite_preamble,
	);
	const preamble_file =
		preamble_state === "missing" ? undefined : make_tfile("preamble.sty");

	if (template_file !== undefined) {
		await write_with_template(
			template_file,
			parsed,
			out_tfile,
			modify,
			read_tfile,
		);
	} else {
		await write_without_template(parsed, out_tfile, modify, preamble_file);
	}

	const header_path = path.join(out_dir, "header.tex");
	if (settings.overwrite_header || !fs.existsSync(header_path)) {
		await fs.promises.writeFile(header_path, get_header_tex(), "utf-8");
	}
	await copy_if_wanted(
		path.join(root, settings.bib_file),
		path.join(out_dir, "bibliography.bib"),
		false,
	);

	const media_files: string[] = [];
	if (parsed.media_files.length > 0) {
		const files_folder = path.join(out_dir, "Files");
		await fs.promises.mkdir(files_folder, { recursive: true });
		for (const media of parsed.media_files) {
			const destination = path.join(files_folder, media.name);
			const state = await copy_if_wanted(
				to_abs(root, media.path),
				destination,
				settings.overwrite_figures,
			);
			if (state !== "missing") {
				media_files.push(destination);
			}
		}
	}

	const warnings: ExportWarning[] = [
		...collected_warnings.map((w) => ({ ...w })),
		...ambiguous.map((message) => ({ message })),
	];
	const report = {
		plugin: "latex-exporter",
		plugin_version: JSON.parse(
			fs.readFileSync(path.join(__dirname, "..", "manifest.json"), "utf-8"),
		).version,
		exported_at: new Date().toISOString(),
		root_note: note_path,
		output_file: output_file,
		warnings: warnings,
	};
	await fs.promises.writeFile(
		path.join(out_dir, "export_report.json"),
		JSON.stringify(report, null, 2),
		"utf-8",
	);

	return {
		out_dir,
		output_file,
		note_path,
		warnings,
		tex: fs.readFileSync(output_file, "utf-8"),
		media_files,
	};
}
