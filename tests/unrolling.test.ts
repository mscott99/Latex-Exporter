import {find_file} from '../src/utils'

describe('split_display_blocks', () => {
	test('should find the files', ()=>{
		expect(find_file("./tests/files/","lemma2")).toEqual("tests/files/subfolder/lemma2.md")
	})
});
