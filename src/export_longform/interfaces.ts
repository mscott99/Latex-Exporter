import { TFile, Vault } from "obsidian";
import { Header } from "./headers";

export interface node {
	unroll(data?: metadata_for_unroll): Promise<node[]>;
	latex(buffer: Buffer, buffer_offset: number): number;
}

export interface file_content {
	yaml: { [key: string]: string };
	file: TFile;
	children: node[];
}

export type parsed_note = {
	yaml: { [key: string]: string };
	body: node[];
};

export type note_cache = { [key: string]: parsed_note };

export type metadata_for_unroll = {
	depth: number;
	env_hash_list: string[];
	parsed_file_bundle: note_cache; // use the path of the files as keys.
	headers_level_offset: number; // To know by how much to increment headers by nestedness. Set to 10 to convert Headers to emphasized words.
	explicit_env_index: number;
	longform_file: TFile;
	current_file: TFile;
	notes_dir: Vault;
	header_stack: Header[];
	media_files: TFile[];
	bib_keys: string[];
};

export function init_data(
	longform_file: TFile,
	notes_dir: Vault,
): metadata_for_unroll {
	return {
		depth: 0,
		env_hash_list: [] as string[],
		parsed_file_bundle: {} as note_cache,
		headers_level_offset: 0,
		explicit_env_index: 1,
		longform_file: longform_file,
		current_file: longform_file,
		notes_dir: notes_dir,
		header_stack: [] as Header[],
		media_files: [] as TFile[],
		bib_keys: [] as string[],
	} as metadata_for_unroll;
}

export function address_is_image_file(address: string) {
	if (/\.(?:jpeg|svg|pdf|png|jpg|gif|svg|pdf|tiff?)$/.exec(address)) {
		return true;
	}
	return false;
}

export async function unroll_array(
	data: metadata_for_unroll,
	content_array: node[],
) {
	const new_children: node[] = [];
	for (const elt of content_array) {
		new_children.push(...(await elt.unroll(data)));
	}
	return new_children;
}

// function latex_array(children:node[], buffer: Buffer, offset: number):number {
// 		for (const elt of children) {
// 			offset = elt.latex(buffer, offset);
// 		}
// 		return offset;
// }
