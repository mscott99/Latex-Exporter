jest.mock("obsidian");
import { get_latex_file_contents } from "./test_utils";
import { DEFAULT_SETTINGS } from "../src/export_longform/interfaces";

describe("my plugin", () => {
	test("Quote", async () => {
		const result = await get_latex_file_contents("quote", DEFAULT_SETTINGS);
		expect(result).toEqual(`Hi I speak
% And here is a quote
% again
I speak more
`);
	});
	test("Env", async () => {
		const result = await get_latex_file_contents(
			"explicit_env",
			DEFAULT_SETTINGS,
		);
		expect(result).toEqual(`\\begin{lemma}
\\label{lem:label}
\\begin{equation*}
\\varepsilon
\\end{equation*}
and $\\varepsilon$
\\Cref{loc:simple_lem.statement}
\\end{lemma}
\\Cref{lem:label}
`);
	});
	test("Code", async () => {
		const result = await get_latex_file_contents(
			"code_env",
			DEFAULT_SETTINGS,
		);
		expect(result).toEqual(`\\begin{verbatim}
Here is some _code_ *things*
\\end{verbatim}
`);
	});
	test("Code", async () => {
		const result = await get_latex_file_contents(
			"code_env",
			DEFAULT_SETTINGS,
		);
		expect(result).toEqual(`\\begin{verbatim}
Here is some _code_ *things*
\\end{verbatim}
`);
	});
	// Test below will fail because the yaml parsing comes from obsidian. Enable if I fish out my manual yaml parsing from that package (probably not).
// 	test("test title of envs", async () => {
// 		const display_settings = DEFAULT_SETTINGS;
// 		display_settings.display_result_names = true;
// 		const result = await get_latex_file_contents(
// 			"env_with_title",
// 			display_settings,
// 		);
// 		expect(result).toEqual(`\\begin{theorem}[A very nice theorem]
// \\label{thm:embed_with_title}
// Here is my theorem content
// \\end{theorem}
// `);
// });
});
