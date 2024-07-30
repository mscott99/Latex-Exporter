jest.mock("obsidian");
import {
	Environment,
	DisplayMath,
	Emphasis,
	parse_note,
	Strong,
	Wikilink,
	node,
	parse_inline,
	InlineMath,
	split_display,
	make_heading_tree,
	EmbedWikilink,
	DisplayCode,
	Paragraph,
	Text,
	Header,
	BlankLine,
	split_inline,
} from "../src/export_longform";

describe("split_display_blocks", () => {
	test("should split paragraphs by blank lines", () => {
		const markdown = [
			new Paragraph([new Text("This is the first paragraph.")]),
			new Paragraph([new Text("This is the second\n paragraph.")]),
			new Paragraph([new Text("This is the third\n    \n paragraph.")]),
		];

		const expected = [
			new Paragraph([new Text("This is the first paragraph.")]),
			new Paragraph([new Text("This is the second\n paragraph.")]),
			new Paragraph([new Text("This is the third")]),
			new BlankLine(),
			new Paragraph([new Text(" paragraph.")]),
		];

		const new_markdown = split_display<BlankLine>(
			markdown,
			BlankLine.build_from_match,
			BlankLine.regexp,
		);

		expect(new_markdown).toEqual(expected);
	});
	test("check equation splitting", () => {
		const markdown = [
			new Paragraph([
				new Text(
					"This is the$$hi\n$${#eq-label} first and \n$$ $ all \\sum_{} $$ paragraph.$$",
				),
			]),
		];

		const expected = [
			new Paragraph([new Text("This is the")]),
			new DisplayMath("hi", "eq-label"),
			new Paragraph([new Text(" first and ")]),
			new DisplayMath("$ all \\sum_{}", undefined),
			new Paragraph([new Text(" paragraph.$$")]),
		];

		const new_markdown = split_display<DisplayMath>(
			markdown,
			DisplayMath.build_from_match,
			DisplayMath.regexp,
		);

		expect(new_markdown).toEqual(expected);
	});

	test("check display code", () => {
		const markdown = [
			new Paragraph([
				new Text(
					"This is the ```hi this is\ncode``` first and ``` {python}\n more code``` all",
				),
			]),
		];

		const expected = [
			new Paragraph([new Text("This is the ")]),
			new DisplayCode("hi this is\ncode"),
			new Paragraph([new Text(" first and ")]),
			new DisplayCode(" more code", "python", true),
			new Paragraph([new Text(" all")]),
		];

		const new_markdown = split_display<DisplayCode>(
			markdown,
			DisplayCode.build_from_match,
			DisplayCode.regexp,
		);

		expect(new_markdown).toEqual(expected);
	});
	test("test embed wikilink", () => {
		const markdown = [
			new Paragraph([
				new Text("This is a \nlemma::![[wikilink#header|display]]"),
			]),
		];
		const expected = [
			new Paragraph([new Text("This is a ")]),
			new EmbedWikilink("lemma", "wikilink", "header", "display"),
		];
		const new_markdown = split_display<EmbedWikilink>(
			markdown,
			EmbedWikilink.build_from_match,
			EmbedWikilink.regexp,
		);
		expect(new_markdown).toEqual(expected);
	});
	test("test header tree", () => {
		const markdown = [
			new Paragraph([
				new Text(
					"This is a\n# H1 header\nh1 content\n## H2 header\nh2 content\n# Other H1",
				),
			]),
		];
		const expected = [
			new Paragraph([new Text("This is a")]),
			new Header(
				1,
				[new Text("H1 header")],
				[
					new Paragraph([new Text("h1 content")]),
					new Header(
						2,
						[new Text("H2 header")],
						[new Paragraph([new Text("h2 content")])],
					),
				],
			),
			new Header(1, [new Text("Other H1")], []),
		];
		expect(make_heading_tree(markdown)).toEqual(expected);
	});
	test("test inline math", () => {
		const text_to_parse = new Text("This is a text with $\\sum${label}");
		const expected: node[] = [
			new Text("This is a text with "),
			new InlineMath("\\sum", "label"),
		];
		expect(
			split_inline<InlineMath>(
				[text_to_parse],
				InlineMath.regexp,
				InlineMath.build_from_match,
			),
		).toEqual(expected);
	});
	test("test emphasis", () => {
		const text_to_parse = new Text(
			"This is a text with *emphasis* and _emphasis again_ for the $\\sum$",
		);
		const expected: node[] = [
			new Text("This is a text with "),
			new Emphasis("emphasis"),
			new Text(" and "),
			new Emphasis("emphasis again"),
			new Text(" for the $\\sum$"),
		];
		expect(
			split_inline<Emphasis>(
				[text_to_parse],
				Emphasis.regexp,
				Emphasis.build_from_match,
			),
		).toEqual(expected);
	});
	test("test strong", () => {
		const text_to_parse = new Text(
			"This is a text with **strong** and __strong again__ for the $\\sum$",
		);
		const expected: node[] = [
			new Text("This is a text with "),
			new Strong("strong"),
			new Text(" and "),
			new Strong("strong again"),
			new Text(" for the $\\sum$"),
		];
		expect(
			split_inline<Strong>(
				[text_to_parse],
				Strong.regexp,
				Strong.build_from_match,
			),
		).toEqual(expected);
	});
	// test wikilink
	test("test wikilink", () => {
		const text_to_parse = new Text(
			"This is a text with [[wikilink#header|display text]]",
		);
		const expected: node[] = [
			new Text("This is a text with "),
			new Wikilink(undefined, "wikilink", "header", "display text"),
		];
		expect(
			split_inline<Wikilink>(
				[text_to_parse],
				Wikilink.regexp,
				Wikilink.build_from_match,
			),
		).toEqual(expected);
	});
	test("test parse_all_inline", () => {
		const text_to_parse = new Text(
			"This is a text with **strong** and _emphasis again_ for the $\\sum$",
		);
		const expected: node[] = [
			new Text("This is a text with "),
			new Strong("strong"),
			new Text(" and "),
			new Emphasis("emphasis again"),
			new Text(" for the "),
			new InlineMath("\\sum"),
		];
		expect(parse_inline([text_to_parse])).toEqual(expected);
	});
	test("test explicit environment", () => {
		const markdown = [
			new Paragraph([
				new Text("This is the\nlemma::\nI say things\n::lemma"),
			]),
		];

		const expected = 
			[
				new Paragraph([new Text("This is the")]),
				new Environment(
					[new Paragraph([new Text("I say things")])],
					"lemma",
				),
			];

		const new_markdown = split_display<Environment>(
			markdown,
			Environment.build_from_match,
			Environment.regexp,
		);

		expect(new_markdown).toEqual(expected);
	});
	test("general test", () => {
		// Make a full test with many elements, headers, inline and display.
		const markdown = `This is a text with **strong** and _emphasis_ for the $\\sum$
# Header 1
$$\\epsilon$$
## Header 2
### Header 3
content _emphasis_
## Header 2 again
$$\\sum$$ hi there.`;
		const expected = 
			[
				new Paragraph([
					new Text(`This is a text with `),
					new Strong("strong"),
					new Text(` and `),
					new Emphasis("emphasis"),
					new Text(` for the `),
					new InlineMath("\\sum"),
				]),
				new Header(
					1,
					[new Text("Header 1")],
					[
						new DisplayMath("\\epsilon"),
						new Header(
							2,
							[new Text("Header 2")],
							[
								new Header(
									3,
									[new Text("Header 3")],
									[
										new Paragraph([
											new Text("content "),
											new Emphasis("emphasis"),
										]),
									],
								),
							],
						),
						new Header(
							2,
							[new Text("Header 2 again")],
							[
								new DisplayMath("\\sum"),
								new Paragraph([new Text(" hi there.")]),
							],
						),
					],
				),
			]
		expect(parse_note(markdown).body).toEqual(expected);
	});
	// test('test parsing lists', () => {
	// To make tests we need to generalize the logic, because we need a loop to match lists.
	// })
});
