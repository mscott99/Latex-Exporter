jest.mock("obsidian");

import { parse_note, init_data, parse_longform } from "../src/export_longform";
import { TFile } from "obsidian";
import * as fs from "fs";
import * as path from "path";
import { address_is_image_file } from "../src/export_longform/interfaces";

export async function read_tfile(file: TFile): Promise<string> {
	return fs.readFileSync(file.path, "utf-8");
}

export async function get_parsed_file_contents(
	address: string,
	notes_dir = "./tests/files/",
) {
	const find_file = get_find_file_fn(notes_dir);
	const longform_file = find_file(address);
	if (longform_file === undefined) {
		throw new Error(`File not found: ${address}`);
	}
	const file_contents = await read_tfile(longform_file);
	return parse_note(file_contents).body;
}

export async function get_unrolled_file_contents(
	address: string,
	notes_dir = "./tests/files/",
) {
	const find_file = get_find_file_fn(notes_dir);
	const longform_file = find_file(address);
	if (longform_file === undefined) {
		throw new Error(`File not found: ${address}`);
	}
	const file_contents = await read_tfile(longform_file);
	const parsed_contents = parse_note(file_contents).body;
	const data = init_data(longform_file, read_tfile, find_file);
	return await parsed_contents[0].unroll(data);
}

export async function get_latex_file_contents(
	address: string,
	notes_dir = "./tests/files/",
) {
	const find_file = get_find_file_fn(notes_dir);
	const longform_file = find_file(address);
	if (longform_file === undefined) {
		throw new Error(`File not found: ${address}`);
	}
	const parsed_content = await parse_longform(
		read_tfile,
		find_file,
		longform_file,
	);
	return parsed_content.body;
}

export function get_find_file_fn(notes_dir: string) {
	return (address: string) => find_file(notes_dir, address);
}

("Searches recursively in the folder_path for a file with name file_name.");
function find_file(notes_dir: string, address: string): TFile | undefined {
	let file_path: string | undefined = undefined;
	const files = fs.readdirSync(notes_dir);
	for (const file of files) {
		const curr_file_path = path.join(notes_dir, file);
		const stat = fs.statSync(curr_file_path);
		if (stat.isDirectory()) {
			const possible_file = find_file(curr_file_path, address);
			const possible_file_path =
				possible_file !== undefined ? possible_file.path : undefined;
			file_path =
				possible_file_path !== undefined
					? possible_file_path
					: file_path;
		} else if (
			(address_is_image_file(address) &&
				file.toLowerCase() === address.toLowerCase()) ||
			(!address_is_image_file(address) &&
				file.toLowerCase() === address.toLowerCase() + ".md")
		) {
			if (file_path !== undefined) {
				console.warn(
					"Multiple files found with the same name. Returning the first one found.",
				);
			}
			file_path = curr_file_path;
		}
	}
	if (file_path === undefined) {
		return undefined;
	}
	const tfile = new TFile();
	tfile.basename = address;
	tfile.path = file_path;
	tfile.name = address_is_image_file(address) ? address : address + ".md";
	return tfile;
}

export function get_modify_fn(notes_dir: string) {
	return (file: TFile) => modify_file(notes_dir, file);
}

async function modify_file(notes_dir: string, file: TFile) {
	return fs.writeFileSync(path.join(notes_dir, file.path), "utf-8");
}
