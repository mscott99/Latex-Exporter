import { TFile } from "obsidian";
import { ExportPluginSettings } from "./interfaces";
import { get_header_address } from "./headers";
import { notice_and_warn } from "./utils";
import {
	node,
	note_cache,
	metadata_for_unroll,
	address_is_image_file,
} from "./interfaces";

export function format_label(label: string): string {
	//substitute
	return label
		.toLowerCase()
		.trim()
		.replace(/\\Cref{/g, "")
		.replace(/}/g, "")
		.replace(/ /g, "_")
		.replace(/,/g, "")
		.replace(/-/g, ":")
		.replace(/\$/g, "")
		.replace(/\\/g, "");
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

export async function label_from_location(
	data: metadata_for_unroll,
	address: string,
	file_of_origin: TFile,
	settings: ExportPluginSettings,
	header?: string | string[],
): Promise<string> {
	if (address_is_image_file(address)) {
		return format_label("fig:" + address);
	}
	if (address === "") {
		return ""; // empty label
	}
	if (header === undefined) {
		header = "";
	}
	let resolved_head_label = await resolve_header_label(
		address,
		header,
		data.parsed_file_bundle,
		data.find_file,
		data.current_file,
		settings,
	);
	if (resolved_head_label === undefined) {
		notice_and_warn(
			"could not resolve header at " +
				address +
				": " +
				header +
				" keeping the header label as-is.\n" +
				"In note:\n" +
				file_of_origin.path,
		);
		resolved_head_label =
			typeof header === "string" ? header : header.join(".");
	}
	if (address === "" || address === data.longform_file.basename) {
		return format_label("loc:" + resolved_head_label);
	}
	return resolved_head_label === "" ?  format_label("loc:" + address):format_label("loc:" + address + "." + resolved_head_label);
}

async function resolve_header_label(
	address: string,
	header: string | string[],
	file_cache: note_cache,
	find_file: (address: string) => TFile | undefined,
	file_of_origin: TFile,
	settings: ExportPluginSettings,
): Promise<string | undefined> {
	let file_content: node[];
	const cached_content = file_cache[address];
	if (cached_content === undefined) {
		const file = find_file(address);
		if (file === undefined || file_cache[file.basename] === undefined) {
			const header_string =
				typeof header === "string" ? header : header.join(".");
			if (file !== undefined && file_cache[file.basename] === undefined) {
				notice_and_warn(
					"address of reference '" +
						address +
						"' is referenced but was not embedded.\n" +
						"In note:\n" +
						file_of_origin.path,
				);
			} else {
				notice_and_warn(
					"keeping the header address of " +
						address +
						": " +
						header_string +
						" as-is\n" +
						"In note:\n" +
						file_of_origin.path,
				);
			}
			return header_string;
		}
		file_content = file_cache[file.basename].body;
	} else {
		file_content = cached_content.body;
	}
	let new_label: string | undefined;
	if (typeof header === "string") {
		// to make typescript happy
		new_label = await get_header_address(header, file_content, settings);
	} else {
		new_label = await get_header_address(
			[...header].reverse(),
			file_content,
			settings,
		);
	}

	if (new_label === undefined) {
		const header_string =
			typeof header === "string" ? header : header.join(".");
		notice_and_warn(
			"Could not resolve header name '" +
				header_string +
				"' in file with address '" +
				address +
				"', keeping the header label as-is\n" +
				"In note:\n" +
				file_of_origin.path,
		);
		return header_string;
	}
	return new_label;
}
