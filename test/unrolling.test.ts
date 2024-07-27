jest.mock("obsidian");
import { TFile } from "obsidian";
import { make_tfile } from "./test_utils";
import { get_find_file_fn, get_read_tfile_fn } from "./test_utils";
import {
	parse_longform,
	init_data,
	Reference,
	Environment,
	DisplayMath,
	parse_display,
	Paragraph,
	Text,
	Header,
} from "../src/export_longform";
import * as fs from "fs";
import {join} from "path";

describe("split_display_blocks", () => {
	const notes_dir = "./tests/files/";
	const find_file = get_find_file_fn(notes_dir)
	const read_tfile = get_read_tfile_fn(notes_dir)
	test("should find the files", () => {
		expect(find_file("lemma2")).toEqual(
			"tests/files/subfolder/lemma2.md",
		);
		expect(find_file("simple_embed")).toEqual(
			"tests/files/simple_embed.md",
		);
	});
	test("test environment unrolling", async () => {
		const address = "simple_embed";
		const longform_path = await find_file(address);
		if (longform_path === undefined) {
			throw new Error(`File not found: ${address}`);
		}
		const file_contents = fs.readFileSync(join(notes_dir, longform_path.path), "utf-8");
		const parsed_contents = parse_display(file_contents);
		const data = init_data(make_tfile(address), read_tfile, find_file);
		const unrolled_content = parsed_contents[1][0].unroll(data);

		const expected_content = [
			new Environment(
				[new Paragraph([new Text("Content of lemma2")])],
				"lemma",
				"res:lemma2.statement",
			),
		];

		expect(unrolled_content).toEqual(expected_content);
	});
	test("test env labels", async () => {
		const address = "longform_labels";
		const longform_path = await find_file(address);
		if (longform_path === undefined) {
			throw new Error(`File not found: ${address}`);
		}
		const file_contents = fs.readFileSync(longform_path.path, "utf-8");
		const parsed_contents = parse_display(file_contents);
		const data = init_data(make_tfile(address), read_tfile, find_file);
		const unrolled_content = parsed_contents[1][0].unroll(data);

		const expected_content = [
			new Environment(
				[
					new Paragraph([new Text("some stuff")]),
					new DisplayMath("	\\varepsilon", undefined),
				],
				"lemma",
				"lem:label_1",
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

	test("test header embed", async () => {
		const address = "find_header";
		const longform_path = await find_file(address);
		if (longform_path === undefined) {
			throw new Error(`File not found: ${address}`);
		}
		const file_contents = fs.readFileSync(longform_path.path, "utf-8");
		const parsed_contents = parse_display(file_contents);
		const data = init_data(make_tfile(address), read_tfile, find_file);
		const unrolled_content = parsed_contents[1][0].unroll(data);

		const expected_content = [
			new Header(
				1,
				[new Text("Statement")],
				[
					new Header(
						2,
						[new Text("h6 title")],
						[new Paragraph([new Text("content in h6")])],
						"h6 title",
					),
				],
				"Statement",
			),
		];

		expect(unrolled_content).toEqual(expected_content);
	});
	test("test env labels", () => {
		const address = "longform_labels";
		const parsed_content = parse_longform(read_tfile, find_file, make_tfile(address));
		const expected_content = `\\begin{lemma}\n\\label{lem:label_1}\nsome stuff\n\\begin{equation}\n	\\varepsilon\n\\end{equation}\n\\end{lemma}\n\\begin{theorem}\n\\label{res:other_lem.statement}\nContent of the other lemma.\n\\end{theorem}\nreference:\n\\autoref{res:other_lem.statement}`;
		expect(parsed_content).toEqual(expected_content);
	});
});
