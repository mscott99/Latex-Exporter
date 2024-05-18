import {DisplayMath, split_display, make_heading_tree, EmbedWikilink, DisplayCode, MDRoot, Paragraph, Text, Header, BlankLine} from '../src/parseMarkdown';

describe('split_display_blocks', () => {
    test('should split paragraphs by blank lines', () => {
        const markdown = new MDRoot([
            new Paragraph([new Text('This is the first paragraph.')]),
            new Paragraph([new Text('This is the second\n paragraph.')]),
            new Paragraph([new Text('This is the third\n    \n paragraph.')]),
        ]);

        const expected = new MDRoot([
            new Paragraph([new Text('This is the first paragraph.')]),
            new Paragraph([new Text('This is the second\n paragraph.')]),
            new Paragraph([new Text('This is the third')]),
			new BlankLine(),
            new Paragraph([new Text(' paragraph.')]),
        ]);

        const new_markdown = split_display<BlankLine>(markdown, BlankLine.build_from_match, BlankLine.regexp);

        expect(new_markdown).toEqual(expected);
    });
    test('check equation splitting', () => {
        const markdown = new MDRoot([
            new Paragraph([new Text('This is the\$\$hi\n\$\${eq-label} first and \n\$\$ \$ all \\sum_{} \$\$ paragraph.\$\$')]),
        ]);

        const expected = new MDRoot([
            new Paragraph([new Text('This is the')]),
            new DisplayMath('hi\n', "eq-label"),
            new Paragraph([new Text(' first and \n')]),
            new DisplayMath(' \$ all \\sum_{} ', undefined),
            new Paragraph([new Text(' paragraph.\$\$')]),
        ]);

        const new_markdown = split_display<DisplayMath>(markdown, DisplayMath.build_from_match, DisplayMath.regexp);

        expect(new_markdown).toEqual(expected);
    }) 

    test('check display code', () => {
        const markdown = new MDRoot([
            new Paragraph([new Text('This is the ```hi this is\ncode``` first and ``` {python}\n more code``` all')]),
        ]);

        const expected = new MDRoot([
            new Paragraph([new Text('This is the ')]),
            new DisplayCode('hi this is\ncode'),
            new Paragraph([new Text(' first and ')]),
            new DisplayCode(' more code', "python", true),
            new Paragraph([new Text(' all')]),
        ]);

        const new_markdown = split_display<DisplayCode>(markdown, DisplayCode.build_from_match, DisplayCode.regexp);

        expect(new_markdown).toEqual(expected);
    }) 
	test('test embed wikilink', () => {
		const markdown = new MDRoot([
			new Paragraph([new Text('This is a ![[wikilink]]')]),
		]);
		const expected = new MDRoot([
			new Paragraph([new Text('This is a ')]),
			new EmbedWikilink(undefined, 'wikilink', undefined, undefined),
		]);
		const new_markdown = split_display<EmbedWikilink>(markdown, EmbedWikilink.build_from_match, EmbedWikilink.regexp);
		expect(new_markdown).toEqual(expected);
	})
	test('test header tree', () => {
		const markdown = new MDRoot([
			new Paragraph([new Text('This is a\n# H1 header\nh1 content\n## H2 header\nh2 content\n# Other H1')]),
		]);
		const expected = new MDRoot([
			new Paragraph([new Text('This is a')]),
			new Header(1, [new Text("H1 header")], 
				[
					new Paragraph([new Text("h1 content")]),
					new Header(2, [new Text("H2 header")], [
						new Paragraph([new Text("h2 content")])]),
			]),
			new Header(1, [new Text("Other H1")], []),
		])
		expect(make_heading_tree(markdown)).toEqual(expected);
	})
	// test('test parsing lists', () => {
		// To make tests we need to generalize the logic, because we need a loop to match lists.
	// })
});
