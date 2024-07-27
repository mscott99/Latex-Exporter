jest.mock("obsidian");
import {TFile} from "obsidian";

import * as fs from "fs";
import * as path from "path";
import {address_is_image_file} from "../src/export_longform/interfaces";

export function make_tfile(address:string, path?:string){
	const tfile = new TFile()
	tfile.basename = address
	tfile.name = address + ".md"
	tfile.path = path ? path : address + ".md"
	return tfile
}


export function get_read_tfile_fn(notes_dir:string) {
	return (file: TFile) => read_tfile(notes_dir, file);
}

async function read_tfile(notes_dir: string, file: TFile): Promise<string> {
	return fs.readFileSync(path.join(notes_dir, file.path), "utf-8");
}

export function get_find_file_fn(notes_dir: string) {
	return (address: string) => find_file(notes_dir, address);
}

("Searches recursively in the folder_path for a file with name file_name.");
async function find_file(notes_dir: string, address: string): Promise<TFile | undefined> {
	let file_path: string | undefined = undefined;
	const files = fs.readdirSync(notes_dir);
	console.log(files)
	for (const file of files) {
		if (file_path) {
			console.warn(
				"Multiple files found with the same name. Returning the first one found.",
			);
		}
		const curr_file_path = path.join(notes_dir, file);
		const stat = fs.statSync(curr_file_path);
		if (stat.isDirectory()) {
			const possible_file = await find_file(curr_file_path, address);
			const possible_file_path = possible_file !== undefined ? possible_file.path : undefined;
			file_path = possible_file_path !== undefined ? possible_file_path : file_path;
		} else if ((address_is_image_file(address) &&
				file.toLowerCase() === address.toLowerCase()) ||
				(!address_is_image_file(address) &&
					file.toLowerCase() === address.toLowerCase() + ".md")) {
			file_path = curr_file_path;
		}
	}
	return file_path !== undefined ? make_tfile(file_path): undefined;
}

export function get_modify_fn(notes_dir: string) {
	return (file: TFile) => modify_file(notes_dir, file);
}

async function modify_file(notes_dir: string, file: TFile) {
	return fs.writeFileSync(path.join(notes_dir, file.path), "utf-8");
}
