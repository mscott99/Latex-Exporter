jest.mock("obsidian");

import { Text, parse_inline } from "../src/export_longform";

describe("my plugin", () => {
	it("parses without errors", () => {
		parse_inline([new Text("foo")]);
	});
});
