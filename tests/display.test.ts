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
\\label{loc:simple_lem.statement}
hi
\\end{lemma}
\\begin{lemma}
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
	// Test below does not check yaml parsing; from obsidian. Enable if I fish out my manual yaml parsing from that package (probably not).
	// Cannot test this, because the yaml module is called for any embed env.
	// 	test("test title of envs", async () => {
	// 		const display_settings = DEFAULT_SETTINGS;
	// 		display_settings.default_env_name_to_file_name = true;
	// 		const result = await get_latex_file_contents(
	// 			"env_with_title",
	// 			display_settings,
	// 		);
	// 		expect(result).toEqual(`\\begin{theorem}[display title of env]
	// \\label{thm:embed_with_title}
	// Here is my theorem content
	// \\end{theorem}
	// `);
	// 	});
});
