import { TFile, Notice } from "obsidian";

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

export function find_image_file(
	find_file: (address: string) => TFile | undefined,
	address: string,
): TFile | undefined {
	const matchExcalidraw = /^.*\.excalidraw$/.exec(address);
	if (matchExcalidraw !== null) {
		address = matchExcalidraw[0] + ".png";
	}
	return find_file(address);
}

export function strip_newlines(thestring: string): string {
	const result = /^(?:(?:\s*?)\n)*(.*?)(?:\n(?:\s*?))?$/s.exec(thestring);
	if (result === null) {
		throw new Error("result is undefined");
	}
	return result[1];
}
