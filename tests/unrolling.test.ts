jest.mock("obsidian");
import { DEFAULT_SETTINGS } from "../src/export_longform/interfaces";
import {
	get_find_file_fn,
	read_tfile,
	get_unrolled_file_contents,
	get_latex_file_contents,
} from "./test_utils";
import {
	UnrolledWikilink,
	unroll_array,
	init_data,
	Environment,
	DisplayMath,
	Paragraph,
	Text,
	parse_note,
} from "../src/export_longform";

describe("split_display_blocks", () => {
	const notes_dir = "./tests/files/";
	const find_file = get_find_file_fn(notes_dir);
	test("should find the files", async () => {
		const out_lem = find_file("lemma2");
		if (out_lem === undefined) {
			throw new Error("File not found");
		}
		const out_embed = find_file("simple_embed");
		if (out_embed === undefined) {
			throw new Error("File not found");
		}
		expect(out_lem.path).toEqual("tests/files/subfolder/lemma2.md");
		expect(out_embed.path).toEqual("tests/files/simple_embed.md");
	});
	test("test environment unrolling", async () => {
		const unrolled_content =
			await get_unrolled_file_contents("simple_embed");
		const expected_content = [
			new Environment(
				[new Paragraph([new Text("Content of lemma2")])],
				"lemma",
				"loc:lemma2",
				"lemma2",
				{},
			),
		];
		expect(unrolled_content).toEqual(expected_content);
	});
	test("test env labels", async () => {
		const address = "longform_labels";
		const longform_file = find_file(address);
		if (longform_file === undefined) {
			throw new Error(`File not found: ${address}`);
		}
		const file_contents = await read_tfile(longform_file);
		const parsed_contents = parse_note(
			file_contents,
			DEFAULT_SETTINGS,
		).body;
		const data = init_data(longform_file, read_tfile, find_file);
		const unrolled_content = await get_latex_file_contents(
			"longform_labels",
			DEFAULT_SETTINGS,
		);
		const expected = `\\begin{theorem}
\\label{loc:other_lem.statement}

\\textbf{Statement}

Content of the other lemma.
\\end{theorem}
\\begin{lemma}
\\label{lem:label_1}
some stuff
\\begin{equation*}
\\varepsilon
\\end{equation*}
reference:\\Cref{loc:other_lem.statement}
\\end{lemma}
`;
		expect(unrolled_content).toEqual(expected);
	});

	//Difficult to compare with a large data object.
	// test("test header embed", async () => {
	// 	const address = "find_header";
	// 	const longform_file = find_file(address);
	// 	if (longform_file === undefined) {
	// 		throw new Error(`File not found: ${address}`);
	// 	}
	// 	const file_contents = await read_tfile(longform_file);
	// 	const parsed_contents = parse_note(file_contents).body;
	// 	const data = init_data(longform_file, read_tfile, find_file);
	// 	const unrolled_content = await unroll_array(data, parsed_contents);
	// 	(unrolled_content[0] as any).data = undefined;
	// 	(unrolled_content[0] as any).children[1].data = undefined;
	// 	const expected_content = [
	// 		new Header(
	// 			1,
	// 			[new Text("Statement")],
	// 			[
	// 				new Header(
	// 					2,
	// 					[new Text("h6 title")],
	// 					[new Paragraph([new Text("content in h6")])],
	// 					"h6 title",
	// 					undefined,
	// 				),
	// 			],
	// 			"Statement",
	// 			undefined,
	// 		),
	// 	];
	// 	unrolled_content
	// 	expect(unrolled_content).toEqual(expected_content);
	// });

	// test("test env labels", async () => {
	// 	const address = "longform_labels";
	// 	const longform_file = find_file(address);
	// 	if (longform_file === undefined) {
	// 		throw new Error(`File not found: ${address}`);
	// 	}
	// 	const parsed_content = await parse_longform(
	// 		read_tfile,
	// 		find_file,
	// 		longform_file,
	// 		DEFAULT_SETTINGS
	// 	);
	// 	const expected_content = `\\begin{lemma}\n\\label{lem:label_1}\nsome stuff\n\\begin{equation*}\n\\varepsilon\n\\end{equation*}\n\\end{lemma}\n\\begin{theorem}\n\\label{loc:other_lem.statement}\nContent of the other lemma.\n\\end{theorem}\nreference:\\Cref{loc:other_lem.statement}\n`;
	// 	expect(parsed_content.body).toEqual(expected_content);
	// });
});
