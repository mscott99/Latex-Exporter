import { TFile, Vault } from "obsidian";
import { get_header_address } from "./headers";
import { find_file } from "./utils";
import { node, note_cache, metadata_for_unroll } from "./interfaces";

export function format_label(label: string): string {
	//substitute
	return label
		.toLowerCase()
		.trim()
		.replace(/\\autoref{/g, "")
		.replace(/}/g, "")
		.replace(/ /g, "_")
		.replace(/,/g, "")
		.replace(/-/g, ":");
}

export function explicit_label(
	longform_file: TFile,
	current_file: TFile,
	label: string,
) {
	if (current_file !== longform_file) {
		return explicit_label_with_address(label, current_file.basename);
	} else {
		return label;
	}
}

function explicit_label_with_address(label: string, address: string) {
	const match = /^([a-z]+)-(.*)$/.exec(label);
	if (match) {
		return format_label(match[1] + ":" + address + "." + match[2]);
	} else {
		return format_label(address + "." + label);
	}
}

export function label_from_location(
	data: metadata_for_unroll,
	address: string,
	header?: string | string[],
): string {
	if (header === "" || header === undefined) {
		header = "statement";
	}
	let resolved_header = resolve_header_label(
		address,
		header,
		data.parsed_file_bundle,
		data.notes_dir,
	);
	if (resolved_header === undefined) {
		console.warn(
			"could not resolve header at ",
			address,
			": ",
			header,
			" keeping the header label as-is",
		);
		resolved_header =
			typeof header === "string" ? header : header.join(".");
	}
	if (address === "" || address === data.longform_file.basename) {
		return format_label("loc:" + resolved_header);
	}
	return format_label("loc:" + address + "." + resolved_header);
}

export function resolve_header_label(
	address: string,
	header: string | string[],
	file_cache: note_cache,
	vault: Vault,
): string | undefined {
	let file_content: node[];
	const cached_content = file_cache[address];
	if (cached_content === undefined) {
		const file = find_file(vault, address);
		if (file === undefined || file_cache[file.basename] === undefined) {
			if (file !== undefined && file_cache[file.basename] === undefined) {
				console.warn(
					"address of reference '",
					address,
					"' is referenced but was not embedded.",
				);
			}
			const header_string =
				typeof header === "string" ? header : header.join(".");
			console.warn(
				"keeping the header address of ",
				address,
				": ",
				header_string,
				" as-is",
			);
			return header_string;
		}
		file_content = file_cache[file.basename].body;
	} else {
		file_content = cached_content.body;
	}
	let new_label: string | undefined;
	if (typeof header === "string") {
		// to make typescript happy
		new_label = get_header_address(header, file_content);
	} else {
		new_label = get_header_address([...header].reverse(), file_content);
	}

	if (new_label === undefined) {
		const header_string =
			typeof header === "string" ? header : header.join(".");
		console.warn(
			"Could not resolve header name '",
			header_string,
			"' in file with address '",
			address,
			"', keeping the header label as-is",
		);
		return header_string;
	}
	return new_label;
}
