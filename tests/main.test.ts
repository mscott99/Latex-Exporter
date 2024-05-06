// FILEPATH: /Users/matthewscott/Obsidian/devVault/.obsidian/plugins/Paper-latex-export/tests/main.test.ts
// import {describe, expect, test} from '@jest/globals'; 
import parseMarkdown from '../src/parseMarkdown';
import * as fs from 'fs';

describe('test utils module', () => {
    const markdownPath = './tests/files/longform.md';
    const markdownString = fs.readFileSync(markdownPath, 'utf-8');

    // Use the markdownString as needed
	// https://emn178.github.io/online-tools/sha256.html
	test('Test markdown parsing', () => {
        const result = parseMarkdown(markdownString);
        console.log(result);
        console.log('done');
        console.log('done');
		// expect(genSha256FromStr('aaa'))
			// .toBe('9834876dcfb05cb167a5c24953eba58c4ac89b1adf57f28f2f9d09af107ee8f0');
	});
});