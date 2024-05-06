import { split_by_blank_lines, md } from '../src/parseMarkdown';

describe('split_by_blank_lines', () => {
    test('should split paragraphs by blank lines', () => {
        const markdown:md = {
            type: "md",
            content: [
                {
                    type: 'heading',
                    content:  {
                        text: 'heading',
                        level: 1,
                    }, 
                },
                {
                    type: 'paragraph',
                    content: [
                        {
                            type: 'text',
                            content: `This is the first
                             paragraph.`,
                        },
                    ],
                },
                {
                    type: 'paragraph',
                    content: [
                        {
                            type: 'text',
                            content: `This is the
                              

                            second paragraph.`,
                        },
                    ],
                },
                {
                    type: 'paragraph',
                    content: [
                        {
                            type: 'text',
                            content: 'This is the third paragraph.',
                        },
                    ],
                },
            ],
        };

        const expected:md = {
            type: "md",
            content: [
                {
                    type: 'heading',
                    content:  {
                        text: 'heading',
                        level: 1,
                    }, 
                },
                {
                    type: 'paragraph',
                    content: [
                        {
                            type: 'text',
                            content: `This is the first
                             paragraph.`,
                        },
                    ],
                },

                {
                    type: 'paragraph',
                    content: [
                        {
                            type: 'text',
                            content: 'This is the'
                        }]
                },
                {
                    type: 'paragraph',
                    content: [
                        {
                            type: 'text',
                            content: '                            second paragraph.',
                        },
                    ],
                },
                {
                    type: 'paragraph',
                    content: [
                        {
                            type: 'text',
                            content: 'This is the third paragraph.',
                        },
                    ],
                },
            ],
        };

        split_by_blank_lines(markdown);

        expect(markdown).toEqual(expected);
    });
});