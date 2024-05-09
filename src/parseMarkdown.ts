export interface display_node{
	// parent: display_node|null;	
}

export interface display_container{
	children: display_node[];
}
export class MDRoot implements display_node, display_container{
	children: display_node[];
	constructor(children: display_node[]){
		// for(const child of children){
		// 	child.parent = this;
		// }
		this.children = children;
	}
}

export class Header implements display_node, display_container{
	children: display_node[];
	level:number;
	title: Paragraph;
	content: display_node[];
	constructor(level:number, title: Paragraph, content: display_node[]){
		this.level = level;
		this.title = title;
		this.content = content;
	}
}

export class DisplayMath implements display_node{
	// parent: display_node;
	latex: string;
	constructor(latex: string){
		this.latex = latex;
	}
}

export class DisplayCode implements display_node{
	language: string|undefined;
	executable: boolean;
	code: string;
	constructor(code: string, language?: string, executable: boolean = false){
		this.code = code;
		this.language = language;
		this.executable = executable;
	}
}

export class Paragraph implements display_node{
	elements: inline_node[];
	constructor(elements: inline_node[]){
		this.elements = elements;
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
}

export function split_by_blank_lines(markdown: MDRoot): void {
	const new_display: display_node[] = [];
	for (const elt of markdown.children) {
		if (elt instanceof Paragraph) {
			console.assert(elt.elements.length == 1, "Paragraph should have only one element at this stage of parsing")
			console.assert(elt.elements[0] instanceof Text, "Paragraph should have only one text element at this stage of parsing")
			const inline_element = elt.elements[0];
			const split_texts = inline_element.content.split(/\n\s*\n/).map((p: string) => {
				return new Text(p);
			});
			for (const split_text of split_texts) {
				new_display.push(new Paragraph([split_text]));
			}
		}else {
			new_display.push(elt);
		}
	}
	markdown.children = new_display;
}

export function split_display_equations(markdown: MDRoot): void {
	const new_display: display_node[] = [];
	for (const elt of markdown.children) {
		if (elt instanceof Paragraph) {
			console.assert(elt.elements.length == 1, "Paragraph should have only one element at this stage of parsing")
			console.assert(elt.elements[0] instanceof Text, "Paragraph should have only one text element at this stage of parsing")
			const inline_element = elt.elements[0];
				const single_equation_match = /\$\$([\s\S]*?)\$\$/
				let current_match:RegExpMatchArray|null = null;
				while ((current_match = single_equation_match.exec(inline_element.content)) !== null) {
					if (current_match.index == undefined) {
						throw new Error("current_match.index is undefined");		
					}
					const prev_chunk = inline_element.content.slice(0, current_match.index);

					if(prev_chunk.trim() != ""){
						new_display.push(new Paragraph([new Text(prev_chunk)]));
					}
					const equation = current_match[1];
					new_display.push(new DisplayMath(equation));	
					inline_element.content = inline_element.content.slice(current_match.index + current_match[0].length);
				}
				// Last part of the text, or all of it if no match
				if(inline_element.content.trim() != ""){
					new_display.push(new Paragraph([new Text(inline_element.content)]));
				}
		}else {
			new_display.push(elt);
		}
	}
	markdown.children = new_display;
}


export function split_display_code(markdown: MDRoot): void {
	const new_display: display_node[] = [];
	for (const elt of markdown.children) {
		if (elt instanceof Paragraph) {
			console.assert(elt.elements.length == 1, "Paragraph should have only one element at this stage of parsing")
			console.assert(elt.elements[0] instanceof Text, "Paragraph should have only one text element at this stage of parsing")
			const inline_element = elt.elements[0];
			const single_code_match = /```(?:\s*({?)([a-zA-Z]+)(}?)\s*\n([\s\S]*?)|([\s\S]*?))```/

			let current_match:RegExpMatchArray|null = null;
			while ((current_match = single_code_match.exec(inline_element.content)) !== null) {
				if (current_match.index == undefined) {
					throw new Error("current_match.index is undefined");		
				}
				const prev_chunk = inline_element.content.slice(0, current_match.index);

				if(prev_chunk.trim() != ""){
					new_display.push(new Paragraph([new Text(prev_chunk)]));
				}
				
				if(current_match[4]!== undefined){
					const code = current_match[4]
					const executable = current_match[1] == "{" && current_match[3] == "}";
					const language = current_match[2] !== "" ? current_match[2] : undefined
					new_display.push(new DisplayCode(code, language, executable));	
				}else{
					const code = current_match[5]
					new_display.push(new DisplayCode(code));	
				}
				inline_element.content = inline_element.content.slice(current_match.index + current_match[0].length);
			}
			// Last part of the text, or all of it if no match
			if(inline_element.content.trim() != ""){
				new_display.push(new Paragraph([new Text(inline_element.content)]));
			}
	}else {
			new_display.push(elt);
		}
	}
	markdown.children = new_display;
}


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
