// import { unified } from 'unified';
// import remarkParse from 'remark-parse';

import { match } from "assert";

// export const processor = unified()
//   .use(remarkParse)
//   .use(myObRemark)

export interface display_node{
	// parent: display_node|null;	
}

export interface display_container{
	children: display_node[];
}
export class MDRoot implements display_node, display_container{
	// parent:null;
	children: display_node[];
	constructor(children: display_node[]){
		// for(const child of children){
		// 	child.parent = this;
		// }
		this.children = children;
	}
}

export class Header implements display_node, display_container{
	// parent: MDRoot;
	children: display_node[];
	level:number;
	title: Paragraph;
	content: display_node[];
}

export class DisplayMath implements display_node{
	// parent: display_node;
	latex: string;
}

export class DisplayCode implements display_node{
	// parent: display_node;
	language: string;
	executable: boolean;
	code: string;
}

export class Paragraph implements display_node{
	elements: inline_node[];
	// parent: display_node|null;
	constructor(elements: inline_node[]){
		this.elements = elements;
		// this.parent = null;
	}
}

export interface inline_node{
	content:string
}

export class Text implements inline_node{
	content: string;
	constructor(content: string){
		this.content = content;
	}
}

export class Emphasis implements inline_node{
	content: string;
}

export class Strong implements inline_node{
	content: string;
}

export class inline_math implements inline_node{
	content: string;
}


export default function parseMarkdown(markdown: string) {
	const baseMD = new MDRoot([new Paragraph([new Text(markdown)])])
	split_by_blank_lines(baseMD)
	// split_by_heading(baseMD)

	// return processor.run(tree, (err, ast) => {
	//   if (err) throw err;
	//   console.log(ast);
	//   // Now you can manipulate the AST
	// });
}

export function split_by_blank_lines(markdown: MDRoot): void {
	const new_display: display_node[] = [];

	for (const elt of markdown.children) {
		if (elt instanceof Paragraph) {
			let new_inlines: inline_node[] = [];
			for (const inline_element of elt.elements) {
				if (inline_element instanceof Text) {
					const split_texts = inline_element.content.split(/\n\s*\n/).map((p: string) => {
						return new Text(p);
					});

					if (split_texts.length == 1) {
						new_inlines.push(inline_element);
						continue;
					}
					// At least one split happened
					for (const split_text of split_texts) {
						new_inlines.push(split_text);
						new_display.push(new Paragraph(new_inlines));
						new_inlines = [];
					}
				} else {
					new_inlines.push(inline_element);
				}
			}
			if (new_inlines.length > 0) {
				new_display.push(new Paragraph(new_inlines));
			}
		}else {
			new_display.push(elt);
		}
	}
	// for(const elt of new_display){
	// 	elt.parent = markdown;
	// }
	markdown.children = new_display;
}

// Uncomment the below for display equations
// export function new_split_display_equations(markdown: MDRoot): void {
// 	const new_display: display_node[] = [];

// 	for (const elt of markdown.children) {
// 		if (elt instanceof Paragraph) {
// 		let new_inlines: inline_node[] = [];
// 			for (const inline_element of elt.elements) {
// 				if (inline_element instanceof Text) {
// 					const displayMathRegex = /\$\$([\s\S]*?)\$\$/g;
// 					// Not trusted, check that the stuff below actually captrues the equation.
// 					const splitTexts = inline_element.content.split(displayMathRegex).map((p: string) => {
// 						if (p.match(displayMathRegex)) {
// 							// Handle display math
// 							const displayMathContent = p.replace(displayMathRegex, "$1");
// 							// Store the display math content in a variable or process it further
// 							// ...
// 						} else {
// 							// Handle regular text
// 							return { type: "text", content: p };
// 						}
// 					});
// 					const split_texts = inline_element.content.split(/\n\s*\n/).map((p: string) => {
// 						return { type: "text", content: p };
// 					});

// 					if (split_texts.length == 1) {
// 						new_inlines.push(inline_element);
// 						continue;
// 					}
// 					// At least one split happened
// 					for (const split_text of split_texts) {
// 						new_inlines.push(split_text);
// 						new_display.push(new Paragraph(new_inlines, markdown));
// 						new_inlines = [];
// 					}
// 				} else {
// 					new_inlines.push(inline_element);
// 				}
// 			}
// 		}else {
// 			new_display.push(elt);
// 		}
// 	}
// 	markdown.children = new_display;
// }

// Headings
// function split_text_by_heading(elt:tree_elt):void{
// 	if(elt.kind == "text"){
// 		const headingRegex = /^\s*# (.*)\n/gm;
// 		const new_elts:tree_elt[] = []
// 		let nextmatch;
// 		let prevendindex = 0;
// 		let current_heading:tree_elt|undefined;
// 		let has_current_heading = false;
// 		while ((nextmatch = headingRegex.exec(elt.content)) !== null) {
// 			const headingText = nextmatch[1];
// 			const prev_chunk = elt.content.slice(prevendindex, nextmatch.index);
// 			prevendindex = nextmatch.index + nextmatch[0].length;
// 			if(prev_chunk.trim() != ""){
// 				const textnode:tree_elt = {kind: "text", inline: true, parent: elt.parent, sibling_index: 0, children: [], content = prev_chunk}
// 				if(current_heading != undefined){
// 					current_heading.children.push(textnode)
// 				}else {
// 					current_heading = {kind: "heading", inline: false, parent: elt.parent, sibling_index: 0, children: [], content = headingText}
// 					has_current_heading = true;
// 					new_elts.push(textnode)
// 				}
// 			}	
// 			new_elts.push(current_heading)	
// 		}
// 	}
// }
