export class MDRoot implements display_node{
	children: display_node[];
	constructor(children: display_node[]){
		this.children = children;
	}
}

export class Header implements display_node{
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

export interface display_node{
}


export class DisplayCode implements display_node{
	language: string|undefined;
	executable: boolean;
	code: string;
	static regexp = /```(?:\s*({?)([a-zA-Z]+)(}?)\s*\n([\s\S]*?)|([\s\S]*?))```/
	static build_from_match(match: RegExpMatchArray): DisplayCode{
		if(match[4]!== undefined){
			const code = match[4]
			const executable = match[1] == "{" && match[3] == "}";
			const language = match[2] !== "" ? match[2] : undefined
			return new DisplayCode(code, language, executable);
		}else{
			const code = match[5]
			return new DisplayCode(code);
		}
	}
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

export class BlankLine implements display_node{
	static regexp = /\n\s*\n/
	static build_from_match(args:RegExpMatchArray): BlankLine{
		return new BlankLine();
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

export class DisplayMath implements display_node{
	// parent: display_node;
	latex: string;
	label: string|undefined;
	static regexp = /\$\$([\s\S]*?)\$\$(?:\s*?{([\s\S]*?)})?/;
	static build_from_match(args:RegExpMatchArray): DisplayMath{
		return new DisplayMath([args[1], args[2]]);
	}
	constructor(args: [string, string?]){
			this.latex = args[0]
			this.label = args[1]
	}
}

export default function parseMarkdown(markdown: string) {
	// const baseMD = new MDRoot([new Paragraph([new Text(markdown)])])
}

// The custom part is a regex and a constructor. So a regex, and function to get the object from the regex

export function split_display<ClassObj>(markdown: MDRoot, make_obj:(args:RegExpMatchArray) => ClassObj, class_regexp:RegExp): void {
	const new_display: display_node[] = [];
	for (const elt of markdown.children) {
		if (elt instanceof Paragraph) {
			console.assert(elt.elements.length == 1, "Paragraph should have only one element at this stage of parsing")
			console.assert(elt.elements[0] instanceof Text, "Paragraph should have only one text element at this stage of parsing")
			const inline_element = elt.elements[0];
				let current_match:RegExpMatchArray|null = null;
				while ((current_match = class_regexp.exec(inline_element.content)) !== null) {
					if (current_match.index == undefined) {
						throw new Error("current_match.index is undefined");		
					}
					const prev_chunk = inline_element.content.slice(0, current_match.index);
					if(prev_chunk.trim() != ""){
						new_display.push(new Paragraph([new Text(prev_chunk)]));
					}
					new_display.push(make_obj(current_match));
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
