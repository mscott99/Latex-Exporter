jest.mock("obsidian");
import { get_latex_file_contents, get_unrolled_file_contents } from "./test_utils";
import { DEFAULT_SETTINGS } from "../src/export_longform/interfaces";

describe("my plugin", () => {
	test("Quote", async () => {
		const result = await get_latex_file_contents("quote", DEFAULT_SETTINGS)
		expect(result).toEqual(`Hi I speak
% And here is a quote
% again
I speak more
`)
	})
	test("Env", async () => {
		const result = await get_latex_file_contents("explicit_env", DEFAULT_SETTINGS)
		expect(result).toEqual(`\\begin{lemma}
\\begin{equation*}
\\varepsilon
\\end{equation*}
and $\\varepsilon$
\\autoref{loc:simple_lem.statement}
\\end{lemma}
`)
	})
});