import * as fs from "fs";
import { Vault, TFile, resolveSubpath, FileSystemAdapter } from "obsidian";

export function make_file_path(vault: Vault, file: TFile) {
	const adapter = vault.adapter;
	if (adapter instanceof FileSystemAdapter) {
		return adapter.getBasePath() + "/" + file.path;
	} else {
		throw new Error("Unsupported adapter");
	}
}

("Searches recursively in the folder_path for a file with name file_name.");
export function find_file(
	the_vault: Vault,
	address: string,
): TFile | undefined {
	let file_found: TFile | undefined = undefined;
	Vault.recurseChildren(the_vault.getRoot(), (file) => {
		if (file instanceof TFile && file.basename === address) {
			if (file_found !== undefined) {
				console.warn(
					"Multiple files found with the same name. Returning the first one found.",
				);
			} else {
				file_found = file;
			}
		}
	});
	if (file_found === undefined) {
		console.warn("File not found: " + address);
	}
	return file_found;
	// let file_path: string | undefined = undefined;
	// const files = fs.readdirSync(notes_dir);
	// console.log(files)
	// for (const file of files) {
	// 	if (file_path) {
	// 		console.warn(
	// 			"Multiple files found with the same name. Returning the first one found.",
	// 		);
	// 	}
	// 	const curr_file_path = path.join(notes_dir, file);
	// 	const stat = fs.statSync(curr_file_path);
	// 	if (stat.isDirectory()) {
	// 		const possible_file_path = find_file(curr_file_path, address);
	// 		file_path = possible_file_path ? possible_file_path : file_path;
	// 	} else if (file === address + ".md") {
	// 		file_path = curr_file_path;
	// 	}
	// }
	// return file_path;
}

export const DEFAULT_TEMPLATE = `\\documentclass{article}
\\input{header}
\\addbibresource{bibliography.bib}
\\title{$title$}
\\begin{document}
\\maketitle
$body$
\\end{document}
`;
