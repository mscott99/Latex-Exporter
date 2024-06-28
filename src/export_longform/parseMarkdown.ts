import { find_file } from "./utils";
import {
	node,
	metadata_for_unroll,
	unroll_array,
	init_data,
	parsed_note,
	note_cache,
} from "./interfaces";
import {
	parse_display,
	Paragraph,
	NumberedList,
	UnorderedList,
	parse_after_headers,
} from "./display";
import { parse_inline } from "./inline";
import { Header, make_heading_tree, find_header } from "./headers";
import { TFile, Notice, Vault } from "obsidian";

// Describe label system
// If embedwikilink env, the label is an address to the embedded header, defaults to "statement" if no header is provided.
// If explicit env, parse for a label, otherwise it has no label.

/**
 * Plays the role of the zero'th header. Use this data structure when representing the markdown content of a file, or of some markdown with header structures.
 */
type parsed_longform = {
	yaml: { [key: string]: string };
	abstract: string | undefined;
	body: string;
	appendix: string | undefined;
};

async function parse_longform(
	notes_dir: Vault,
	longform_file: TFile,
	selection?: string,
): Promise<parsed_longform> {
	if (longform_file === undefined) {
		throw new Error(`File not found: ${longform_file} in ${notes_dir}`);
	}
	let file_contents: string;
	if (selection === undefined) {
		file_contents = await notes_dir.read(longform_file);
	} else {
		file_contents = selection;
	}
	const parsed_longform = parse_note(file_contents);
	const cache = {} as note_cache;
	cache[longform_file.basename] = parsed_longform;
	let parsed_content = parsed_longform.body;
	let abstract_header: Header | undefined;
	for (const e of parsed_content) {
		if (
			e instanceof Header &&
			e.latex_title().toLowerCase().trim() === "abstract"
		) {
			abstract_header = e;
			parsed_content = parsed_content.filter((x) => x !== e);
		}
	}
	let appendix_header: Header | undefined;
	for (const e of parsed_content) {
		if (
			e instanceof Header &&
			e.latex_title().toLowerCase().trim() === "appendix"
		) {
			appendix_header = e;
			parsed_content = parsed_content.filter((x) => x !== e);
		}
	}
	let body_header_content = parsed_content;
	let body_header: Header | undefined = undefined;
	for (const e of parsed_content) {
		if (
			e instanceof Header &&
			e.latex_title().toLowerCase().trim() === "body"
		) {
			body_header = e;
			lower_headers([body_header]);
			body_header_content = e.children;
		}
	}

	// Must unroll all before rendering into latex so that at latex() time there is access to all
	// parsed files.
	const data = init_data(longform_file, notes_dir);
	data.parsed_file_bundle = cache;

	if (abstract_header !== undefined) {
		data.header_stack = [abstract_header];
	}
	const abstract_unrolled_content =
		abstract_header === undefined
			? undefined
			: await unroll_array(data, abstract_header.children);

	if (body_header !== undefined) {
		data.header_stack = [body_header];
	}
	const body_unrolled_content = await unroll_array(data, body_header_content);

	if (appendix_header !== undefined) {
		data.header_stack = [appendix_header];
	}
	const appendix_unrolled_content =
		appendix_header === undefined
			? undefined
			: await unroll_array(data, appendix_header.children);
	const abstract_string =
		abstract_unrolled_content === undefined
			? undefined
			: await render_content(data, abstract_unrolled_content);
	const body_string = await render_content(data, body_unrolled_content);
	const appendix_string =
		appendix_unrolled_content === undefined
			? undefined
			: await render_content(data, appendix_unrolled_content);
	return {
		yaml: parsed_longform.yaml,
		abstract: abstract_string,
		body: body_string,
		appendix: appendix_string,
	};
}

function lower_headers(content: node[]): void {
	for (const e of content) {
		if (e instanceof Header) {
			e.level -= 1;
			lower_headers(e.children);
		}
	}
}

async function render_content(
	data: metadata_for_unroll,
	content: node[],
): Promise<string> {
	const buffer = Buffer.alloc(10000000); // made this very big. Too big? For my paper I run out with two orders of magnitude smaller.
	let offset = 0;
	for (const elt of content) {
		offset = elt.latex(buffer, offset);
	}
	return buffer.toString("utf8", 0, offset);
}

export async function export_selection(
	notes_dir: Vault,
	longform_file: TFile,
	selection: string,
) {
	const parsed_contents = await parse_longform(
		notes_dir,
		longform_file,
		selection,
	);
	if (selection !== undefined) {
		const content = await join_sections(parsed_contents);
		// copy content to clipboard
		await navigator.clipboard.writeText(content);
		new Notice("Latex content copied to clipboard");
		return;
	}
}

export async function export_longform(
	notes_dir: Vault,
	longform_file: TFile,
	output_file: TFile,
	template_file: TFile | null,
) {
	const parsed_contents = await parse_longform(
		notes_dir,
		longform_file,
	);
	if (template_file) {
		write_with_template(
			template_file,
			parsed_contents,
			output_file,
			notes_dir,
		);
		new Notice(
			"Latex content written to " +
				output_file.path +
				" by using the template file " +
				template_file.path,
		);
	} else {
		write_without_template(parsed_contents, output_file, notes_dir);
		new Notice(
			"Latex content written to " +
				output_file.path +
				" by using the default template",
		);
	}
}

async function write_with_template(
	template_file: TFile,
	parsed_contents: parsed_longform,
	output_file: TFile,
	notes_dir: Vault,
) {
	let template_content = await notes_dir.read(template_file);
	for (const key of Object.keys(parsed_contents["yaml"])) {
		template_content = template_content.replace(
			RegExp(`\\\$${key}\\\$`, "i"),
			parsed_contents["yaml"][key],
		);
	}
	template_content = template_content.replace(
		/\$body\$/i,
		parsed_contents["body"],
	);
	if (parsed_contents["abstract"] !== undefined) {
		if (template_file) {
			template_content = template_content.replace(
				/\$abstract\$/i,
				parsed_contents["abstract"],
			);
		} else {
			template_content;
		}
	}
	if (parsed_contents["appendix"] !== undefined) {
		template_content = template_content.replace(
			/\$appendix\$/i,
			parsed_contents["appendix"],
		);
	}
	await notes_dir.modify(output_file, template_content);
}

async function join_sections(parsed_contents: parsed_longform) {
	let content = "";
	if (parsed_contents["abstract"] !== undefined) {
		content =
			content +
			`\\begin{abstract}\n` +
			parsed_contents["abstract"] +
			`\\end{abstract}\n`;
	}
	content += parsed_contents["body"];
	if (parsed_contents["appendix"] !== undefined) {
		content += `\\printbibliography\n`;
		content += `\\section{Appendix}\n` + parsed_contents["appendix"];
	}
	return content;
}

async function write_without_template(
	parsed_contents: parsed_longform,
	output_file: TFile,
	notes_dir: Vault,
) {
	let content = `\\documentclass{article}
\\input{header}
\\addbibresource{bibliography.bib}\n`;
	if (parsed_contents["yaml"]["title"] !== undefined) {
		content += `\\title{` + parsed_contents["yaml"]["title"] + `}\n`;
	}
	if (parsed_contents["yaml"]["author"] !== undefined) {
		content += `\\author{` + parsed_contents["yaml"]["author"] + `}\n`;
	}
	content += `\\begin{document}
\\maketitle
`;
	if (parsed_contents["abstract"] !== undefined) {
		content =
			content +
			`\\begin{abstract}\n` +
			parsed_contents["abstract"] +
			`\\end{abstract}\n`;
	}
	content += parsed_contents["body"] + `\\printbibliography\n`;
	if (parsed_contents["appendix"] !== undefined) {
		content += `\\section{Appendix}\n` + parsed_contents["appendix"];
	}
	content += "\\end{document}";
	await notes_dir.modify(output_file, content);
}

function traverse_tree_and_parse_display(md: node[]): node[] {
	const new_md: node[] = [];
	for (const elt of md) {
		if (elt instanceof Paragraph) {
			const parsed_objects = parse_after_headers([elt]);
			new_md.push(...parsed_objects);
		} else if (elt instanceof Header) {
			elt.children = traverse_tree_and_parse_display(elt.children);
			new_md.push(elt);
		} else {
			new_md.push(elt);
		}
	}
	return new_md;
}

function traverse_tree_and_parse_inline(md: node[]): void {
	for (const elt of md) {
		if (elt instanceof Header) {
			traverse_tree_and_parse_inline(elt.children);
			elt.title = parse_inline(elt.title);
		} else if (elt instanceof NumberedList) {
			for (const e of elt.content) {
				traverse_tree_and_parse_inline(e);
			}
		} else if (elt instanceof UnorderedList) {
			for (const e of elt.content) {
				traverse_tree_and_parse_inline(e);
			}
		} else if (elt instanceof Paragraph) {
			elt.elements = parse_inline(elt.elements);
		}
	}
}

function parse_note(file_contents: string): parsed_note {
	const [yaml, body] = parse_display(file_contents);
	let parsed_contents = make_heading_tree(body);
	parsed_contents = traverse_tree_and_parse_display(parsed_contents);
	traverse_tree_and_parse_inline(parsed_contents);
	return { yaml: yaml, body: parsed_contents };
}

async function parse_note_with_cache(
	address: string,
	notes_dir: Vault,
	parsed_cache: { [key: string]: parsed_note },
	// header: string | undefined,
): Promise<parsed_note | undefined> {
	const file_found = find_file(notes_dir, address);
	if (file_found === undefined) {
		// no warning necessary, already warned in find_file
		return undefined;
	}
	if (!(file_found.basename in Object.keys(parsed_cache))) {
		const file_contents = await notes_dir.read(file_found);
		// const file_contents = fs.readFileSync(make_file_path(notes_dir, file_found), "utf-8");

		parsed_cache[file_found.basename] = parse_note(file_contents);
	}
	return parsed_cache[file_found.basename];
}

export async function parse_embed_content(
	address: string,
	notes_dir: Vault,
	parsed_cache: note_cache,
	header?: string,
): Promise<[node[], number] | undefined> {
	const content = await parse_note_with_cache(
		address,
		notes_dir,
		parsed_cache,
	);
	if (content === undefined) {
		return undefined;
	}
	if (header === undefined) {
		return [content.body, 0];
	}
	const header_elt = find_header(header, [content.body]);
	if (header_elt === undefined) {
		console.warn(
			"Header not found: ",
			header,
			" in file with address ",
			address,
		);
		return undefined;
	}
	return [header_elt.children, header_elt.level];
}

// There seems to be too many elements here, some should be inline.
