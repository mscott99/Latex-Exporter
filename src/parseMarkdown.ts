export class MDRoot implements display_node{
	level = 0;
	children: display_node[];
	constructor(children: display_node[]){
		this.children = children;
	}
}

export class Header implements display_node{
	children: display_node[];
	level:number;
	title: inline_node[];
	constructor(level:number, title: inline_node[], children: display_node[]){
		this.level = level;
		this.title = title;
		this.children = children;
	}
}

export interface display_node{
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

export class EmbedWikilink implements display_node{
	attribute: string|undefined;
	address: string;
	header: string|undefined;
	displayed: string|undefined;
	static regexp = /(?:::(\S*?))?!\[\[([\s\S]*?)(?:\#([\s\S]*?))?(?:\|([\s\S]*?))?\]\]/;
	static build_from_match(args:RegExpMatchArray): EmbedWikilink{
		return new EmbedWikilink(args[1], args[2], args[3], args[4]);
	}
	constructor(attribute:string|undefined, address: string, header: string|undefined, displayed: string|undefined){
		this.attribute = attribute;
		this.address = address;
		this.header = header;
		this.displayed = displayed;
	}
}

export class DisplayMath implements display_node{
	// parent: display_node;
	latex: string;
	label: string|undefined;
	static regexp = /\$\$([\s\S]*?)\$\$(?:\s*?{([\s\S]*?)})?/;
	static build_from_match(args:RegExpMatchArray): DisplayMath{
		return new DisplayMath(args[1], args[2]);
	}
	constructor(latex:string, label:string|undefined){
			this.latex = latex
			this.label = label
	}
}

export default function parseMarkdown(markdown: string) {
	// const baseMD = new MDRoot([new Paragraph([new Text(markdown)])])
}

// The custom part is a regex and a constructor. So a regex, and function to get the object from the regex
export function split_display<ClassObj>(markdown: MDRoot, make_obj:(args:RegExpMatchArray) => ClassObj, class_regexp:RegExp): MDRoot {
	const new_md = new MDRoot([]);
	const new_display:display_node[] = new_md.children;
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
	return new_md
}

function strip_newlines(thestring:string):string|null{
	const result = /^([\s\n]*)(.*?)([\s\n]*)$/.exec(thestring)
	if(result == null){
		return null
	}
	return result[2]
}


export function make_heading_tree(markdown:MDRoot):MDRoot{
	let headingRegex = /^(#+) (.*)$/gm;
	const new_md = new MDRoot([]);
	let header_stack:Header|MDRoot[] = [];
	header_stack.push(new_md)
	let new_display:display_node[] = new_md.children;
	let current_match:RegExpMatchArray|null;
	for (const elt of markdown.children) {
		if (elt instanceof Paragraph) {
			console.assert(elt.elements.length == 1, "Paragraph should have only one element at this stage of parsing")
			console.assert(elt.elements[0] instanceof Text, "Paragraph should have only one text element at this stage of parsing")
			const inline_element = elt.elements[0];
			let start_index = 0;
			while ((current_match = headingRegex.exec(inline_element.content))  !== null) {
				if (current_match.index == undefined) {
					throw new Error("current_match.index is undefined");
				}
				const prev_chunk = inline_element.content.slice(start_index, current_match.index);
				if(prev_chunk.trim() != ""){
					const return_string = strip_newlines(prev_chunk)
					if(return_string == null){
						throw new Error("return_string is null")
					}else{
						new_display.push(new Paragraph([new Text(return_string)]));
					}
				}
				
				// new_display.push(make_obj(current_match));
				for(let i = header_stack.length - 1; i >= 0; i--){
					const new_header = new Header(current_match[1].length, [new Text(current_match[2])], []);
					const level = new_header.level;
					if(level > header_stack[i].level){
						// We are at the index of the new parent.
						// header_stack = header_stack.slice(0, i + 1)
						header_stack.splice(i+1, header_stack.length - (i+1))
						header_stack[i].children.push(new_header);
						header_stack.push(new_header);
						new_display = new_header.children;
						break;
					}
				}
				start_index = current_match.index + current_match[0].length;
				// inline_element.content = inline_element.content.slice(current_match.index + current_match[0].length);
			}
			// possibility of a final piece of text after matches
			if(inline_element.content.slice(start_index).trim() != ""){
				const return_string = strip_newlines(inline_element.content.slice(start_index))
					if(return_string == null){
						throw new Error("return_string is null")
					}else{
						new_display.push(new Paragraph([new Text(return_string)]));
					}
			}
		}else {
			new_display.push(elt);
		}
	}
	return new_md;
}
