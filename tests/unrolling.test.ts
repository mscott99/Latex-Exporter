import { find_file } from "../src/utils";
import {
	Citation,
	init_data,
	Reference,
	Environment,
	DisplayMath,
	Emphasis,
	parse_markdown,
	Strong,
	Wikilink,
	inline_node,
	parse_inline,
	InlineMath,
	split_display,
	make_heading_tree,
	EmbedWikilink,
	DisplayCode,
	MDRoot,
	Paragraph,
	Text,
	Header,
	BlankLine,
	parse_all_inline,
} from "../src/parseMarkdown";
import * as fs from "fs";

describe("split_display_blocks", () => {
	test("should find the files", () => {
		expect(find_file("./tests/files/", "lemma2")).toEqual(
			"tests/files/subfolder/lemma2.md",
		);
		expect(find_file("./tests/files/", "simple_embed")).toEqual(
			"tests/files/simple_embed.md",
		);
	});
	test("test environment unrolling", () => {
		const address = "simple_embed";
		const notes_dir = "./tests/files/";
		const longform_path = find_file(notes_dir, address);
		if (longform_path === null) {
			throw new Error(`File not found: ${address} in ${notes_dir}`);
		}
		const file_contents = fs.readFileSync(longform_path, "utf-8");
		const parsed_contents = parse_markdown(file_contents, address);
		const data = init_data(address, notes_dir);
		const unrolled_content = parsed_contents.unroll(data);

		const expected_content = [
			new Environment(
				[new Paragraph([new Text("Content of lemma2")])],
				"lemma",
				"res:lemma2.statement",
			),
		];

		expect(unrolled_content).toEqual(expected_content);
	});
	test("test env labels", () => {
		const address = "longform_labels";
		const notes_dir = "./tests/files/";
		const longform_path = find_file(notes_dir, address);
		if (longform_path === null) {
			throw new Error(`File not found: ${address} in ${notes_dir}`);
		}
		const file_contents = fs.readFileSync(longform_path, "utf-8");
		const parsed_contents = parse_markdown(file_contents, address);
		const data = init_data(address, notes_dir);
		const unrolled_content = parsed_contents.unroll(data);

		const expected_content = [
			new Environment(
				[
					new Paragraph([new Text("some stuff")]),
					new DisplayMath("	\\varepsilon", undefined),
				],
				"lemma",
				"lem:label_1"
			),
			new Environment(
				[new Paragraph([new Text("Content of the other lemma.")])],
				"theorem",	
				"res:other_lem.statement",
			),
			new Paragraph([new Text("reference:")]),
			new Reference("res:other_lem.statement"),
		];

		expect(unrolled_content).toEqual(expected_content);
	});
});
