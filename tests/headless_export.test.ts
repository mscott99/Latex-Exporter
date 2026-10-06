/**
 * Programmatic (headless) export of a longform note to LaTeX, run through jest.
 *
 * Two parts:
 *  1. A self-test on `tests/files/longform.md`, run by `npm test`, that keeps
 *     the programmatic path honest (it writes a real .tex to a temp folder).
 *  2. A driver, active only when EXPORT_NOTE is set, that exports a note from a
 *     real vault. This is the "export without Obsidian" entry point:
 *
 *       EXPORT_NOTE="Separation from order and oriented maps" \
 *       EXPORT_VAULT="$HOME/Obsidian/myVault" \
 *       EXPORT_OUT=/tmp/export npx jest tests/headless_export.test.ts
 *
 *     or through the wrapper: `scripts/export_longform.sh <note> [out_dir]`.
 *
 * Env vars: EXPORT_NOTE (basename or vault-relative path), EXPORT_VAULT
 * (default ~/Obsidian/myVault), EXPORT_OUT (output folder; default as in the
 * plugin settings), EXPORT_STRICT=1 (fail the run on export warnings).
 */
jest.mock("obsidian");

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { export_longform_headless } from "./headless_export";

describe("headless export", () => {
	test("exports the test longform to a .tex file", async () => {
		const out_dir = fs.mkdtempSync(
			path.join(os.tmpdir(), "latex-exporter-headless-"),
		);
		const result = await export_longform_headless({
			vault: "./tests/files",
			note: "longform",
			out_dir: out_dir,
			use_plugin_settings: false,
		});
		expect(fs.existsSync(result.output_file)).toBe(true);
		expect(result.tex).toContain("\\documentclass{article}");
		expect(result.tex).toContain("\\begin{document}");
		expect(result.tex).toContain("\\end{document}");
		// header.tex is written beside the output, as in the in-vault export.
		expect(fs.existsSync(path.join(result.out_dir, "header.tex"))).toBe(
			true,
		);
		// The report is written whether or not there are warnings.
		const report = JSON.parse(
			fs.readFileSync(
				path.join(result.out_dir, "export_report.json"),
				"utf-8",
			),
		);
		expect(report.root_note).toBe(result.note_path);
		expect(Array.isArray(report.warnings)).toBe(true);
		fs.rmSync(out_dir, { recursive: true, force: true });
	}, 60000);

	test("resolves embedded content from other notes", async () => {
		const out_dir = fs.mkdtempSync(
			path.join(os.tmpdir(), "latex-exporter-headless-"),
		);
		const result = await export_longform_headless({
			vault: "./tests/files",
			note: "simple_embed",
			out_dir: out_dir,
			use_plugin_settings: false,
		});
		// Content of subfolder/lemma2.md, pulled in through `lemma::![[lemma2]]`.
		expect(result.tex).toContain("\\begin{lemma}");
		expect(result.tex).toContain("Content of lemma2");
		fs.rmSync(out_dir, { recursive: true, force: true });
	}, 60000);
});

const requested_note = process.env.EXPORT_NOTE;
const requested_vault =
	process.env.EXPORT_VAULT ?? path.join(os.homedir(), "Obsidian", "myVault");

(requested_note === undefined ? describe.skip : describe)(
	"headless export of a requested note",
	() => {
		test("exports the requested longform", async () => {
			const result = await export_longform_headless({
				vault: requested_vault,
				note: requested_note as string,
				out_dir: process.env.EXPORT_OUT,
			});
			// eslint-disable-next-line no-console
			console.log(
				[
					"",
					"note:        " + result.note_path,
					"output:      " + result.output_file,
					"figures:     " + result.media_files.length,
					"warnings:    " + result.warnings.length,
					...result.warnings.map(
						(w, i) =>
							`  [${i + 1}] ${w.message.replace(/\n/g, " | ")}`,
					),
					"",
				].join("\n"),
			);
			expect(fs.existsSync(result.output_file)).toBe(true);
			expect(result.tex.length).toBeGreaterThan(0);
			if (process.env.EXPORT_STRICT === "1") {
				expect(result.warnings).toEqual([]);
			}
		}, 600000);
	},
);
