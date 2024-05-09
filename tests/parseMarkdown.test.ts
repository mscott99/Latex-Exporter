import {DisplayMath, split_display_equations, split_display_code, DisplayCode, MDRoot, Paragraph, Text, Header, split_by_blank_lines } from '../src/parseMarkdown';

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
            new Paragraph([new Text(' paragraph.')]),
        ]);

        split_by_blank_lines(markdown);

        expect(markdown).toEqual(expected);
    });
    test('check equation splitting', () => {
        const markdown = new MDRoot([
            new Paragraph([new Text('This is the\$\$hi\n\$\$ first and \n\$\$ \$ all \\sum_{} \$\$ paragraph.\$\$')]),
        ]);

        const expected = new MDRoot([
            new Paragraph([new Text('This is the')]),
            new DisplayMath('hi\n'),
            new Paragraph([new Text(' first and \n')]),
            new DisplayMath(' \$ all \\sum_{} '),
            new Paragraph([new Text(' paragraph.\$\$')]),
        ]);

        split_display_equations(markdown);

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

        split_display_code(markdown);

        expect(markdown).toEqual(expected);
    }) 
});
