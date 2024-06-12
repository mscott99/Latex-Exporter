import {node} from "./interfaces"
import { metadata_for_unroll } from "./interfaces";
import {Text} from "./inline"
import {parse_embed_content} from "./parseMarkdown"
import {Paragraph, BlankLine, parse_inside_env} from "./display"
import {escape_latex, strip_newlines} from "./utils"
import {label_from_location, explicit_label} from "./labels"

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
			return [
				new BlankLine(),
				new Paragraph([
					new Text(
						"Content not found: Could not find the content of \\emph{" +
							escape_latex(this.content) +
							"} with header \\emph{" +
							this.header +
							"}",
					),
				]),
			];
		}
		const [parsed_contents, header_level] = return_data;
		const ambient_header_offset = data.headers_level_offset;
		data.headers_level_offset -= header_level - 1; //disregard nesting level of the embedded header.
		const unrolled_contents = [] as node[];
		for (const elt of parsed_contents) {
			unrolled_contents.push(...(await elt.unroll(data)));
		}
		data.headers_level_offset = ambient_header_offset;
		// Make a label.

		if (this.attribute !== undefined) {
			return [
				new Environment(
					unrolled_contents,
					this.attribute,
					label_from_location(data, this.content, this.header),
				),
			];
		}
		this.label = label_from_location(data, this.content, this.header);
		return unrolled_contents;
	}
	latex(buffer: Buffer, buffer_offset: number): number {
		return (
			buffer_offset +
			buffer.write("\\autoref{" + this.label + "}\n", buffer_offset)
		);
	}
}

export class Wikilink implements node {
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
	async unroll(data: metadata_for_unroll): Promise<node[]> {
		if (this.displayed !== undefined) {
			return [new Text(this.displayed)];
		}
		const match = /^@(.*)$/.exec(this.content);
		if (match !== null) {
			return [new Citation(match[1])];
		} else if(this.header?.toLowerCase().trim() !== "proof") {
			return [
				new Reference(
					label_from_location(data, this.content, this.header),
				),
			];
		} else {
			return [
				new Hyperlink( "the proof", 
					label_from_location(data, this.content, this.header)),
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
					"\n\\label{" + this.label + "}\n",
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
	address:string
	label: string;
	latex(buffer: Buffer, buffer_offset: number): number {
		return (
			buffer_offset +
			buffer.write("\\hyperlink{" + this.address + "}{" + this.label+ "}", buffer_offset)
		);
	}
	async unroll(): Promise<node[]> {
		return [this];
	}
	constructor(label: string, address:string) {
		this.label = label;
		this.address = address;
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
