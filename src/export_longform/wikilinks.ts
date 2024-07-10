import * as path from "path";
import type { ExportPluginSettings } from "../main";
import { address_is_image_file, node } from "./interfaces";
import { Notice, PluginSettingTab, TFile } from "obsidian";
import { metadata_for_unroll } from "./interfaces";
import { Text } from "./inline";
import { parse_embed_content } from "./parseMarkdown";
import { Paragraph, BlankLine, parse_inside_env } from "./display";
import {
	escape_latex,
	strip_newlines,
	find_file,
	notice_and_warn,
} from "./utils";
import { label_from_location, explicit_label, format_label } from "./labels";
import { assert } from "console";

export class EmbedWikilink implements node {
	attribute: string | undefined;
	content: string;
	header: string | undefined;
	display: string | undefined;
	label: string | undefined;
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

	async unroll(data: metadata_for_unroll): Promise<node[]> {
		if (address_is_image_file(this.content)) {
			const file = find_file(data.notes_dir, this.content);
			if (file === undefined) {
				const err_msg =
					"Content not found: Could not find the content of the plot with image '" +
					escape_latex(this.content) +
					"'";
				notice_and_warn(err_msg);
				return [
					new BlankLine(),
					new Paragraph([new Text(err_msg)]),
					new BlankLine(),
				];
			} else {
				data.media_files.push(file);
				const p = new Plot(file, this.display);
				p.label = label_from_location(data, file.name);
				// Resolve the label early. We can do this because label_from_location will not need to resolve headers.
				return [p];
			}
		}

		if (this.display !== undefined) {
			return [new Text(this.display)];
		}
		const header_val = this.header;
		const return_data = await parse_embed_content(
			this.content,
			data.notes_dir,
			data.parsed_file_bundle,
			header_val,
		);
		if (return_data === undefined) {
			const err_msg =
				"Content not found: Could not find the content of \\emph{" +
				escape_latex(this.content) +
				"} with header \\emph{" +
				this.header +
				"}";
			const other_err_msg =
				"Content not found: Could not find the content of '" +
				escape_latex(this.content) +
				"' with header '" +
				this.header +
				"'";
			new Notice(other_err_msg);
			return [
				new BlankLine(),
				new Paragraph([new Text(err_msg)]),
				new BlankLine(),
			];
			return [];
		}
		const [parsed_contents, header_level] = return_data;
		const ambient_header_offset = data.headers_level_offset;
		data.headers_level_offset -= header_level - 2; //disregard nesting level of the embedded header.
		const unrolled_contents = [] as node[];
		for (const elt of parsed_contents) {
			unrolled_contents.push(...(await elt.unroll(data)));
		}
		data.headers_level_offset = ambient_header_offset;
		// Make a label.

		const address =
			this.content === "" ? data.longform_file.basename : this.content;
		if (this.attribute !== undefined) {
			return [
				new Environment(
					unrolled_contents,
					this.attribute,
					label_from_location(data, address, this.header),
				),
			];
		}
		this.label = label_from_location(data, address, this.header);
		return unrolled_contents;
	}
	latex(buffer: Buffer, buffer_offset: number): number {
		return (
			buffer_offset +
			buffer.write("\\autoref{" + this.label + "}\n", buffer_offset)
		);
	}
}

export class Plot implements node {
	image: TFile;
	label: string;
	caption: string | undefined;
	constructor(image: TFile, caption?: string) {
		this.image = image;
		this.caption = caption;
	}
	async unroll(): Promise<node[]> {
		return [this];
	}
	latex(buffer: Buffer, buffer_offset: number) {
		buffer_offset += buffer.write(
			`\\begin{figure}[h]
\\centering
\\includegraphics[width=\\textwidth]{` +
				path.join("Files", this.image.name) +
				"}\n",
			buffer_offset,
		);
		let caption_text: string;
		if (this.caption === undefined) {
			caption_text = "";
			const warning =
				"WARNING: Figure created from '" +
				this.image.name +
				"' has no caption.";
			notice_and_warn(warning);
		} else {
			caption_text = this.caption;
		}
		buffer_offset += buffer.write(
			"\\caption{" + caption_text + "\\label{" + this.label + "}}\n",
			buffer_offset,
		);
		buffer_offset += buffer.write("\\end{figure}\n", buffer_offset);
		return buffer_offset;
	}
}

export class Wikilink implements node {
	attribute: string | undefined;
	content: string;
	header: string | undefined;
	displayed: string | undefined;
	static regexp =
		/(?:(\S*?)::)?\[\[([\s\S]*?)(?:\#([\s\S]*?))?(?:\|([\s\S]*?))?\]\]/g;
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
	async unroll(data: metadata_for_unroll): Promise<node[]> {
		if (this.displayed !== undefined) {
			return [new Text(this.displayed)];
		}
		const match = /^@(.*)$/.exec(this.content);
		if (match !== null) {
			data.bib_keys.push(this.content);
			return [new Citation(match[1])];
		} else {
			return [
				new UnrolledWikilink(
					data,
					this.attribute,
					this.content,
					this.header,
					this.displayed,
				),
			];
		}
	}
	latex(buffer: Buffer, buffer_offset: number) {
		if (this.header === undefined) {
			this.header = "";
		}
		return (
			buffer_offset +
			buffer.write(
				"[[" + this.content + "#" + this.header + "]]",
				buffer_offset,
			)
		);
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
		this.type = type.toLowerCase().trim();
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
	async unroll(data: metadata_for_unroll): Promise<node[]> {
		// If it is unrolled, it is likely an explicit env.
		if (this.label !== undefined) {
			this.label = explicit_label(
				data.longform_file,
				data.current_file,
				this.label,
			);
		}
		return [this];
	}
	latex(buffer: Buffer, buffer_offset: number): number {
		buffer_offset += buffer.write(
			"\\begin{" + this.type + "}",
			buffer_offset,
		);
		if (this.label !== undefined) {
			if (this.type === "proof") {
				buffer_offset += buffer.write(
					"[\\hypertarget{" +
						this.label +
						"}Proof of \\autoref{" +
						this.label.replace("proof", "statement") +
						"}]",
					buffer_offset,
				);
			} else {
				buffer_offset += buffer.write(
					"\n\\label{" + format_label(this.label) + "}\n",
					buffer_offset,
				);
			}
		}
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
export class Hyperlink implements node {
	address: string;
	label: string;
	latex(buffer: Buffer, buffer_offset: number): number {
		return (
			buffer_offset +
			buffer.write(
				"\\hyperlink{" +
					this.address +
					"}{" +
					format_label(this.label) +
					"}",
				buffer_offset,
			)
		);
	}
	async unroll(): Promise<node[]> {
		return [this];
	}
	constructor(label: string, address: string) {
		this.label = label;
		this.address = address;
	}
}

// The purpose of this class is to defer the label resolution until all files are parsed. So labels are determined in the latex() call.
export class UnrolledWikilink implements node {
	unroll_data: metadata_for_unroll;
	attribute: string | undefined;
	address: string;
	header: string | undefined;
	displayed: string | undefined;
	constructor(
		unroll_data: metadata_for_unroll,
		attribute: string | undefined,
		address: string,
		header: string | undefined,
		displayed: string | undefined,
	) {
		assert(!/^@/.exec(address), "Should not be a citation");
		this.unroll_data = {
			depth: unroll_data.depth,
			env_hash_list: unroll_data.env_hash_list,
			parsed_file_bundle: unroll_data.parsed_file_bundle,
			headers_level_offset: unroll_data.headers_level_offset,
			explicit_env_index: unroll_data.explicit_env_index,
			longform_file: unroll_data.longform_file,
			current_file: unroll_data.current_file,
			notes_dir: unroll_data.notes_dir,
			header_stack: [...unroll_data.header_stack],
			media_files: [...unroll_data.media_files],
			bib_keys: [...unroll_data.bib_keys],
		};
		this.attribute = attribute;
		this.address = address;
		this.header = header;
		this.displayed = displayed;
	}
	latex(buffer: Buffer, buffer_offset: number): number {
		const address =
			this.address === ""
				? this.unroll_data.longform_file.basename
				: this.address;

		const label = label_from_location(
			this.unroll_data,
			address,
			this.header,
		);

		if (this.header?.toLowerCase().trim() !== "proof") {
			return (
				buffer_offset +
				buffer.write("\\autoref{" + label + "}", buffer_offset)
			);
		} else {
			return (
				buffer_offset +
				buffer.write(
					"\\hyperlink{" + label + "}{the proof}",
					buffer_offset,
				)
			);
		}
	}
	async unroll(): Promise<node[]> {
		return [this];
	}
}

export class Reference implements node {
	label: string;
	latex(buffer: Buffer, buffer_offset: number): number {
		return (
			buffer_offset +
			buffer.write(
				"\\autoref{" + format_label(this.label) + "}",
				buffer_offset,
			)
		);
	}
	async unroll(): Promise<node[]> {
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
	async unroll(): Promise<node[]> {
		return [this];
	}
	latex(
		buffer: Buffer,
		buffer_offset: number,
		settings?: ExportPluginSettings,
	): number {
		const citeword = "textcite";
		// TODO: change the use of textcite to an option in settings
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
				buffer.write(
					"\\" + citeword + "{" + this.id + "}",
					buffer_offset,
				)
			);
		}
	}
}
