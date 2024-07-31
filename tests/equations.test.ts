jest.mock("obsidian");
import { get_latex_file_contents, get_unrolled_file_contents } from "./test_utils";

describe("my plugin", () => {
	test("aligned env", async () => {
		const result = await get_latex_file_contents("weird_equations")
		expect(result).toEqual(`\\begin{equation*}
\\begin{aligned}
\\sum_{i = 1}^n
\\end{aligned}
\\end{equation*}
`)
	})
});
