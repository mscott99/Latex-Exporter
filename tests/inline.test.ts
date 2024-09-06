jest.mock("obsidian");
import {
	get_latex_file_contents,
	get_unrolled_file_contents,
} from "./test_utils";
import { DEFAULT_SETTINGS } from "../src/export_longform/interfaces";

describe("all inline", () => {
	test("inline", async () => {
		const result = await get_latex_file_contents(
			"inline",
			DEFAULT_SETTINGS,
		);
		expect(result)
			.toEqual(`A \\emph{emph} \\textbf{strong} \`\`quotes" \`single'
Another \\emph{emph} \\textbf{strong}
`);
	});
	test("citation", async () => {
		let settings = DEFAULT_SETTINGS;
		settings.default_citation_command = "othercite"
		const result = await get_latex_file_contents(
			"citations",
			settings,
		);
		expect(result)
			.toEqual(`I cite \\othercite{first}, \\cite[p.2]{first}, \\cite{first}, \\othercite{first}, \\cite{second}, \\cite{second}, \\textcite{first}, \\cite{first, second}, \\cite[Remark 1]{second}.
\\cite{hello, hi, other}
\\cite{hello, what}
\\othercite{vershyninHighDimensionalProbabilityIntroduction2018}, \\cite{vershyninHighDimensionalProbabilityIntroduction2018}, \\cite[Example 2.1]{vershyninHighDimensionalProbabilityIntroduction2018},
\\cite{berkCoherenceParameterCharacterizing2022, berkModeladaptedFourierSampling2023}, and then \\othercite{vershyninHighDimensionalProbabilityIntroduction2018}.
`);
	});
});
