import parseMarkdown, { MDRoot, Paragraph, Text, Header, split_by_blank_lines } from '../src/parseMarkdown';

describe('split_by_blank_lines', () => {
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
            new Paragraph([new Text(' paragraph.')]),
        ]);

        split_by_blank_lines(markdown);

        expect(markdown).toEqual(expected);
    });
});

// describe('split_by_heading', () => {
//     test('should split paragraphs by headings', () => {
//         const markdown:md = {
//             type: "md",
//             content: [
//                 {
//                     type: 'paragraph',
//                     content: [
//                         {
//                             type: 'text',
//                             content: `This is the first
//                              paragraph. Here is
//     # Heading first
// And some stuff
// # Heading second
// hello`,
//                         },
//                     ],
//                 },
//                 {
//                     type: 'paragraph',
//                     content: [
//                         {
//                             type: 'text',
//                             content: `This is the
                              

//                             second paragraph.`,
//                         },
//                     ],
//                 },
//             ],
//         };

//         const expected:md = {
//             type: "md",
//             content: [
//                 {
//                     type: 'paragraph',
//                     content: [
//                         {
//                             type: 'text',
//                             content: `This is the first
//                              paragraph. Here is`,
//                         },
//                     ],
//                 },
//                 {
//                     type: 'heading',
//                     content:  {
//                         text: 'Heading first',
//                         level: 1,
//                     }, 
//                 },
//                 {
//                     type: 'paragraph',
//                     content: [
//                         {
//                             type: 'text',
//                             content: `And some stuff`,
//                         },
//                     ],
//                 },
//                 {
//                     type: 'heading',
//                     content:  {
//                         text: 'Heading second',
//                         level: 1,
//                     }, 
//                 },
//                 {
//                     type: 'paragraph',
//                     content: [
//                         {
//                             type: 'text',
//                             content: 'hello'
//                         }]
//                 },
//                 {
//                     type: 'paragraph',
//                     content: [
//                         {
//                             type: 'text',
//                             content: `This is the
                              

//                             second paragraph.`,
//                         },
//                     ],
//                 },
//             ],
//         };

//         split_by_heading(markdown);

//         expect(markdown).toEqual(expected);
//     });
// });