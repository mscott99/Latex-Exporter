jest.mock("obsidian");
import { get_latex_file_contents, get_unrolled_file_contents } from "./test_utils";
import {TEST_DEFAULT_SETTINGS} from "./test_utils";

describe("my plugin", () => {
	test("Quote", async () => {
		const result = await get_latex_file_contents("quote", TEST_DEFAULT_SETTINGS)
		expect(result).toEqual(`Hi I speak
% And here is a quote
% again
I speak more
`)
	})
	test("Env", async () => {
		const result = await get_latex_file_contents("explicit_env", TEST_DEFAULT_SETTINGS)
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
