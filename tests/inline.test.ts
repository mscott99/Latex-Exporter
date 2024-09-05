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
`);
	});
});
