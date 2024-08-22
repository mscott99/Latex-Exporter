import { node, metadata_for_unroll, ExportPluginSettings } from "./interfaces";
import { label_from_location } from "./labels";
import { Paragraph } from "./display";
import { Text } from "./inline";
import { strip_newlines } from "./utils";

export class ProofHeader implements node {
	title: string;
	constructor(title: string) {
		this.title = title;
	}
	async unroll(): Promise<node[]> {
		return [this];
	}
	async latex(buffer: Buffer, buffer_offset: number, settings:ExportPluginSettings): Promise<number> {
		const header_string = "\n\\textbf{" + this.title + "}\n\n";
		buffer_offset += buffer.write(header_string, buffer_offset);
		return buffer_offset;
	}
}

export class Header implements node {
	children: node[];
	level: number;
	data: metadata_for_unroll;
	label: string | undefined;
	title: node[];
	constructor(
		level: number,
		title: node[],
		children: node[],
		label?: string,
		data?: metadata_for_unroll
	) {
		this.level = level;
		this.title = title;
		this.children = children;
		this.label = label;
		if(data !== undefined) {
			this.data = data;
		}
	}
	async unroll(data: metadata_for_unroll, settings:ExportPluginSettings): Promise<node[]> {
		if (data.in_thm_env) {
			const new_children: node[] = [];
			for (const elt of this.children) {
				new_children.push(...(await elt.unroll(data, settings)));
			}
			return [new ProofHeader(await this.latex_title(settings)), ...new_children];
		}
		this.level += data.headers_level_offset;
		for (let i = 0; i < data.header_stack.length; i++) {
			if (data.header_stack[i].level >= this.level) {
				data.header_stack = data.header_stack.slice(0, i);
				break;
			}
		}
		data.header_stack.push(this);

		this.data = {
			in_thm_env: data.in_thm_env,
			depth: data.depth,
			env_hash_list: data.env_hash_list,
			parsed_file_bundle: data.parsed_file_bundle,
			headers_level_offset: data.headers_level_offset,
			explicit_env_index: data.explicit_env_index,
			read_tfile: data.read_tfile,
			find_file: data.find_file,
			longform_file: data.longform_file,
			current_file: data.current_file,
			header_stack: [...data.header_stack],
			media_files: data.media_files,
			bib_keys: data.bib_keys,
		};

		const new_title: node[] = [];
		for (const elt of this.title) {
			new_title.push(...(await elt.unroll(data, settings)));
		}
		this.title = new_title;

		// this.label = label_from_location(
		// 	data,
		// 	data.current_file.basename,
		// 	data.header_stack.map((e) => e.latex_title()),
		// );

		const new_children: node[] = [];
		for (const elt of this.children) {
			new_children.push(...(await elt.unroll(data, settings)));
		}
		this.children = new_children;
		return [this];
	}
	async latex_title(settings: ExportPluginSettings): Promise<string> {
		const buffer = Buffer.alloc(1000);
		let buffer_offset = 0;
		for (const e of this.title) {
			buffer_offset = await e.latex(buffer, buffer_offset, settings);
		}
		return buffer.toString("utf8", 0, buffer_offset);
	}
	async latex(buffer: Buffer, buffer_offset: number, settings:ExportPluginSettings): Promise<number> {
		const header_title = await this.latex_title(settings);
		let header_string = "";
		if (this.level === 1) {
			header_string = "\\section{" + header_title + "}\n";
		} else if (this.level === 2) {
			header_string = "\\subsection{" + header_title + "}\n";
		} else if (this.level === 3) {
			header_string = "\\subsubsection{" + header_title + "}\n";
		} else if (this.level >= 4) {
			header_string = "\n\\textbf{" + header_title + "}\n\n";
		}

		buffer_offset += buffer.write(header_string, buffer_offset);
		const promises = this.data.header_stack.map(async (e) => await e.latex_title(settings))
		buffer_offset += buffer.write(
			"\\label{" +
				await label_from_location(
					this.data,
					this.data.current_file.basename,
					settings,
					await Promise.all(promises),
				) +
				"}\n",
			buffer_offset,
		);

		for (const e of this.children) {
			buffer_offset = await e.latex(buffer, buffer_offset, settings);
		}
		return buffer_offset;
	}
}

export async function find_header(
	header: string[],
	current_content: node[][],
	settings: ExportPluginSettings,
): Promise<Header | undefined>;
export async function find_header(
	header: string,
	current_content: node[][],
	settings: ExportPluginSettings,
): Promise<Header | undefined>;

export async function find_header(
	header: string | string[],
	current_content: node[][],
	settings: ExportPluginSettings,
): Promise<Header | undefined> {
	let header_stack: string[];
	if (typeof header === "string") {
		header_stack = header.split("#").reverse();
	} else {
		header_stack = [...header];
	}
	const next_checks = [];
	for (const node of current_content) {
		for (const elt of node) {
			if (elt instanceof Header) {
				const current_check = header_stack[header_stack.length - 1];
				if (current_check === undefined) {
					throw new Error(
						"current_check is undefined, should not be possible.",
					);
				}
				if (
					header_stack.length > 0 &&
					(await elt.latex_title(settings)).toLowerCase().trim() ==
						current_check.toLowerCase().trim()
				) {
					if (header_stack.length == 1) {
						return elt;
					}
					header_stack.pop();
				}
				next_checks.push(elt.children);
			}
		}
	}
	if (next_checks.length == 0) {
		return undefined;
	}
	return await find_header(header_stack, next_checks, settings);
}

// This will not prioritize low depth but oh well
export async function get_header_address(
	header: string[],
	current_content: node[],
	settings: ExportPluginSettings,
	built_address?: string,
): Promise<string | undefined>;
export async function get_header_address(
	header: string,
	current_content: node[],
	settings: ExportPluginSettings,
	built_address?: string,
): Promise<string | undefined>;

export async function get_header_address(
	header: string | string[],
	current_content: node[],
	settings: ExportPluginSettings,
	built_address?: string,
): Promise<string | undefined> {
	let header_stack: string[];
	if (typeof header === "string") {
		header_stack = header.split("#").reverse();
	} else {
		header_stack = [...header];
	}
	for (const elt of current_content) {
		if (elt instanceof Header) {
			const current_check = header_stack[header_stack.length - 1];
			console.assert(
				current_check !== undefined,
				"current_check is undefined",
			);
			const new_address =
				built_address === undefined
					? (await elt.latex_title(settings))
					: built_address + "." + (await elt.latex_title(settings));
			if (
				header_stack.length > 0 &&
				(await elt.latex_title(settings)).toLowerCase().trim() ==
					current_check.toLowerCase().trim()
			) {
				if (header_stack.length == 1) {
					return new_address;
				}
				header_stack.pop();
			}
			// keep going even if the current was not matched
			const attempt = await get_header_address(
				header_stack,
				elt.children,
				settings,
				new_address,
			);
			if (attempt !== undefined) {
				return attempt;
			}
		}
	}
	return undefined;
}

