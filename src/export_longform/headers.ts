import { node, metadata_for_unroll } from "./interfaces";
import { label_from_location, format_label } from "./labels";
import { Paragraph } from "./display";
import { Text } from "./inline";
import { strip_newlines } from "./utils";

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
	) {
		this.level = level;
		this.title = title;
		this.children = children;
		this.label = label;
	}
	async unroll(data: metadata_for_unroll): Promise<node[]> {
		this.level += data.headers_level_offset;
		for (let i = 0; i < data.header_stack.length; i++) {
			if (data.header_stack[i].level >= this.level) {
				data.header_stack = data.header_stack.slice(0, i);
				break;
			}
		}
		data.header_stack.push(this);

		this.data = {
			depth: data.depth,
			env_hash_list: data.env_hash_list,
			parsed_file_bundle: data.parsed_file_bundle,
			headers_level_offset: data.headers_level_offset,
			explicit_env_index: data.explicit_env_index,
			longform_file: data.longform_file,
			current_file: data.current_file,
			notes_dir: data.notes_dir,
			header_stack: [...data.header_stack],
		};

		const new_title: node[] = [];
		for (const elt of this.title) {
			new_title.push(...(await elt.unroll(data)));
		}
		this.title = new_title;

		// this.label = label_from_location(
		// 	data,
		// 	data.current_file.basename,
		// 	data.header_stack.map((e) => e.latex_title()),
		// );

		const new_children: node[] = [];
		for (const elt of this.children) {
			new_children.push(...(await elt.unroll(data)));
		}
		this.children = new_children;
		return [this];
	}
	latex_title(): string {
		const buffer = Buffer.alloc(1000);
		let buffer_offset = 0;
		for (const e of this.title) {
			buffer_offset = e.latex(buffer, buffer_offset);
		}
		return buffer.toString("utf8", 0, buffer_offset);
	}
	latex(buffer: Buffer, buffer_offset: number): number {
		const header_title = this.latex_title();
		let header_string = "";
		if (this.level === 1) {
			header_string = "\\section{" + header_title + "}\n";
		} else if (this.level === 2) {
			header_string = "\\subsection{" + header_title + "}\n";
		} else if (this.level === 3) {
			header_string = "\\subsubsection{" + header_title + "}\n";
		} else if (this.level >= 4) {
			header_string = "\\textbf{" + header_title + "}\n";
		}

		buffer_offset += buffer.write(header_string, buffer_offset);

		buffer_offset += buffer.write(
			"\\label{" + label_from_location(this.data, this.data.current_file.basename, this.data.header_stack.map(e => e.latex_title())) + "}\n",
			buffer_offset,
		);

		for (const e of this.children) {
			buffer_offset = e.latex(buffer, buffer_offset);
		}
		return buffer_offset;
	}
}

export function find_header(
	header: string[],
	current_content: node[][],
): Header | undefined;
export function find_header(
	header: string,
	current_content: node[][],
): Header | undefined;

export function find_header(
	header: string | string[],
	current_content: node[][],
): Header | undefined {
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
					elt.latex_title().toLowerCase().trim() ==
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
	return find_header(header_stack, next_checks);
}

// This will not prioritize low depth but oh well
export function get_header_address(
	header: string[],
	current_content: node[],
	built_address?: string,
): string | undefined;
export function get_header_address(
	header: string,
	current_content: node[],
	built_address?: string,
): string | undefined;

export function get_header_address(
	header: string | string[],
	current_content: node[],
	built_address?: string,
): string | undefined {
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
					? elt.latex_title()
					: built_address + "." + elt.latex_title();
			if (
				header_stack.length > 0 &&
				elt.latex_title().toLowerCase().trim() ==
					current_check.toLowerCase().trim()
			) {
				if (header_stack.length == 1) {
					return new_address;
				}
				header_stack.pop();
			}
			// keep going even if the current was not matched
			const attempt = get_header_address(
				header_stack,
				elt.children,
				new_address,
			);
			if (attempt !== undefined) {
				return attempt;
			}
		}
	}
	return undefined;
}

class ZeroHeader {
	children: node[];
	level = 0;
	constructor(content: node[]) {
		this.children = content;
	}
}

export function make_heading_tree(markdown: node[]): node[] {
	let headingRegex = /^(#+) (.*)$/gm;
	const new_md = new ZeroHeader([]);
	let header_stack: (Header | ZeroHeader)[] = [];
	header_stack.push(new_md);
	let new_display: node[] = new_md.children;
	let current_match: RegExpMatchArray | null;
	for (const elt of markdown) {
		if (elt instanceof Paragraph) {
			console.assert(
				elt.elements.length == 1,
				"Paragraph should have only one element at this stage of parsing",
			);
			console.assert(
				elt.elements[0] instanceof Text,
				"Paragraph should have only one text element at this stage of parsing",
			);
			const inline_element = elt.elements[0] as Text;
			let start_index = 0;
			while (
				(current_match = headingRegex.exec(inline_element.content)) !==
				null
			) {
				if (current_match.index == undefined) {
					throw new Error("current_match.index is undefined");
				}
				const prev_chunk = inline_element.content.slice(
					start_index,
					current_match.index,
				);
				if (prev_chunk.trim() !== "") {
					new_display.push(
						new Paragraph([new Text(strip_newlines(prev_chunk))]),
					);
				}
				// new_display.push(make_obj(current_match));
				for (let i = header_stack.length - 1; i >= 0; i--) {
					const new_header = new Header(
						current_match[1].length,
						[new Text(current_match[2])],
						[],
					);
					const level = new_header.level;
					if (level > header_stack[i].level) {
						header_stack.splice(
							i + 1,
							header_stack.length - (i + 1),
						);
						header_stack[i].children.push(new_header);
						header_stack.push(new_header);
						new_display = new_header.children;
						break;
					}
				}
				start_index = current_match.index + current_match[0].length;
			}
			// possibility of a final piece of text after matches
			const return_string = inline_element.content.slice(start_index);
			if (return_string.trim() !== "") {
				new_display.push(
					new Paragraph([new Text(strip_newlines(return_string))]),
				);
			}
		} else {
			new_display.push(elt);
		}
	}
	return new_md.children;
}
