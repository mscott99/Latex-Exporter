// import { unified } from 'unified';
// import remarkParse from 'remark-parse';

// export const processor = unified()
//   .use(remarkParse)
//   .use(myObRemark)


interface inline_elt{
	type:string;	
	content:any;
}

export type text = {
	type: "text";
	content:string;
}

export type paragraph = {
	type: "paragraph";
	content:inline_elt[]; 
}

export type heading = {
	type: "heading";
	content: {
		level:number;
		content:string;
	}
}

export type wikilink = {
	type: "wikilink";
	attribute:string;
	address:string;
	heading:string|null;
	display:string|null;
}

interface md_elt{
	type:string;
	content:any;
}

export type md = {
	type: "md";
	content: md_elt[];
}

export function split_by_blank_lines(markdown:md):void{
	const new_arr:md_elt[] = [];
	for (const elt of markdown.content) {
		if (elt.type !== "paragraph") {
			new_arr.push(elt);
			continue;
		}
		let inline_elts:inline_elt[] = [];
		for (const inline_element of elt.content){
			if (inline_element.type !== "text") {
				inline_elts.push(inline_element);
				continue;
			}
			const split_texts:text[] = inline_element.content.split(/\n\s*\n/).map((p:string) => {
				return {type:"text", content: p};
			})
			if(split_texts.length == 1){
				inline_elts.push(inline_element);
				continue;
			}
			// At least one split happened
			for (const split_text of split_texts){
				inline_elts.push(split_text);
				new_arr.push({type:"paragraph", content:inline_elts});
				inline_elts = [];
			}
		}
		if(inline_elts.length > 0){
			new_arr.push({type:"paragraph", content:inline_elts});
		}
	}
	markdown.content = new_arr;
}

// function split_by_heading(markdown:md)

export default function parseMarkdown(markdown: string) {
	const baseMD:md= {type:"md", content: [{type:"paragraph", content : markdown}]};
	split_by_blank_lines(baseMD)
	// split_by_heading(baseMD)

	// return processor.run(tree, (err, ast) => {
	//   if (err) throw err;
	//   console.log(ast);
	//   // Now you can manipulate the AST
	// });
}
