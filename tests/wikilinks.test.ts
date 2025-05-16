jest.mock("obsidian");
import {
	get_latex_file_contents,
	get_unrolled_file_contents,
} from "./test_utils";
import { DEFAULT_SETTINGS } from "../src/export_longform/interfaces";

describe("my plugin", () => {
	test("parse citation", async () => {
		let settings = DEFAULT_SETTINGS;
		settings.default_citation_command = "textcite";
		const result = await get_latex_file_contents(
			"simple_citation",
			DEFAULT_SETTINGS,
		);
		expect(result).toEqual(
			"This is a \\textcite{citation}. Another \\textcite{citation}. See \\textcite[Proposition 3]{citation}. And~\\cite{citation}. Case~\\cite{citation} followed by\\cite{citation1, citation2}.\n",
		);
	});
	test("multi citations", async () => {
		const result = await get_latex_file_contents(
			"multi_citation",
			DEFAULT_SETTINGS,
		);
		expect(result).toEqual(
			"Hi \\cite{citation1, citation2, citation3, citation4}.\n\\cite{citation1, citation2, citation3, citation4}\n",
		);
	});
});
