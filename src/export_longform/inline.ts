import { node, metadata_for_unroll, ExportPluginSettings } from "./interfaces";
import { explicit_label } from "./labels";
import { format_label } from "./labels";

export function split_inline<ClassObj extends node>(
	inline_arr: node[],
	class_regexp: RegExp,
	make_obj: (
		args: RegExpMatchArray,
		settings: ExportPluginSettings,
	) => ClassObj,
	settings: ExportPluginSettings,
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
				new_inline.push(make_obj(current_match, settings));
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

export class ExplicitRef implements node {
	label: string;
	constructor(identifier: string, name: string) {
		this.label = identifier + "-" + name;
	}
	static get_regexp(): RegExp {
		return /@(ref|loc|tbl|eq|lem|sec|lst|thm|def|ex|exr|prf|alg)\-([\w_:\-]+)/g; // parse only after parsing for citations.
	}
	static build_from_match(
		regexmatch: RegExpMatchArray,
		settings: ExportPluginSettings,
	): ExplicitRef {
		return new ExplicitRef(regexmatch[1], regexmatch[2]);
	}
	async unroll(
		data: metadata_for_unroll,
		settings: ExportPluginSettings,
	): Promise<node[]> {
		return [this];
	}
	async latex(
		buffer: Buffer,
		buffer_offset: number,
		settings: ExportPluginSettings,
	) {
		return (
			buffer_offset +
			buffer.write(
				"\\autoref{" + format_label(this.label) + "}",
				buffer_offset,
			)
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
	async latex(
		buffer: Buffer,
		buffer_offset: number,
		settings: ExportPluginSettings,
	) {
		return buffer_offset + buffer.write(this.content, buffer_offset);
	}
}

export class Emphasis implements node {
	static get_regexp(): RegExp {
		return /(?:\*(\S.*?)\*)|(?:_(\S.*?)_)/gs;
	}
	content: string;
	label: string | undefined;
	static build_from_match(
		regexmatch: RegExpMatchArray,
		settings: ExportPluginSettings,
	): Emphasis {
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
	async latex(
		buffer: Buffer,
		buffer_offset: number,
		settings: ExportPluginSettings,
	) {
		return (
			buffer_offset +
			buffer.write("\\emph{" + this.content + "}", buffer_offset)
		);
	}
}

export class DoubleQuotes implements node {
	static get_regexp(): RegExp {
		return /(?:"(\S.*?)")/gs;
	}
	content: string;
	label: string | undefined;
	static build_from_match(
		regexmatch: RegExpMatchArray,
		settings: ExportPluginSettings,
	): Emphasis {
		return new DoubleQuotes(regexmatch[1]);
	}
	constructor(content: string) {
		this.content = content;
	}
	async unroll(): Promise<node[]> {
		return [this];
	}
	async latex(
		buffer: Buffer,
		buffer_offset: number,
		settings: ExportPluginSettings,
	) {
		return (
			buffer_offset +
			buffer.write("``" + this.content + '"', buffer_offset)
		);
	}
}

export class SingleQuotes implements node {
	static get_regexp(): RegExp {
		return /(?:'(\S.*?)')/gs;
	}
	content: string;
	label: string | undefined;
	static build_from_match(
		regexmatch: RegExpMatchArray,
		settings: ExportPluginSettings,
	): Emphasis {
		return new SingleQuotes(regexmatch[1]);
	}
	constructor(content: string) {
		this.content = content;
	}
	async unroll(): Promise<node[]> {
		return [this];
	}
	async latex(
		buffer: Buffer,
		buffer_offset: number,
		settings: ExportPluginSettings,
	) {
		return (
			buffer_offset +
			buffer.write("`" + this.content + "'", buffer_offset)
		);
	}
}

export class Strong implements node {
	// similar to emphasis but with double asterisks
	static get_regexp(): RegExp {
		return /(?:\*\*(\S.*?)\*\*)|(?:__(\S.*?)__)/gs;
	}
	content: string;
	label: string | undefined;
	static build_from_match(
		regexmatch: RegExpMatchArray,
		settings: ExportPluginSettings,
	): Strong {
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
	async latex(
		buffer: Buffer,
		buffer_offset: number,
		settings: ExportPluginSettings,
	) {
		return (
			buffer_offset +
			buffer.write("\\textbf{" + this.content + "}", buffer_offset)
		);
	}
}

export class InlineMath implements node {
	static get_regexp(): RegExp {
		return /\$([^\$]+)\$(?:{(.*?)})?/g;
	}
	content: string;
	label: string | undefined;
	static build_from_match(
		regexmatch: RegExpMatchArray,
		settings: ExportPluginSettings,
	): InlineMath {
		return new InlineMath(regexmatch[1], regexmatch[2]);
	}
	constructor(content: string, label?: string) {
		this.content = content;
		this.label = label;
	}
	async unroll(): Promise<node[]> {
		return [this];
	}
	async latex(
		buffer: Buffer,
		buffer_offset: number,
		settings: ExportPluginSettings,
	) {
		return (
			buffer_offset +
			buffer.write("$" + this.content + "$", buffer_offset)
		);
	}
}

export class InlineCode implements node {
	code: string;
	static get_regexp(): RegExp {
		return /`(.*?)`/gs;
	}
	static build_from_match(
		match: RegExpMatchArray,
		settings: ExportPluginSettings,
	): InlineCode {
		return new InlineCode(match[1]);
	}
	constructor(content: string) {
		this.code = content;
	}
	async unroll(): Promise<node[]> {
		return [this];
	}
	async latex(
		buffer: Buffer,
		buffer_offset: number,
		settings: ExportPluginSettings,
	) {
		return (
			buffer_offset + buffer.write("`" + this.code + "`", buffer_offset)
		);
	}
}
