import {DisplayMath, split_display, DisplayCode, MDRoot, Paragraph, Text, Header, BlankLine} from '../src/parseMarkdown';

describe('split_display_blocks', () => {
    test('should split paragraphs by blank lines', () => {
        const markdown = new MDRoot([
            new Header(1, new Paragraph([new Text('Header 1')]), []),
            new Paragraph([new Text('This is the first paragraph.')]),
            new Paragraph([new Text('This is the second\n paragraph.')]),
            new Paragraph([new Text('This is the third\n    \n paragraph.')]),
        ]);

        const expected = new MDRoot([
            new Header(1, new Paragraph([new Text('Header 1')]), []),
            new Paragraph([new Text('This is the first paragraph.')]),
            new Paragraph([new Text('This is the second\n paragraph.')]),
            new Paragraph([new Text('This is the third')]),
			new BlankLine(),
            new Paragraph([new Text(' paragraph.')]),
        ]);

        split_display<BlankLine>(markdown, BlankLine.build_from_match, BlankLine.regexp);

        expect(markdown).toEqual(expected);
    });
    test('check equation splitting', () => {
        const markdown = new MDRoot([
            new Paragraph([new Text('This is the\$\$hi\n\$\${eq-label} first and \n\$\$ \$ all \\sum_{} \$\$ paragraph.\$\$')]),
        ]);

        const expected = new MDRoot([
            new Paragraph([new Text('This is the')]),
            new DisplayMath(['hi\n', "eq-label"]),
            new Paragraph([new Text(' first and \n')]),
            new DisplayMath([' \$ all \\sum_{} ']),
            new Paragraph([new Text(' paragraph.\$\$')]),
        ]);

        split_display<DisplayMath>(markdown, DisplayMath.build_from_match, DisplayMath.regexp);

        expect(markdown).toEqual(expected);
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

        split_display<DisplayCode>(markdown, DisplayCode.build_from_match, DisplayCode.regexp);

        expect(markdown).toEqual(expected);
    }) 
});
