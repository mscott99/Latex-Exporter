import { node, metadata_for_unroll, unroll_array } from "./interfaces";
import { notice_and_warn, strip_newlines } from "./utils";
import { Text } from "./inline";
import { format_label } from "./labels";
import { EmbedWikilink, Environment } from "./wikilinks";
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
			const inline_element = elt.elements[0] as Text;
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
				if (prev_chunk.trim() !== "") {
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
			if (return_string.trim() !== "") {
				new_display.push(new Paragraph([new Text(return_string)]));
			}
		} else {
			new_display.push(elt);
		}
	}
	return new_display;
}

export function parse_display(
	input: string,
): [{ [key: string]: string }, node[]] {
	const parsed_yaml = parse_yaml_header(input);
	let new_display = [new Paragraph([new Text(parsed_yaml[1])])] as node[];
	new_display = split_display<Comment>(
		new_display,
		Comment.build_from_match,
		Comment.regexp,
	);
	new_display = split_display<Quote>(
		new_display,
		Quote.build_from_match,
		Quote.regexp,
	);
	new_display = split_display<EmbedWikilink>(
		new_display,
		EmbedWikilink.build_from_match,
		EmbedWikilink.regexp,
	); //must come before explicit environment
	return [parsed_yaml[0], new_display];
}

export function parse_after_headers(new_display: node[]): node[] {
	// let new_display = [new Paragraph([new Text(input)])] as node[];
	new_display = split_display<Environment>(
		new_display,
		Environment.build_from_match,
		Environment.regexp,
	);
	new_display = split_display<DisplayMath>(
		new_display,
		DisplayMath.build_from_match,
		DisplayMath.regexp,
	);
	new_display = split_display<NumberedList>(
		new_display,
		NumberedList.build_from_match,
		NumberedList.regexp,
	);
	for (const elt of new_display) {
		if (elt instanceof NumberedList) {
			const new_content: node[][] = [];
			for (const e of elt.content) {
				new_content.push(parse_after_headers(e));
			}
			elt.content = new_content;
		}
	}
	new_display = split_display<UnorderedList>(
		new_display,
		UnorderedList.build_from_match,
		UnorderedList.regexp,
	);
	for (const elt of new_display) {
		if (elt instanceof UnorderedList) {
			const new_content: node[][] = [];
			for (const e of elt.content) {
				new_content.push(parse_after_headers(e));
			}
			elt.content = new_content;
		}
	}
	new_display = split_display<BlankLine>(
		new_display,
		BlankLine.build_from_match,
		BlankLine.regexp,
	);
	return new_display;
}

export function parse_inside_env(input: string): node[] {
	let new_display = [new Paragraph([new Text(input)])] as node[];
	new_display = split_display<EmbedWikilink>(
		new_display,
		EmbedWikilink.build_from_match,
		EmbedWikilink.regexp,
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

function parse_yaml_header(input: string): [{ [key: string]: string }, string] {
	const match = /^---\n(.*?)---\n(.*)$/s.exec(input);
	if (!match) {
		return [{}, input];
	}
	const yaml_content = match[1];
	const remainder = match[2];
	const field_regex = /^(['"]?)(\S+?)\1\s*?:\s+(['"]?)(.+?)\3$/gm;
	let field_match: RegExpMatchArray | null;
	const field_dict: { [key: string]: string } = {};
	while ((field_match = field_regex.exec(yaml_content)) !== null) {
		field_dict[field_match[2]] = field_match[4];
	}
	return [field_dict, remainder];
}

export class DisplayMath implements node {
	// parent: node;
	content: string;
	label: string | undefined;
	explicit_env_name: string | undefined;
	static regexp =
		/\$\$\s*(?:\\begin{(\S*?)}\s*([\S\s]*?)\s*\\end{\1}|([\S\s]*?))\s*?\$\$(?:\s*?{#(\S*?)})?/gs;
	static build_from_match(match: RegExpMatchArray): DisplayMath {
		const latex = match[2] === undefined ? match[3] : match[2];
		const label_match = /eq-(\w+)/.exec(match[1]);
		let label_val = match[1];
		if (label_match && label_match[1] !== undefined) {
			label_val = label_match[1];
		}
		return new DisplayMath(latex, match[4], label_val);
	}
	constructor(latex: string, label?: string, explicit_env?: string) {
		this.content = latex;
		this.label = label;
		this.explicit_env_name = explicit_env;
	}
	async unroll(): Promise<node[]> {
		return [this];
	}
	latex(buffer: Buffer, buffer_offset: number) {
		let env_name = "equation*";
		if (this.label !== undefined) {
			env_name = "equation";
		}
		if (this.explicit_env_name !== undefined) {
			env_name = this.explicit_env_name;
		}
		buffer_offset += buffer.write(
			"\\begin{" + env_name + "}\n",
			buffer_offset,
		);
		if (this.label !== undefined) {
			buffer_offset += buffer.write(
				"\\label{" + format_label(this.label) + "}\n",
				buffer_offset,
			);
		}
		buffer_offset += buffer.write(this.content + "\n", buffer_offset);
		buffer_offset += buffer.write(
			"\\end{" + env_name + "}\n",
			buffer_offset,
		);
		return buffer_offset;
	}
}

export class Paragraph implements node {
	elements: node[];
	constructor(elements: node[]) {
		this.elements = elements;
	}
	async unroll(data: metadata_for_unroll): Promise<node[]> {
		const new_elements: node[] = [];
		for (const elt of this.elements) {
			new_elements.push(...(await elt.unroll(data)));
		}
		this.elements = new_elements;
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

export class BlankLine implements node {
	static regexp = /\n\s*\n/g;
	static build_from_match(): BlankLine {
		return new BlankLine();
	}
	async unroll(): Promise<node[]> {
		return [this];
	}
	latex(buffer: Buffer, buffer_offset: number) {
		return buffer_offset + buffer.write("\n", buffer_offset);
		// the other \n should be done at the end of the previous display object.
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
	async unroll(): Promise<node[]> {
		return [this];
	}
	latex(buffer: Buffer, buffer_offset: number) {
		// notice_and_warn("Code to latex not implemented");
		buffer_offset += buffer.write(
			"\\begin{lstlisting}\n",
			buffer_offset,
		);
		// if (this.label !== undefined) {
		// 	buffer_offset += buffer.write(
		// 		"\\label{" + format_label(this.label) + "}\n",
		// 		buffer_offset,
		// 	);
		// }
		buffer_offset += buffer.write(this.code + "\n", buffer_offset);
		buffer_offset += buffer.write(
			"\\end{lstlisting}\n",
			buffer_offset,
		);
		return buffer_offset;
	}
}

export class Quote implements node {
	content: string;
	static regexp = /^>(.*)$/gm;
	constructor(content: string) {
		this.content = content;
	}
	static build_from_match(regexmatch: RegExpMatchArray): Quote {
		return new Quote(regexmatch[1]);
	}
	async unroll(): Promise<node[]> {
		return [this];
	}
	latex(buffer: Buffer, buffer_offset: number) {
		return buffer_offset;
	}
}

export class NumberedList implements node {
	content: node[][];
	static regexp =
		/(?<=^|\n)\s*?1\. (.*?)(?:2\. (.*?))?(?:3\. (.*?))?(?:4\. (.*?))?(?:5\. (.*?))?(?:6\. (.*?))?(?:7\. (.*?))?(?:8\. (.*?))?(?:9\. (.*?))?(?:10\. (.*?))?(?:11\. (.*?))?(?:12\. (.*?))?(?:13\. (.*?))?(?:14\. (.*?))?(?:15\. (.*?))?(?:16\. (.*?))?(?:17\. (.*?))?(?:18\. (.*?))?(?:19\. (.*?))?(?:20\. (.*?))?(?=\n\s*?\n|$)/gs;
	constructor(content: node[][]) {
		this.content = content;
	}
	static build_from_match(regexmatch: RegExpMatchArray): NumberedList {
		const list_contents: string[] = [];
		for (const e of regexmatch.slice(1)) {
			if (e === undefined) {
				break;
			}
			list_contents.push(e);
		}
		return new NumberedList(
			list_contents.map((e) => [new Paragraph([new Text(e)])]),
		);
	}
	async unroll(data: metadata_for_unroll): Promise<node[]> {
		const new_content: node[][] = [];
		for (const e of this.content) {
			new_content.push(await unroll_array(data, e));
		}
		return [new NumberedList(new_content)];
	}
	latex(buffer: Buffer, buffer_offset: number) {
		buffer_offset += buffer.write("\\begin{enumerate}\n", buffer_offset);
		for (const e of this.content) {
			buffer_offset += buffer.write("\\item ", buffer_offset);
			for (const f of e) {
				buffer_offset = f.latex(buffer, buffer_offset);
			}
		}
		buffer_offset += buffer.write("\\end{enumerate}\n", buffer_offset);
		return buffer_offset;
	}
}

export class UnorderedList implements node {
	content: node[][];
	static regexp =
		//gs;
		/(?<=^|\n)\s*?(?:-|\+|\*) (.*?)(?:\n\s*?(?:-|\+|\*) (.*?))?(?:\n\s*?(?:-|\+|\*) (.*?))?(?:\n\s*?(?:-|\+|\*) (.*?))?(?:\n\s*?(?:-|\+|\*) (.*?))?(?:\n\s*?(?:-|\+|\*) (.*?))?(?:\n\s*?(?:-|\+|\*) (.*?))?(?:\n\s*?(?:-|\+|\*) (.*?))?(?:\n\s*?(?:-|\+|\*) (.*?))?(?:\n\s*?(?:-|\+|\*) (.*?))?(?:\n\s*?(?:-|\+|\*) (.*?))?(?:\n\s*?(?:-|\+|\*) (.*?))?(?:\n\s*?(?:-|\+|\*) (.*?))?(?:\n\s*?(?:-|\+|\*) (.*?))?(?:\n\s*?(?:-|\+|\*) (.*?))?(?:\n\s*?(?:-|\+|\*) (.*?))?(?=\n\s*?\n|$)/gs;

	constructor(content: node[][]) {
		this.content = content;
	}
	static build_from_match(regexmatch: RegExpMatchArray): UnorderedList {
		const list_contents: string[] = [];
		for (const e of regexmatch.slice(1)) {
			if (e === undefined) {
				break;
			}
			list_contents.push(e);
		}
		return new UnorderedList(
			list_contents.map((e) => [new Paragraph([new Text(e)])]),
		);
	}
	async unroll(data: metadata_for_unroll): Promise<node[]> {
		const new_content: node[][] = [];
		for (const e of this.content) {
			new_content.push(await unroll_array(data, e));
		}
		return [new UnorderedList(new_content)];
	}
	latex(buffer: Buffer, buffer_offset: number) {
		buffer_offset += buffer.write("\\begin{itemize}\n", buffer_offset);
		for (const e of this.content) {
			buffer_offset += buffer.write("\\item ", buffer_offset);
			for (const f of e) {
				buffer_offset = f.latex(buffer, buffer_offset);
			}
		}
		buffer_offset += buffer.write("\\end{itemize}\n", buffer_offset);
		return buffer_offset;
	}
}

export class Comment implements node {
	content: string;
	static regexp = /\%\%(.*?)\%\%/gs;
	constructor(content: string) {
		this.content = content;
	}
	static build_from_match(regexmatch: RegExpMatchArray): Quote {
		return new Comment(regexmatch[1]);
	}
	async unroll(): Promise<node[]> {
		return [this];
	}
	latex(buffer: Buffer, buffer_offset: number) {
		return buffer_offset;
	}
}
