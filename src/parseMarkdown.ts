type unroll_data = {
	depth: number;
	env_hash_list: Environment[];
	file_bundle: MDRoot[];
};

export class MDRoot implements node {
	level = 0;
	file_address: string | undefined;
	children: node[];
	constructor(children: node[], address?: string) {
		this.children = children;
		this.file_address = address;
	}
	unroll(data?: unroll_data): node[] {
		const new_children: node[] = [];
		if (data === undefined) {
			data = { depth: 0, env_hash_list: [], file_bundle: [] };
		}
		for (const elt of this.children) {
			new_children.push(...elt.unroll(data));
		}
		return new_children;
	}
}

export class Header implements node {
	children: node[];
	level: number;
	title: inline_node[];
	constructor(level: number, title: inline_node[], children: node[]) {
		this.level = level;
		this.title = title;
		this.children = children;
	}
	unroll(data?: unroll_data): node[] {
		const new_children: node[] = [];
		for (const elt of this.children) {
			new_children.push(...elt.unroll(data));
		}
		return new_children;
	}
}

export interface node {
	unroll(data?: unroll_data): node[];
}

export class Environment implements node {
	children: node[];
	label: string | undefined;
	address_of_origin: string;
	constructor(children: node[], address_of_origin: string) {
		this.children = children;
		this.address_of_origin = address_of_origin;
	}
	unroll(data?: unroll_data): node[] {
		return [this];
	}
}

export class Paragraph implements node {
	elements: inline_node[];
	constructor(elements: inline_node[]) {
		this.elements = elements;
	}
	unroll(data?: unroll_data): node[] {
		return [this];
	}
}

export interface inline_node {
	content: string;
}

export class Text implements inline_node {
	content: string;
	constructor(content: string) {
		this.content = content;
	}
}

export class BlankLine implements node {
	static regexp = /\n\s*\n/g;
	static build_from_match(args: RegExpMatchArray): BlankLine {
		return new BlankLine();
	}
	unroll(data?: unroll_data): node[] {
		return [this];
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
	unroll(data?: unroll_data): node[] {
		return [this];
	}
}

export class EmbedWikilink implements node {
	attribute: string | undefined;
	content: string;
	header: string | undefined;
	displayed: string | undefined;
	static regexp =
		/(?:(\S*?)::)?!\[\[([\s\S]*?)(?:\#([\s\S]*?))?(?:\|([\s\S]*?))?\]\]/g;
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
		this.displayed = displayed;
	}
	unroll(data?: unroll_data): node[] {
		// if(this.attribute === undefined){
		// 	return [this]
		// }
		return [this];
	}
}

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
}

export class DisplayMath implements node {
	// parent: node;
	latex: string;
	label: string | undefined;
	static regexp = /\$\$([\s\S]*?)\$\$(?:\s*?{([\s\S]*?)})?/g;
	static build_from_match(args: RegExpMatchArray): DisplayMath {
		return new DisplayMath(args[1], args[2]);
	}
	constructor(latex: string, label?: string) {
		this.latex = latex;
		this.label = label;
	}
	unroll(data?: unroll_data): node[] {
		return [this];
	}
}

export default function parseMarkdown(markdown: string) {
	// const baseMD = new MDRoot([new Paragraph([new Text(markdown)])])
}

// The custom part is a regex and a constructor. So a regex, and function to get the object from the regex
export function split_display<T extends node>(
	markdown: MDRoot,
	make_obj: (args: RegExpMatchArray) => T,
	class_regexp: RegExp,
): MDRoot {
	const new_md = new MDRoot([], markdown.file_address);
	const new_display: node[] = new_md.children;
	for (const elt of markdown.children) {
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
	return new_md;
}

function strip_newlines(thestring: string): string {
	const result = /^(\n*)(.*?)(\n*)$/s.exec(thestring);
	if (result === null) {
		throw new Error("result is null");
	}
	return result[2];
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

export function parse_file(input: string): MDRoot {
	let new_md = new MDRoot([new Paragraph([new Text(input)])]);
	new_md = split_display<DisplayMath>(
		new_md,
		DisplayMath.build_from_match,
		DisplayMath.regexp,
	);
	new_md = split_display<DisplayCode>(
		new_md,
		DisplayCode.build_from_match,
		DisplayCode.regexp,
	);
	new_md = split_display<EmbedWikilink>(
		new_md,
		EmbedWikilink.build_from_match,
		EmbedWikilink.regexp,
	);
	new_md = split_display<BlankLine>(
		new_md,
		BlankLine.build_from_match,
		BlankLine.regexp,
	);
	new_md = make_heading_tree(new_md);
	traverse_tree_and_parse_inline(new_md);
	return new_md;
}

export function make_heading_tree(markdown: MDRoot): MDRoot {
	let headingRegex = /^(#+) (.*)$/gm;
	const new_md = new MDRoot([], markdown.file_address);
	let header_stack: (Header | MDRoot)[] = [];
	header_stack.push(new_md);
	let new_display: node[] = new_md.children;
	let current_match: RegExpMatchArray | null;
	for (const elt of markdown.children) {
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
