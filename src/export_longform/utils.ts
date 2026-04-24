import { TFile, Notice } from "obsidian";

export const collected_warnings: string[] = [];

export function notice_and_warn(message: string) {
	message = "Warning:\n"+ message
	collected_warnings.push(message);
	new Notice(message);
	console.warn(message);
}
export function escape_latex(input: string) {
	return input
		.replace(/\\(?=\s|\d)/g, "\\textbackslash")
		.replace(/\{/g, "\\{")
		.replace(/\}/g, "\\}")
		.replace(/%/g, "\\%")
		.replace(/&/g, "\\&")
		.replace(/#/g, "\\#")
		.replace(/\$/g, "\\$")
		.replace(/_/g, "\\_")
		.replace(/\^/g, "\\^{}")
		.replace(/</g, "$<$")
		.replace(/>/g, "$>$")
		.replace(/\|/g, "$|$")
		.replace(/∞/g, "$\\infty$")
		.replace(/±/g, "$\\pm$")
		.replace(/×/g, "$\\times$")
		.replace(/÷/g, "$\\div$")
		.replace(/≠/g, "$\\neq$")
		.replace(/≤/g, "$\\leq$")
		.replace(/≥/g, "$\\geq$")
		.replace(/≈/g, "$\\approx$")
		.replace(/√/g, "$\\sqrt{}$")
		.replace(/∑/g, "$\\sum$")
		.replace(/∏/g, "$\\prod$")
		.replace(/∫/g, "$\\int$")
		.replace(/α/g, "$\\alpha$")
		.replace(/β/g, "$\\beta$")
		.replace(/γ/g, "$\\gamma$")
		.replace(/δ/g, "$\\delta$")
		.replace(/ε/g, "$\\epsilon$")
		.replace(/θ/g, "$\\theta$")
		.replace(/λ/g, "$\\lambda$")
		.replace(/μ/g, "$\\mu$")
		.replace(/π/g, "$\\pi$")
		.replace(/σ/g, "$\\sigma$")
		.replace(/φ/g, "$\\phi$")
		.replace(/ω/g, "$\\omega$")
		.replace(/€/g, "\\euro{}")
		.replace(/£/g, "\\pounds{}")
		.replace(/¥/g, "\\yen{}")
		.replace(/¢/g, "\\cent{}")
		.replace(/©/g, "\\copyright{}")
		.replace(/®/g, "\\textregistered{}")
		.replace(/™/g, "\\texttrademark{}")
		.replace(/…/g, "\\ldots{}")
		.replace(/—/g, "---")
		.replace(/–/g, "--")
		.replace(/†/g, "\\dagger{}")
		.replace(/‡/g, "\\ddagger{}")
		.replace(/¶/g, "\\P{}")
		.replace(/§/g, "\\S{}")
		.replace(/•/g, "\\textbullet{}")
		.replace(/✓/g, "\\checkmark{}")
		.replace(/→/g, "$\\rightarrow$")
		.replace(/←/g, "$\\leftarrow$")
		.replace(/↑/g, "$\\uparrow$")
		.replace(/↓/g, "$\\downarrow$")
		.replace(/↔/g, "$\\leftrightarrow$")
		.replace(/⇒/g, "$\\Rightarrow$")
		.replace(/⇐/g, "$\\Leftarrow$")
		.replace(/⇔/g, "$\\Leftrightarrow$")
		.replace(/∀/g, "$\\forall$")
		.replace(/∃/g, "$\\exists$")
		.replace(/∅/g, "$\\emptyset$")
		.replace(/∈/g, "$\\in$")
		.replace(/∉/g, "$\\notin$")
		.replace(/⊂/g, "$\\subset$")
		.replace(/⊃/g, "$\\supset$")
		.replace(/⊆/g, "$\\subseteq$")
		.replace(/⊇/g, "$\\supseteq$")
		.replace(/∩/g, "$\\cap$")
		.replace(/∪/g, "$\\cup$")
		.replace(/∆/g, "$\\Delta$")
		.replace(/∇/g, "$\\nabla$")
		.replace(/∂/g, "$\\partial$")
		.replace(/ℕ/g, "$\\mathbb{N}$")
		.replace(/ℤ/g, "$\\mathbb{Z}$")
		.replace(/ℚ/g, "$\\mathbb{Q}$")
		.replace(/ℝ/g, "$\\mathbb{R}$")
		.replace(/ℂ/g, "$\\mathbb{C}$")
		.replace(/°/g, "$^{\\circ}$")
		.replace(/‰/g, "\\perthousand{}")
		.replace(/‽/g, "\\textinterrobang{}")
		.replace(/“/g, "``")
		.replace(/”/g, "''")
		.replace(/‘/g, "`")
		.replace(/’/g, "'")
		.replace(/\u00A0/g, '~') // non-breaking space
		.replace(/\u00AD/g, '\-') // soft hyphen
		.replace(/\u200B/g, '') // zero-width space
		.replace(/\u200C/g, '') // zero-width non-joiner
		.replace(/\u200D/g, '') // zero-width joiner (remove, as it may not be needed)
		.replace(/\uFEFF/g, '') // zero-width no-break space / BOM
}

export function find_image_file(
	find_file: (address: string) => TFile | undefined,
	address: string,
): TFile | undefined {
	const matchExcalidraw = /^.*\.excalidraw$/.exec(address);
	if (matchExcalidraw !== null) {
		address = matchExcalidraw[0] + ".png";
	}
	return find_file(address);
}

export function strip_newlines(thestring: string): string {
	const result = /^(?:(?:\s*?)\n)*(.*?)(?:\n(?:\s*?))?$/s.exec(thestring);
	if (result === null) {
		throw new Error("result is undefined");
	}
	return result[1];
}
