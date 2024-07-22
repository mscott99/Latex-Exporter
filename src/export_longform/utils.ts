import { Vault, TFile, Notice, FileSystemAdapter } from "obsidian";
import { address_is_image_file } from "./interfaces";

export function make_file_path(vault: Vault, file: TFile) {
	const adapter = vault.adapter;
	if (adapter instanceof FileSystemAdapter) {
		return adapter.getBasePath() + "/" + file.path;
	} else {
		throw new Error("Unsupported adapter");
	}
}

export function notice_and_warn(message: string) {
	new Notice(message);
	console.warn(message);
}

export function escape_latex(input: string) {
	return input
		.replace(/\\/g, "\\textbackslash{}")
		.replace(/%/g, "\\%")
		.replace(/&/g, "\\&")
		.replace(/#/g, "\\#")
		.replace(/\$/g, "\\$")
		.replace(/_/g, "\\_")
		.replace(/\{/g, "\\{")
		.replace(/\}/g, "\\}")
		.replace(/\^/g, "\\^{}")
		.replace(/~/g, "\\textasciitilde{}")
		.replace(/</g, "\\textless{}")
		.replace(/>/g, "\\textgreater{}")
		.replace(/\|/g, "\\textbar{}")
		.replace(/"/g, "''")
		.replace(/'/g, "`");
}

("Searches recursively in the folder_path for a file with name file_name.");
export function find_file(
	the_vault: Vault,
	address: string,
): TFile | undefined {
	let file_found: TFile | undefined = undefined;
	Vault.recurseChildren(the_vault.getRoot(), (file) => {
		if (
			file instanceof TFile &&
			((address_is_image_file(address) &&
				file.name.toLowerCase() === address.toLowerCase()) ||
				(!address_is_image_file(address) &&
					file.basename.toLowerCase() === address.toLowerCase()))
		) {
			if (file_found !== undefined) {
				notice_and_warn(
					"Multiple files found with the same name '" +
						address +
						"'. Returning the first one found. Additional file found has path: "+
						file.path,
				);
			} else {
				file_found = file;
			}
		}
	});
	if (file_found === undefined) {
		notice_and_warn("File not found: " + address);
	}
	return file_found;
}

export function find_image_file(
	the_vault: Vault,
	address: string,
): TFile | undefined {
	const matchExcalidraw = /^.*\.excalidraw$/.exec(address);
	if (matchExcalidraw !== null) {
		address = matchExcalidraw[0] + ".png";
	}
	return find_file(the_vault, address);
}

export function strip_newlines(thestring: string): string {
	const result = /^(?:(?:\s*?)\n)*(.*?)(?:\n(?:\s*?))?$/s.exec(thestring);
	if (result === null) {
		throw new Error("result is undefined");
	}
	return result[1];
}
