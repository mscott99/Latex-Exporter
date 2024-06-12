import {TFile} from "obsidian";
import { metadata_for_unroll } from "./interfaces";

export function format_label(address: string): string {
	//substitute
	return address.toLowerCase().trim().replace(/ /g, "_").replace(/,/g, "");
}

export function explicit_label(
	longform_file: TFile,
	current_file: TFile,
	label: string,
) {
	if (current_file !== longform_file) {
		return explicit_label_with_address(label, current_file.basename);
	} else {
		return format_label(label.replace("-", ":"));
	}
}

export function label_from_location(
	data: metadata_for_unroll,
	address: string,
	header_address?: string,
): string {
	if (header_address === "" || header_address === undefined) {
		header_address = "statement";
	}
	if (data.current_file === data.longform_file && address === "") {
		return format_label("sec:" + header_address);
	}
	return format_label("res:" + address + "." + header_address);
}

function explicit_label_with_address(label: string, address: string) {
	const match = /^([a-z]+)-(.*)$/.exec(label);
	if (match) {
		return format_label(match[1] + ":" + address + "." + match[2]);
	} else {
		return format_label(address + "." + label);
	}
}
