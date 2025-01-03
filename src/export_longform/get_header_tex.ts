export function get_header_tex() {
	return `\\usepackage{amsmath}
\\usepackage{amsthm}
\\usepackage{biblatex}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{cleveref}

\\theoremstyle{plain}
\\newtheorem{theorem}{Theorem}[section]
\\newtheorem{corollary}{Corollary}[section]
\\newtheorem{lemma}{Lemma}[section]
\\newtheorem{proposition}{Proposition}[section]

\\theoremstyle{definition}
\\newtheorem{definition}{Definition}[section]
\\newtheorem{example}{Example}

\\theoremstyle{remark}
\\newtheorem{rmk}{Remark}[section]
\\newtheorem{fact}[rmk]{Fact}
\\newtheorem*{rmk*}{Remark}
\\newtheorem*{fact*}{Fact}`;
}
