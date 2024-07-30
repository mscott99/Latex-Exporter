jest.mock("obsidian");

import { Text, parse_inline, parse_note } from "../src/export_longform";
import { get_latex_file_contents, get_unrolled_file_contents } from "./test_utils";

describe("my plugin", () => {
	test("parse citation", async () => {
		const intermediate_result = await get_unrolled_file_contents("simple_citation")
		const result = await get_latex_file_contents("simple_citation")
		expect(result).toEqual("This is a \\textcite{citation}. See \\cite[Proposition 3]{citation}. And~\\cite{citation}.\n")
	})
});
