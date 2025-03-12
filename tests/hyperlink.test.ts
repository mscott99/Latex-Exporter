jest.mock("obsidian");
import { get_latex_file_contents } from "./test_utils";
import { DEFAULT_SETTINGS } from "../src/export_longform/interfaces";

describe("Hyperlink parsing", () => {
    test("parses external Markdown link to LaTeX href", async () => {
        const result = await get_latex_file_contents(
            "hyperlink_test",
            DEFAULT_SETTINGS,
        );
        expect(result).toEqual(
            "Visit \\href{https://google.com}{Google} for more info.\n"
        );
    });
});