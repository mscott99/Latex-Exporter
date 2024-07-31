jest.mock("obsidian");
import { get_latex_file_contents, get_unrolled_file_contents } from "./test_utils";

describe("my plugin", () => {
	test("parse citation", async () => {
		const result = await get_latex_file_contents("simple_citation")
		expect(result).toEqual("This is a \\textcite{citation}. Another \\textcite{citation}. See \\cite[Proposition 3]{citation}. And~\\cite{citation}. Case~\\cite{citation} followed by\\cite{citation1, citation2}.\n")
	})
	test("multi citations", async () => {
		const intermediate_result = await get_unrolled_file_contents("multi_citation")
		const result = await get_latex_file_contents("multi_citation")
		expect(result).toEqual("Hi \\cite{citation1, citation2, citation3, citation4}.\n\\cite{citation1, citation2, citation3, citation4}\n")
	})
});
