import { node, metadata_for_unroll } from "./interfaces";
import { Wikilink, Citation, MultiCitation } from "./wikilinks";
import { explicit_label } from "./labels";
import {format_label} from "./labels";

export function parse_inline(inline_arr: node[]): node[] {
	inline_arr = split_inline<MultiCitation>(
		inline_arr,
		MultiCitation.regexp,
		MultiCitation.build_from_match,
	);
	inline_arr = split_inline<Citation>(
		inline_arr,
		Citation.regexp,
		Citation.build_from_match,
	);
	inline_arr = split_inline<Wikilink>(
		inline_arr,
		Wikilink.regexp,
		Wikilink.build_from_match,
	); // must be before inline math so as to include math in displayed text.
	inline_arr = split_inline<InlineMath>(
		inline_arr,
		InlineMath.regexp,
		InlineMath.build_from_match,
	);
	inline_arr = split_inline<ExplicitRef>(
		inline_arr,
		ExplicitRef.regexp,
		ExplicitRef.build_from_match,
	);
	inline_arr = split_inline<Quotes>(
		inline_arr,
		Quotes.regexp,
		Quotes.build_from_match,
	);
	inline_arr = split_inline<Strong>(
		inline_arr,
		Strong.regexp,
		Strong.build_from_match,
	);
	inline_arr = split_inline<Emphasis>(
		inline_arr,
		Emphasis.regexp,
		Emphasis.build_from_match,
	);
	return inline_arr;
}

export function split_inline<ClassObj extends node>(
	inline_arr: node[],
	class_regexp: RegExp,
	make_obj: (args: RegExpMatchArray) => ClassObj,
): node[] {
	const new_inline: node[] = [];
	for (const text of inline_arr) {
		if (text instanceof Text) {
			let current_match: RegExpMatchArray | null = null;
			let start_index = 0;
			while ((current_match = class_regexp.exec(text.content)) !== null) {
				if (current_match.index == null) {
					throw new Error("current_match.index is undefined");
				}
				const prev_chunk = text.content.slice(
					start_index,
					current_match.index,
				);
				if (prev_chunk !== "") {
					new_inline.push(new Text(prev_chunk));
				}
				new_inline.push(make_obj(current_match));
				start_index = current_match.index + current_match[0].length;
			}
			const last_string = text.content.slice(start_index);
			if (last_string !== "") {
				new_inline.push(new Text(last_string));
			}
		} else {
			new_inline.push(text);
		}
	}
	return new_inline;
}

class ExplicitRef implements node {
	label: string;
	constructor(content: string) {
		this.label = content;
	}
	static regexp = /@([\w-_:]+)/g; // parse only after parsing for citations.
	static build_from_match(regexmatch: RegExpMatchArray): ExplicitRef {
		return new ExplicitRef(regexmatch[1]);
	}
	async unroll(data: metadata_for_unroll): Promise<node[]> {
		this.label = explicit_label(
			data.longform_file,
			data.current_file,
			this.label,
		);
		return [this];
	}
	async latex(buffer: Buffer, buffer_offset: number) {
		return (
			buffer_offset +
			buffer.write("\\autoref{" + format_label(this.label) + "}", buffer_offset)
		);
	}
}

export class Text implements node {
	content: string;
	constructor(content: string) {
		this.content = content;
	}
	async unroll(): Promise<node[]> {
		return [this];
	}
	async latex(buffer: Buffer, buffer_offset: number) {
		return buffer_offset + buffer.write(this.content, buffer_offset);
	}
}

export class Emphasis implements node {
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
	async unroll(): Promise<node[]> {
		return [this];
	}
	async latex(buffer: Buffer, buffer_offset: number) {
		return (
			buffer_offset +
			buffer.write("\\emph{" + this.content + "}", buffer_offset)
		);
	}
}

export class Quotes implements node {
	static regexp = /(?:"(\S.*?)")/gs;
	content: string;
	label: string | undefined;
	static build_from_match(regexmatch: RegExpMatchArray): Emphasis {
		return new Quotes(regexmatch[1]);
	}
	constructor(content: string) {
		this.content = content;
	}
	async unroll(): Promise<node[]> {
		return [this];
	}
	async latex(buffer: Buffer, buffer_offset: number) {
		return (
			buffer_offset +
			buffer.write("\`\`" + this.content + "\"", buffer_offset)
		);
	}
}

export class Strong implements node {
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
	async unroll(): Promise<node[]> {
		return [this];
	}
	async latex(buffer: Buffer, buffer_offset: number) {
		return (
			buffer_offset +
			buffer.write("\\textbf{" + this.content + "}", buffer_offset)
		);
	}
}

export class InlineMath implements node {
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
	async unroll(): Promise<node[]> {
		return [this];
	}
	async latex(buffer: Buffer, buffer_offset: number) {
		return (
			buffer_offset +
			buffer.write("$" + this.content + "$", buffer_offset)
		);
	}
}

export class InlineCode implements node {
	code: string;
	static regexp = /`(.*?)`/gs;
	static build_from_match(match: RegExpMatchArray): InlineCode {
		return new InlineCode(match[1]);
	}
	constructor(content: string) {
		this.code = content;
	}
	async unroll(): Promise<node[]> {
		return [this];
	}
	async latex(buffer: Buffer, buffer_offset: number) {
		return (
			buffer_offset + buffer.write("`" + this.code + "`", buffer_offset)
		);
	}
}
