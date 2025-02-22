import { notice_and_warn, strip_newlines } from "./utils";
import {
	node,
	metadata_for_unroll,
	unroll_array,
	init_data,
	parsed_note,
	note_cache,
	ExportPluginSettings,
} from "./interfaces";
import {
	NumberedList,
	UnorderedList,
	DisplayMath,
	Paragraph,
	BlankLine,
	Comment,
	Quote,
	DisplayCode,
	split_display,
} from "./display";
import {
	Wikilink,
	Citation,
	MultiCitation,
	PandocMultiCitation,
	EmbedWikilink,
	Environment,
} from "./wikilinks";
import {
	split_inline,
	ExplicitRef,
	Text,
	Emphasis,
	DoubleQuotes,
	SingleQuotes,
	Strong,
	InlineMath,
	InlineCode
} from "./inline";
import { Header, find_header } from "./headers";
import { TFile, Notice, parseYaml } from "obsidian";

// Describe label system
// If embedwikilink env, the label is an address to the embedded header, defaults to "statement" if no header is provided.
// If explicit env, parse for a label, otherwise it has no label.

/**
 * Plays the role of the zero'th header. Use this data structure when representing the markdown content of a file, or of some markdown with header structures.
 */
export type parsed_longform = {
	yaml: { [key: string]: string };
	abstract: string | undefined;
	body: string;
	appendix: string | undefined;
	media_files: TFile[];
	bib_keys: string[];
};

/**
 * Exports a full file by dealing with each core section of a longform.
 */
export async function parse_longform(
	read_tfile: (file: TFile) => Promise<string>,
	find_file: (address: string) => TFile | undefined,
	longform_file: TFile,
	settings: ExportPluginSettings,
	selection?: string,
): Promise<parsed_longform> {
	if (longform_file === undefined) {
		throw new Error(`File not found: ${longform_file}`);
	}
	let file_contents: string;
	if (selection === undefined) {
		file_contents = await read_tfile(longform_file);
	} else {
		file_contents = selection;
	}
	const parsed_longform = parse_note(file_contents, settings);
	const cache = {} as note_cache;
	cache[longform_file.basename] = parsed_longform;
	let parsed_content = parsed_longform.body;
	let abstract_header: Header | undefined;
	for (const e of parsed_content) {
		if (
			e instanceof Header &&
			(await e.latex_title(settings)).toLowerCase().trim() === "abstract"
		) {
			abstract_header = e;
			parsed_content = parsed_content.filter((x) => x !== e);
		}
	}
	let appendix_header: Header | undefined;
	for (const e of parsed_content) {
		if (
			e instanceof Header &&
			(await e.latex_title(settings)).toLowerCase().trim() === "appendix"
		) {
			appendix_header = e;
			parsed_content = parsed_content.filter((x) => x !== e);
		}
	}
	let body_header_content = parsed_content;
	let body_header: Header | undefined = undefined;
	for (const e of parsed_content) {
		if (
			e instanceof Header &&
			(await e.latex_title(settings)).toLowerCase().trim() === "body"
		) {
			body_header = e;
			lower_headers([body_header]);
			body_header_content = e.children;
		}
	}

	// Must unroll all before rendering into latex so that at latex() time there is access to all
	// parsed files.
	const data = init_data(longform_file, read_tfile, find_file);
	data.parsed_file_bundle = cache;

	if (abstract_header !== undefined) {
		data.header_stack = [abstract_header];
	}
	const abstract_unrolled_content =
		abstract_header === undefined
			? undefined
			: await unroll_array(data, abstract_header.children, settings);

	if (body_header !== undefined) {
		data.header_stack = [body_header];
	}
	const body_unrolled_content = await unroll_array(
		data,
		body_header_content,
		settings,
	);

	if (appendix_header !== undefined) {
		data.header_stack = [appendix_header];
	}
	const appendix_unrolled_content =
		appendix_header === undefined
			? undefined
			: await unroll_array(data, appendix_header.children, settings);
	const abstract_string =
		abstract_unrolled_content === undefined
			? undefined
			: await render_content(data, abstract_unrolled_content, settings);
	const body_string = await render_content(
		data,
		body_unrolled_content,
		settings,
	);
	const appendix_string =
		appendix_unrolled_content === undefined
			? undefined
			: await render_content(data, appendix_unrolled_content, settings);
	return {
		yaml: parsed_longform.yaml,
		abstract: abstract_string,
		body: body_string,
		appendix: appendix_string,
		media_files: data.media_files,
		bib_keys: data.bib_keys,
	};
}

function lower_headers(content: node[]): void {
	for (const e of content) {
		if (e instanceof Header) {
			e.level -= 1;
			lower_headers(e.children);
		}
	}
}

async function render_content(
	data: metadata_for_unroll,
	content: node[],
	settings: ExportPluginSettings,
): Promise<string> {
	const buffer = Buffer.alloc(10000000); // made this very big. Too big? For my paper I run out with two orders of magnitude smaller.
	let offset = 0;
	for (const elt of content) {
		offset = await elt.latex(buffer, offset, settings);
	}
	return buffer.toString("utf8", 0, offset);
}

export async function export_selection(
	read_tfile: (file: TFile) => Promise<string>,
	find_file: (address: string) => TFile | undefined,
	longform_file: TFile,
	selection: string,
	settings: ExportPluginSettings,
) {
	const parsed_contents = await parse_longform(
		read_tfile,
		find_file,
		longform_file,
		settings,
		selection,
	);
	if (selection !== undefined) {
		const content = join_sections(parsed_contents);
		// copy content to clipboard
		await navigator.clipboard.writeText(content);
		new Notice("Latex content copied to clipboard");
		return;
	}
}

export async function write_with_template(
	template_file: TFile,
	parsed_contents: parsed_longform,
	output_file: TFile,
	modify_tfile: (file: TFile, content: string) => Promise<void>,
	read_tfile: (file: TFile) => Promise<string>,
) {
	let template_content = await read_tfile(template_file);
	for (const key of Object.keys(parsed_contents["yaml"])) {
		template_content = template_content.replace(
			RegExp(`\\\$${key}\\\$`, "i"),
			parsed_contents["yaml"][key],
		);
	}
	template_content = template_content.replace(
		/\$body\$/i,
		parsed_contents["body"],
	);
	if (parsed_contents["abstract"] !== undefined) {
		if (template_file) {
			template_content = template_content.replace(
				/\$abstract\$/i,
				parsed_contents["abstract"],
			);
		} else {
			template_content;
		}
	}
	if (parsed_contents["appendix"] !== undefined) {
		template_content = template_content.replace(
			/\$appendix\$/i,
			parsed_contents["appendix"],
		);
	}
	await modify_tfile(output_file, template_content);
}

function join_sections(parsed_contents: parsed_longform) {
	let content = "";
	if (parsed_contents["abstract"] !== undefined) {
		content =
			content +
			`\\begin{abstract}\n` +
			parsed_contents["abstract"] +
			`\\end{abstract}\n`;
	}
	content += parsed_contents["body"];
	if (parsed_contents["appendix"] !== undefined) {
		content += `\\printbibliography\n`;
		content +=
			`\\appendix\n\\section{Appendix}\n` + parsed_contents["appendix"];
	}
	return content;
}

export async function write_without_template(
	parsed_contents: parsed_longform,
	output_file: TFile,
	modify: (file: TFile, content: string) => Promise<void>,
	preamble_file?: TFile,
) {
	let content = `\\documentclass{article}
\\input{header}\n`;
	if (preamble_file !== undefined) {
		content += "\\input{" + preamble_file.name + "}\n";
	}
	content += `\\addbibresource{bibliography.bib}\n`;
	content += `\\title{`;
	if (parsed_contents["yaml"]["title"] !== undefined) {
		content += parsed_contents["yaml"]["title"];
	}
	content += `}\n`;
	if (parsed_contents["yaml"]["author"] !== undefined) {
		content += `\\author{` + parsed_contents["yaml"]["author"] + `}\n`;
	}
	content += `\\begin{document}
\\maketitle
`;
	if (parsed_contents["abstract"] !== undefined) {
		content =
			content +
			`\\begin{abstract}\n` +
			parsed_contents["abstract"] +
			`\\end{abstract}\n`;
	}
	content += parsed_contents["body"] + `\\printbibliography\n`;
	if (parsed_contents["appendix"] !== undefined) {
		content +=
			`\\appendix\n\\section{Appendix}\n` + parsed_contents["appendix"];
	}
	content += "\\end{document}";
	await modify(output_file, content);
}

function traverse_tree_and_parse_display(
	md: node[],
	settings: ExportPluginSettings,
): node[] {
	const new_md: node[] = [];
	for (const elt of md) {
		if (elt instanceof Paragraph) {
			const parsed_objects = parse_after_headers([elt], settings);
			new_md.push(...parsed_objects);
		} else if (elt instanceof Header) {
			elt.children = traverse_tree_and_parse_display(
				elt.children,
				settings,
			);
			new_md.push(elt);
		} else {
			new_md.push(elt);
		}
	}
	return new_md;
}

export function traverse_tree_and_parse_inline(
	md: node[],
	settings: ExportPluginSettings,
): void {
	for (const elt of md) {
		if (elt instanceof Header) {
			traverse_tree_and_parse_inline(elt.children, settings);
			elt.title = parse_inline(elt.title, settings);
		} else if (elt instanceof NumberedList) {
			for (const e of elt.content) {
				traverse_tree_and_parse_inline(e, settings);
			}
		} else if (elt instanceof UnorderedList) {
			for (const e of elt.content) {
				traverse_tree_and_parse_inline(e, settings);
			}
		} else if (elt instanceof Paragraph) {
			elt.elements = parse_inline(elt.elements, settings);
		}
	}
}

// TODO: make the underlying structure cleaner
// Parses markdown text but does not unroll
export function parse_note(
	file_contents: string,
	settings: ExportPluginSettings,
): parsed_note {
	const [yaml, body] = parse_display(file_contents, settings);
	let parsed_contents = make_heading_tree(body);
	parsed_contents = traverse_tree_and_parse_display(
		parsed_contents,
		settings,
	);
	traverse_tree_and_parse_inline(parsed_contents, settings);
	return { yaml: yaml, body: parsed_contents };
}

export async function parse_embed_content(
	address: string,
	find_file: (address: string) => TFile | undefined,
	read_tfile: (file: TFile) => Promise<string>,
	parsed_cache: note_cache,
	file_of_origin: TFile,
	settings: ExportPluginSettings,
	header?: string,
): Promise<[node[], number] | undefined> {
	const file_found = find_file(address);
	if (file_found === undefined) {
		// no warning necessary, already warned in find_file
		return undefined;
	}
	if (!(file_found.basename in Object.keys(parsed_cache))) {
		const file_contents = await read_tfile(file_found);
		parsed_cache[file_found.basename] = parse_note(file_contents, settings);
	}
	const content = parsed_cache[file_found.basename];
	if (content === undefined) {
		return undefined;
	}
	if (header === undefined) {
		return [content.body, 0];
	}
	const header_elt = await find_header(header, [content.body], settings);
	if (header_elt === undefined) {
		notice_and_warn(
			"Header not found: " + header + " in file with address " + address +
				"In note:\n"+
				file_of_origin.path,
		);
		return undefined;
	}
	return [header_elt.children, header_elt.level];
}

export function parse_display(
	input: string,
	settings: ExportPluginSettings,
): [{ [key: string]: string }, node[]] {
	const parsed_yaml = parse_yaml_header(input);
	let new_display = [new Paragraph([new Text(parsed_yaml[1])])] as node[];
	new_display = split_display<Comment>(
		new_display,
		Comment.build_from_match,
		Comment.get_regexp(),
		settings,
	);
	new_display = split_display<Quote>(
		new_display,
		Quote.build_from_match,
		Quote.get_regexp(),
		settings,
	);
	new_display = split_display<DisplayCode>(
		new_display,
		DisplayCode.build_from_match,
		DisplayCode.get_regexp(),
		settings,
	); //must come before explicit environment
	new_display = split_display<EmbedWikilink>(
		new_display,
		EmbedWikilink.build_from_match,
		EmbedWikilink.get_regexp(),
		settings,
	); //must come before explicit environment
	return [parsed_yaml[0], new_display];
}

export function parse_after_headers(
	new_display: node[],
	settings: ExportPluginSettings,
): node[] {
	// let new_display = [new Paragraph([new Text(input)])] as node[];
	new_display = split_display<Environment>(
		new_display,
		Environment.build_from_match,
		Environment.get_regexp(),
		settings,
	);
	new_display = split_display<BlankLine>(
		new_display,
		BlankLine.build_from_match,
		BlankLine.get_regexp(),
		settings,
	); // BlankLine must be before the lists. They deliminate the lists.
	if (!settings.prioritize_lists) {
		new_display = split_display<DisplayMath>(
			new_display,
			DisplayMath.build_from_match,
			DisplayMath.get_regexp(),
			settings,
		);
	}
	new_display = split_display<NumberedList>( // Lists parse until the end of the string. What limits them is the presence of other elements in front of them.
		new_display,
		NumberedList.build_from_match,
		NumberedList.get_regexp(),
		settings,
	);
	for (const elt of new_display) {
		if (elt instanceof NumberedList) {
			const new_content: node[][] = [];
			for (const e of elt.content) {
				new_content.push(parse_after_headers(e, settings));
			}
			elt.content = new_content;
		}
	}
	new_display = split_display<UnorderedList>(
		new_display,
		UnorderedList.build_from_match,
		UnorderedList.get_regexp(),
		settings,
	);
	for (const elt of new_display) {
		if (elt instanceof UnorderedList) {
			const new_content: node[][] = [];
			for (const e of elt.content) {
				new_content.push(parse_after_headers(e, settings));
			}
			elt.content = new_content;
		}
	}
	if (settings.prioritize_lists) {
		new_display = split_display<DisplayMath>(
			new_display,
			DisplayMath.build_from_match,
			DisplayMath.get_regexp(),
			settings,
		);
	}
	return new_display;
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

function parse_yaml_header(input: string): [{ [key: string]: string }, string] {
	const match = /^---\n(.*?)---\n(.*)$/s.exec(input);
	if (!match) {
		return [{}, input];
	}
	return [parseYaml(match[1]), match[2]];
}

export function parse_inline(
	inline_arr: node[],
	settings: ExportPluginSettings,
): node[] {
	inline_arr = split_inline<ExplicitRef>(
		inline_arr,
		ExplicitRef.get_regexp(),
		ExplicitRef.build_from_match,
		settings,
	); // Must be before citations.
	inline_arr = split_inline<MultiCitation>(
		inline_arr,
		MultiCitation.get_regexp(),
		MultiCitation.build_from_match,
		settings,
	);
	inline_arr = split_inline<PandocMultiCitation>(
		inline_arr,
		PandocMultiCitation.get_regexp(),
		PandocMultiCitation.build_from_match,
		settings,
	);
	inline_arr = split_inline<Citation>(
		inline_arr,
		Citation.get_regexp(),
		Citation.build_from_match,
		settings,
	);
	inline_arr = split_inline<Wikilink>(
		inline_arr,
		Wikilink.get_regexp(),
		Wikilink.build_from_match,
		settings,
	); // must be before inline math so as to include math in displayed text.
	inline_arr = split_inline<InlineMath>(
		inline_arr,
		InlineMath.get_regexp(),
		InlineMath.build_from_match,
		settings,
	);
	inline_arr = split_inline<DoubleQuotes>(
		inline_arr,
		DoubleQuotes.get_regexp(),
		DoubleQuotes.build_from_match,
		settings,
	);
	inline_arr = split_inline<SingleQuotes>(
		inline_arr,
		SingleQuotes.get_regexp(),
		SingleQuotes.build_from_match,
		settings,
	);
	inline_arr = split_inline<Strong>(
		inline_arr,
		Strong.get_regexp(),
		Strong.build_from_match,
		settings,
	);
	inline_arr = split_inline<Emphasis>(
		inline_arr,
		Emphasis.get_regexp(),
		Emphasis.build_from_match,
		settings,
	);
	inline_arr = split_inline<InlineCode>(
		inline_arr,
		InlineCode.get_regexp(),
		InlineCode.build_from_match,
		settings,
	);
	return inline_arr;
}
