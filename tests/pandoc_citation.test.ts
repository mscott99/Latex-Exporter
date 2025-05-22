jest.mock("obsidian");
import { get_latex_file_contents } from "./test_utils";
import { DEFAULT_SETTINGS } from "../src/export_longform/interfaces";

describe("PandocCitation", () => {
	test("single citations", async () => {
		let settings = {
			...DEFAULT_SETTINGS,
			default_citation_command: "defaultcite",
		};
		const result = await get_latex_file_contents(
			"single_citation",
			settings,
		);
		expect(result).toEqual(
			`Here is \\textcite{smith2021}.
Parenthetical \\parencite{smith2021}.
With suffix \\parencite[p. 14]{smith2021}.
Narrative suffix \\textcite[p. 14]{smith2021}.
Suppressed \\citeyear{smith2021}.
`,
		);
	});
});
