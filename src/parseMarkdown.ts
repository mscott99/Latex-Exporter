import * as fs from "fs";
import { find_file } from "./utils";

type unroll_data = {
	depth: number;
	env_hash_list: Environment[];
	parsed_file_bundle: { [key: string]: MDRoot };
	headers_level_offset: number; // To know by how much to increment headers by nestedness. Set to 10 to convert Headers to emphasized words.
	explicit_env_index: number;
	longform_address: string;
	current_address: string;
	notes_dir: string;
	header_stack: Header[];
};

export function init_data(
	longform_address: string,
	notes_dir: string,
): unroll_data {
	return {
		depth: 0,
		env_hash_list: [] as Environment[],
		parsed_file_bundle: {} as { [key: string]: MDRoot },
		headers_level_offset: 0,
		explicit_env_index: 1,
		longform_address: longform_address,
		current_address: longform_address,
		notes_dir: notes_dir,
		header_stack: [] as Header[],
	} as unroll_data;
}

// Describe label system
// If embedwikilink env, the label is an address to the embedded header, defaults to "statement" if no header is provided.
// If explicit env, parse for a label, otherwise it has no label.

/**
 * Plays the role of the zero'th header. Use this data structure when representing the markdown content of a file, or of some markdown with header structures.
 */
export class MDRoot implements node {
	level = 0;
	file_address: string | undefined;
	children: node[];
	constructor(children: node[], address?: string) {
		this.children = children;
		this.file_address = address;
	}
	unroll(data: unroll_data): node[] {
		const new_children: node[] = [];
		if (this.file_address === undefined) {
			this.file_address = "";
		}
		data.current_address = this.file_address;
		for (const elt of this.children) {
			new_children.push(...elt.unroll(data));
		}
		return new_children;
	}
	latex(buffer: Buffer, offset: number) {
		for (const elt of this.children) {
			offset = elt.latex(buffer, offset);
		}
		return offset;
	}
}

export class Header implements node {
	children: node[];
	level: number;
	label: string | undefined;
	title: inline_node[];
	constructor(
		level: number,
		title: inline_node[],
		children: node[],
		label?: string,
	) {
		this.level = level;
		this.title = title;
		this.children = children;
		this.label = label;
	}
	unroll(data: unroll_data): node[] {
		this.level += data.headers_level_offset;
		for (let i = 0; i < data.header_stack.length; i++) {
			if (data.header_stack[i].level >= this.level) {
				data.header_stack = data.header_stack.slice(0, i);
				break;
			}
		}
		data.header_stack.push(this);
		// this.label = data.header_stack.map(e => e.latex_title()).join(".");
		this.label = this.latex_title();
		const new_children: node[] = [];
		for (const elt of this.children) {
			new_children.push(...elt.unroll(data));
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
		const header_title = this.title.forEach((x) =>
			x.latex(buffer, buffer_offset),
		);
		let header_string = "";
		if (this.level > 6) {
			header_string = "\\textbf{" + header_title + "}\n";
		} else {
			header_string = "#".repeat(this.level) + " " + header_title + "\n";
		}
		buffer_offset += buffer.write(header_string, buffer_offset);
		if (this.label !== undefined) {
			buffer_offset += buffer.write(
				"\\label{sec:" + this.label + "}",
				buffer_offset,
			);
		}
		for (const e of this.children) {
			buffer_offset = e.latex(buffer, buffer_offset);
		}
		return buffer_offset;
	}
}

export interface node {
	unroll(data?: unroll_data): node[];
	latex(buffer: Buffer, buffer_offset: number): number;
}
export function address_to_label(address: string): string {
	//substitute
	return address.toLowerCase().replace(" ", "_");
}

function label_from_location(address: string, header_address?: string): string {
	if (header_address === "" || header_address === undefined) {
		header_address = "statement";
	}
	return "res:" + address_to_label(address) + "." + header_address;
}

function explicit_label_with_address(label: string, address: string) {
	const match = /^([a-z]+)-(.*)$/.exec(label);
	if (match !== null) {
		return match[1] + ":" + address_to_label(address) + "." + match[2];
	} else {
		return address_to_label(address) + "." + label;
	}
}

export function explicit_label(
	longform_address: string,
	current_address: string,
	label: string,
) {
	if (current_address !== longform_address) {
		return explicit_label_with_address(label, current_address);
	} else {
		return label.replace("-", ":");
	}
}

export class Environment implements node {
	children: node[];
	// Can parse a label as well
	static regexp = /^(\w+?)::(?:\s*?{#([\S ]*?)})?(.*?)::\1/gms;
	label: string | undefined;
	type: string;
	// address_of_origin: string | undefined;
	constructor(children: node[], type: string, label?: string) {
		this.children = children;
		this.type = type;
		this.label = label;
		// this.address_of_origin = address_of_origin;
	}
	static build_from_match(match: RegExpMatchArray): Environment {
		return new Environment(
			// Here we must run a full parsing on the contents instead of inserting a string.
			parse_inside_env(strip_newlines(match[3])),
			match[1],
			match[2],
		);
	}
	unroll(data: unroll_data): node[] {
		// If it is unrolled, it is likely an explicit env.
		if (this.label !== undefined) {
			this.label = explicit_label(
				data.longform_address,
				data.current_address,
				this.label,
			);
		}
		return [this];
	}
	latex(buffer: Buffer, buffer_offset: number): number {
		buffer_offset += buffer.write(
			"\\begin{" + this.type + "}\n" + "\\label{" + this.label + "}\n",
			buffer_offset,
		);
		for (const e of this.children) {
			buffer_offset = e.latex(buffer, buffer_offset);
		}
		buffer_offset += buffer.write(
			"\\end{" + this.type + "}\n",
			buffer_offset,
		);
		return buffer_offset;
	}
}

export class Paragraph implements node {
	elements: inline_node[];
	constructor(elements: inline_node[]) {
		this.elements = elements;
	}
	unroll(): node[] {
		return [this];
	}
	latex(buffer: Buffer, buffer_offset: number) {
		let new_offset = buffer_offset;
		for (const elt of this.elements) {
			new_offset = elt.latex(buffer, new_offset);
		}
		new_offset += buffer.write("\n", new_offset);
		return new_offset;
	}
}

export interface inline_node {
	content: string;
	latex(buffer: Buffer, buffer_offset: number): number;
}

export class ExplicitRef implements node {
	label: string;
	constructor(content: string) {
		this.label = content;
	}
	static regexp = /@(\w+?)/; // parse only after parsing for citations.
	static build_from_match(regexmatch: RegExpMatchArray): ExplicitRef {
		return new ExplicitRef(regexmatch[1]);
	}
	unroll(data: unroll_data): node[] {
		this.label = explicit_label(
			data.longform_address,
			data.current_address,
			this.label,
		);
		return [this];
	}
	latex(buffer: Buffer, buffer_offset: number) {
		let output = "";
		const eq_pattern = /eq-(\w+)/;
		const match = eq_pattern.exec(this.label);
		if (match) {
			output = "eq:" + match[1];
		} else {
			output = this.label;
		}
		return (
			buffer_offset +
			buffer.write("\\autoref{" + output + "}", buffer_offset)
		);
	}
}

export class Text implements inline_node {
	content: string;
	constructor(content: string) {
		this.content = content;
	}
	latex(buffer: Buffer, buffer_offset: number) {
		return buffer_offset + buffer.write(this.content, buffer_offset);
	}
}

export class BlankLine implements node {
	static regexp = /\n\s*\n/g;
	static build_from_match(): BlankLine {
		return new BlankLine();
	}
	unroll(): node[] {
		return [this];
	}
	latex(buffer: Buffer, buffer_offset: number) {
		return buffer_offset + buffer.write("\n", buffer_offset);
		// the other \n should be done at the end of the previous display object.
	}
}

export class Emphasis implements inline_node {
	static regexp = /(?:\*(\S.*?)\*)|(?:_(\S.*?)_)/gs;
	content: string;
	label: string | undefined;
	static build_from_match(regexmatch: RegExpMatchArray): Emphasis {
		if (regexmatch[1] !== undefined) {
			return new Emphasis(regexmatch[1]);
		} else if (regexmatch[2] !== undefined) {
			return new Emphasis(regexmatch[2]);
		} else {
			throw new Error("Unexpected regex match");
		}
	}
	constructor(content: string) {
		this.content = content;
	}
	unroll(): node[] {
		return [this];
	}
	latex(buffer: Buffer, buffer_offset: number) {
		return (
			buffer_offset +
			buffer.write("\\emph{" + this.content + "}", buffer_offset)
		);
	}
}

export class Strong implements inline_node {
	// similar to emphasis but with double asterisks
	static regexp = /(?:\*\*(\S.*?)\*\*)|(?:__(\S.*?)__)/gs;
	content: string;
	label: string | undefined;
	static build_from_match(regexmatch: RegExpMatchArray): Strong {
		if (regexmatch[1] !== undefined) {
			return new Strong(regexmatch[1]);
		} else if (regexmatch[2] !== undefined) {
			return new Strong(regexmatch[2]);
		} else {
			throw new Error("Unexpected regex match");
		}
	}
	constructor(content: string) {
		this.content = content;
	}
	unroll(): node[] {
		return [this];
	}
	latex(buffer: Buffer, buffer_offset: number) {
		return (
			buffer_offset +
			buffer.write("\\textbf{" + this.content + "}", buffer_offset)
		);
	}
}

export class InlineMath implements inline_node {
	static regexp = /\$([^\$]+)\$(?:{(.*?)})?/g;
	content: string;
	label: string | undefined;
	static build_from_match(regexmatch: RegExpMatchArray): InlineMath {
		return new InlineMath(regexmatch[1], regexmatch[2]);
	}
	constructor(content: string, label?: string) {
		this.content = content;
		this.label = label;
	}
	unroll(): node[] {
		return [this];
	}
	latex(buffer: Buffer, buffer_offset: number) {
		return (
			buffer_offset +
			buffer.write("$" + this.content + "$", buffer_offset)
		);
	}
}

export class DisplayCode implements node {
	language: string | undefined;
	executable: boolean;
	code: string;
	static regexp =
		/```(?:\s*({?)([a-zA-Z]+)(}?)\s*\n([\s\S]*?)|([\s\S]*?))```/g;
	static build_from_match(match: RegExpMatchArray): DisplayCode {
		if (match[4] !== undefined) {
			const code = match[4];
			const executable = match[1] == "{" && match[3] == "}";
			const language = match[2] !== "" ? match[2] : undefined;
			return new DisplayCode(code, language, executable);
		} else {
			const code = match[5];
			return new DisplayCode(code);
		}
	}
	constructor(code: string, language?: string, executable: boolean = false) {
		this.code = code;
		this.language = language;
		this.executable = executable;
	}
	unroll(): node[] {
		return [this];
	}
	latex(buffer: Buffer, buffer_offset: number) {
		console.warn("Code to latex not implemented");
		return buffer_offset;
	}
}

function parse_file_with_cache(
	address: string,
	notes_dir: string,
	parsed_cache: { [key: string]: MDRoot },
	header: string | undefined,
): [node[], number] | undefined {
	if (!(address in Object.keys(parsed_cache))) {
		const file_path = find_file(notes_dir, address);
		if (file_path === null) {
			console.warn("File not found: ", address);
			return undefined;
		}
		const file_contents = fs.readFileSync(file_path, "utf-8");
		parsed_cache[address] = parse_markdown(file_contents, address);
	}
	const parsed_contents = parsed_cache[address];
	if (header === undefined) {
		return [parsed_contents.children, 0];
	}
	const header_elt = check_level(header.split("#").reverse(), [
		parsed_contents.children,
	]);
	if (header_elt === undefined) {
		console.warn("Header not found: ", header, " in file ", address);
		return undefined;
	}
	return [header_elt.children, header_elt.level];
}

function check_level(
	header_address_stack: string[],
	current_content: node[][],
): Header | undefined {
	const next_checks = [];
	for (const node of current_content) {
		for (const elt of node) {
			if (elt instanceof Header) {
				console.log(header_address_stack);
				const current_check =
					header_address_stack[header_address_stack.length - 1];
				if (current_check === undefined) {
					throw new Error(
						"current_check is undefined, should not be possible.",
					);
				}
				if (
					header_address_stack.length > 0 &&
					elt.title[0].content.toLowerCase() ==
						current_check.toLowerCase()
				) {
					if (header_address_stack.length == 1) {
						return elt;
					}
					header_address_stack.pop();
				}
				next_checks.push(elt.children);
			}
		}
	}
	if (next_checks.length == 0) {
		return undefined;
	}
	return check_level(header_address_stack, next_checks);
}

export class EmbedWikilink implements node {
	attribute: string | undefined;
	content: string;
	header: string | undefined;
	display: string | undefined;
	static regexp =
		/(?:(\S*?)::)?!\[\[([\s\S]*?)(?:#([\s\S]+?))?(?:\|([\s\S]*?))?\]\]/g;
	static build_from_match(args: RegExpMatchArray): EmbedWikilink {
		return new EmbedWikilink(args[1], args[2], args[3], args[4]);
	}
	constructor(
		attribute: string | undefined,
		address: string,
		header: string | undefined,
		displayed: string | undefined,
	) {
		this.attribute = attribute;
		this.content = address;
		this.header = header;
		this.display = displayed;
	}
	unroll(data: unroll_data): node[] {
		const return_data = parse_file_with_cache(
			this.content,
			data.notes_dir,
			data.parsed_file_bundle,
			this.header,
		);
		if (return_data === undefined) {
			console.warn("File or header not found: " + this.content);
			return [this];
		}
		const [parsed_contents, header_level] = return_data;
		const ambient_header_offset = data.headers_level_offset;
		data.headers_level_offset -= header_level - 1; //disregard nesting level of the embedded header.
		const unrolled_contents = [] as node[];
		for (const elt of parsed_contents) {
			unrolled_contents.push(...elt.unroll(data));
		}
		data.headers_level_offset = ambient_header_offset;
		// Make a label.

		if (this.attribute !== undefined) {
			return [
				new Environment(
					unrolled_contents,
					this.attribute,
					label_from_location(this.content, this.header),
				),
			];
		}
		return unrolled_contents;
	}
	latex(buffer: Buffer, buffer_offset: number): number {
		console.warn(
			"Writing embed wikilink into latex, it should likely have been unrolled",
		);
		const headerstring = this.header === undefined ? "" : this.header;
		return (
			buffer_offset +
			buffer.write(
				"\\autoref{" +
					label_from_location(this.content, headerstring) +
					"}\n",
				buffer_offset,
			)
		);
	}
}

/**
 * Get a label (a hash) for the location.
 *
 * @param {string} address - The first number to add.
 * @param {string} header_address - A hash string of the header. Should have information about sub-headers
 * @returns {string} The sum of the two numbers.
 */

export class Wikilink implements inline_node {
	attribute: string | undefined;
	content: string;
	header: string | undefined;
	displayed: string | undefined;
	static regexp =
		/(?:::(\S*?))?\[\[([\s\S]*?)(?:\#([\s\S]*?))?(?:\|([\s\S]*?))?\]\]/g;
	static build_from_match(args: RegExpMatchArray): Wikilink {
		return new Wikilink(args[1], args[2], args[3], args[4]);
	}
	constructor(
		attribute: string | undefined,
		address: string,
		header: string | undefined,
		displayed: string | undefined,
	) {
		this.attribute = attribute;
		this.content = address;
		this.header = header;
		this.displayed = displayed;
	}
	unroll(): node[] {
		const match = /^@(.*)$/.exec(this.content);
		if (match !== null) {
			return [new Citation(match[1])];
		} else {
			return [new Reference(label_from_location(this.content))];
		}
	}
	latex(buffer: Buffer, buffer_offset: number) {
		if (this.header === undefined) {
			this.header = "";
		}
		return (
			buffer_offset +
			buffer.write(
				"\\autoref{" +
					label_from_location(this.content, this.header) +
					"}",
				buffer_offset,
			)
		);
	}
}

export class Reference implements node {
	label: string;
	latex(buffer: Buffer, buffer_offset: number): number {
		return (
			buffer_offset +
			buffer.write("\\autoref{" + this.label + "}", buffer_offset)
		);
	}
	unroll(): node[] {
		return [this];
	}
	constructor(label: string) {
		this.label = label;
	}
}

export class Citation implements node {
	// TODO: Implement multi-citations
	id: string;
	result: string | undefined;
	constructor(id: string, result?: string) {
		this.id = id;
		this.result = result;
	}
	unroll(): node[] {
		return [this];
	}
	latex(buffer: Buffer, buffer_offset: number): number {
		if (this.result !== undefined) {
			return (
				buffer_offset +
				buffer.write(
					"\\cite[" + this.result + "]{" + this.id + "}",
					buffer_offset,
				)
			);
		} else {
			return (
				buffer_offset +
				buffer.write("\\cite{" + this.id + "}", buffer_offset)
			);
		}
	}
}

export class DisplayMath implements node {
	// parent: node;
	content: string;
	label: string | undefined;
	static regexp = /\$\$([\s\S]*?)\$\$(?:\s*?{#eq-(.*?)})?/g;
	static build_from_match(args: RegExpMatchArray): DisplayMath {
		return new DisplayMath(args[1], args[2]);
	}
	constructor(latex: string, label?: string) {
		this.content = latex;
		this.label = label;
	}
	unroll(): node[] {
		return [this];
	}
	latex(buffer: Buffer, buffer_offset: number) {
		buffer_offset += buffer.write("\\begin{equation}\n", buffer_offset);
		if (this.label !== undefined) {
			buffer_offset += buffer.write(
				"\\label{eq:" + this.label + "}\n",
				buffer_offset,
			);
		}
		buffer_offset += buffer.write(this.content + "\n", buffer_offset);
		buffer_offset += buffer.write("\\end{equation}\n", buffer_offset);
		return buffer_offset;
	}
}

export function export_longform(notes_dir: string, address: string): string {
	const longform_path = find_file(notes_dir, address);
	if (longform_path === null) {
		throw new Error(`File not found: ${address} in ${notes_dir}`);
	}
	const file_contents = fs.readFileSync(longform_path, "utf-8");
	const parsed_contents = parse_markdown(file_contents, address);
	const data = init_data(address, notes_dir);
	const unrolled_content = new MDRoot(parsed_contents.unroll(data));
	const buffer = Buffer.alloc(100000);
	const offset = unrolled_content.latex(buffer, 0);
	return buffer.toString("utf8", 0, offset);
}

export function export_longform_with_template(notes_dir:string, address:string, template_path:string, output_path:string){
	const parsed_contents = export_longform(notes_dir, address)
	const template_content = fs.readFileSync(template_path,"utf-8")
	if(template_content === null){
		throw new Error(`Could not find the template: ${template_path}`)
	}
	const out_str = template_content.replace(/\$body\$/, parsed_contents)
	fs.writeFileSync(output_path, out_str)
}

// export default function parseMarkdown(markdown: string, address: string) {
// const baseMD = new MDRoot([new Paragraph([new Text(markdown)])])
// }

// The custom part is a regex and a constructor. So a regex, and function to get the object from the regex
export function split_display<T extends node>(
	display_elts: node[],
	make_obj: (args: RegExpMatchArray) => T,
	class_regexp: RegExp,
): node[] {
	const new_display = [] as node[];
	for (const elt of display_elts) {
		if (elt instanceof Paragraph) {
			console.assert(
				elt.elements.length == 1,
				"Paragraph should have only one element at this stage of parsing",
			);
			console.assert(
				elt.elements[0] instanceof Text,
				"Paragraph should have only one text element at this stage of parsing",
			);
			const inline_element = elt.elements[0];
			let current_match: RegExpMatchArray | null = null;
			let start_index = 0;
			const string_to_parse = inline_element.content;
			while (
				(current_match = class_regexp.exec(string_to_parse)) !== null
			) {
				if (current_match.index == undefined) {
					throw new Error("current_match.index is undefined");
				}
				const prev_chunk = inline_element.content.slice(
					start_index,
					current_match.index,
				);
				if (prev_chunk.trim() != "") {
					new_display.push(
						new Paragraph([new Text(strip_newlines(prev_chunk))]),
					);
				}
				new_display.push(make_obj(current_match));
				start_index = current_match.index + current_match[0].length;
			}
			// Last part of the text, or all of it if no match
			const return_string = strip_newlines(
				inline_element.content.slice(start_index),
			);
			if (return_string.trim() != "") {
				new_display.push(new Paragraph([new Text(return_string)]));
			}
		} else {
			new_display.push(elt);
		}
	}
	return new_display;
}

function strip_newlines(thestring: string): string {
	const result = /^(?:(?:\s*?)\n)*(.*?)(?:\n(?:\s*?))?$/s.exec(thestring);
	if (result === null) {
		throw new Error("result is null");
	}
	return result[1];
}

export function parse_inline<ClassObj extends inline_node>(
	text: Text,
	make_obj: (args: RegExpMatchArray) => ClassObj,
	class_regexp: RegExp,
): inline_node[] {
	const new_inline: inline_node[] = [];
	let current_match: RegExpMatchArray | null = null;
	let start_index = 0;
	while ((current_match = class_regexp.exec(text.content)) !== null) {
		if (current_match.index == undefined) {
			throw new Error("current_match.index is undefined");
		}
		const prev_chunk = text.content.slice(start_index, current_match.index);
		if (prev_chunk.trim() != "") {
			new_inline.push(new Text(prev_chunk));
		}
		new_inline.push(make_obj(current_match));
		start_index = current_match.index + current_match[0].length;
	}
	const last_string = text.content.slice(start_index);
	if (last_string.trim() != "") {
		new_inline.push(new Text(last_string));
	}
	return new_inline;
}

export function parse_all_inline(inline_arr: inline_node[]): inline_node[] {
	let current_array: inline_node[] = inline_arr;

	let new_inline: inline_node[] = [];
	for (const current_inline of current_array) {
		if (current_inline instanceof Text) {
			new_inline.push(
				...parse_inline<InlineMath>(
					current_inline,
					InlineMath.build_from_match,
					InlineMath.regexp,
				),
			);
		} else {
			new_inline.push(current_inline);
		}
	}
	current_array = new_inline;

	new_inline = [];
	for (const current_inline of current_array) {
		if (current_inline instanceof Text) {
			new_inline.push(
				...parse_inline<Strong>(
					current_inline,
					Strong.build_from_match,
					Strong.regexp,
				),
			);
		} else {
			new_inline.push(current_inline);
		}
	}
	current_array = new_inline;

	new_inline = [];
	for (const current_inline of current_array) {
		if (current_inline instanceof Text) {
			new_inline.push(
				...parse_inline<Emphasis>(
					current_inline,
					Emphasis.build_from_match,
					Emphasis.regexp,
				),
			);
		} else {
			new_inline.push(current_inline);
		}
	}
	current_array = new_inline;

	new_inline = [];
	for (const current_inline of current_array) {
		if (current_inline instanceof Text) {
			new_inline.push(
				...parse_inline<Wikilink>(
					current_inline,
					Wikilink.build_from_match,
					Wikilink.regexp,
				),
			);
		} else {
			new_inline.push(current_inline);
		}
	}
	current_array = new_inline;

	return current_array;
}

function traverse_and_parse_from_header(head: Header): void {
	for (const elt of head.children) {
		if (elt instanceof Header) {
			traverse_and_parse_from_header(elt);
		}
		if (elt instanceof Paragraph) {
			elt.elements = parse_all_inline(elt.elements);
		}
	}
}

export function traverse_tree_and_parse_inline(md: MDRoot): void {
	for (const elt of md.children) {
		if (elt instanceof Header) {
			traverse_and_parse_from_header(elt);
		}
		if (elt instanceof Paragraph) {
			elt.elements = parse_all_inline(elt.elements);
		}
	}
}

function parse_inside_env(input: string): node[] {
	let new_display = [new Paragraph([new Text(input)])] as node[];
	new_display = split_display<EmbedWikilink>(
		new_display,
		EmbedWikilink.build_from_match,
		EmbedWikilink.regexp,
	);
	new_display = split_display<Wikilink>( // must be after Wikilink
		new_display,
		Wikilink.build_from_match,
		Wikilink.regexp,
	);
	new_display = split_display<ExplicitRef>( // must be after Wikilink
		new_display,
		ExplicitRef.build_from_match,
		ExplicitRef.regexp,
	);
	new_display = split_display<DisplayMath>(
		new_display,
		DisplayMath.build_from_match,
		DisplayMath.regexp,
	);
	new_display = split_display<DisplayCode>(
		new_display,
		DisplayCode.build_from_match,
		DisplayCode.regexp,
	);
	new_display = split_display<BlankLine>(
		new_display,
		BlankLine.build_from_match,
		BlankLine.regexp,
	);
	return new_display;
}

export function parse_markdown(input: string, address?: string): MDRoot {
	let new_display = [new Paragraph([new Text(input)])] as node[];
	new_display = split_display<Environment>(
		new_display,
		Environment.build_from_match,
		Environment.regexp,
	);
	new_display = split_display<EmbedWikilink>(
		new_display,
		EmbedWikilink.build_from_match,
		EmbedWikilink.regexp,
	);
	new_display = split_display<Wikilink>( // must be after Wikilink
		new_display,
		Wikilink.build_from_match,
		Wikilink.regexp,
	);
	new_display = split_display<ExplicitRef>( // must be after Wikilink
		new_display,
		ExplicitRef.build_from_match,
		ExplicitRef.regexp,
	);
	new_display = split_display<DisplayMath>(
		new_display,
		DisplayMath.build_from_match,
		DisplayMath.regexp,
	);
	new_display = split_display<DisplayCode>(
		new_display,
		DisplayCode.build_from_match,
		DisplayCode.regexp,
	);
	new_display = split_display<BlankLine>(
		new_display,
		BlankLine.build_from_match,
		BlankLine.regexp,
	);
	const new_md = make_heading_tree(new_display);
	traverse_tree_and_parse_inline(new_md);
	new_md.file_address = address;
	return new_md;
}

export function make_heading_tree(markdown: node[]): MDRoot {
	let headingRegex = /^(#+) (.*)$/gm;
	const new_md = new MDRoot([]);
	let header_stack: (Header | MDRoot)[] = [];
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
			const inline_element = elt.elements[0];
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
				if (prev_chunk.trim() != "") {
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
			if (return_string.trim() != "") {
				new_display.push(
					new Paragraph([new Text(strip_newlines(return_string))]),
				);
			}
		} else {
			new_display.push(elt);
		}
	}
	return new_md;
}
