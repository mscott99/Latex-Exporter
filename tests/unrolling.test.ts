import { find_file } from "../src/utils";
import {
	parse_file,
	Environment,
	MDRoot,
	Paragraph,
	Text,
	Header,
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
		const parsed_contents = parse_file(file_contents, address);
		const data = {
			depth: 0,
			env_hash_list: [] as Environment[],
			parsed_file_bundle: {} as { [key: string]: MDRoot },
			longform_address: address,
			current_address: address,
			notes_dir: notes_dir,
			header_stack: [] as Header[],
		};
		const unrolled_content = parsed_contents.unroll(data);

		const expected_content = [
				new Environment(
					[new Paragraph([new Text("Content of lemma2")])],
					"lemma",
					"lemma2",
				),
			];

		expect(unrolled_content).toEqual(expected_content);
	});
});
