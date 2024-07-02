export function get_header_tex() {
	return `\\usepackage{amsmath}
\\usepackage{amsthm}
\\usepackage{aliascnt}
\\usepackage{biblatex}
\\usepackage{graphicx}
\\usepackage{hyperref}

\\theoremstyle{plain}
\\newtheorem{theorem}{Theorem}[section]

% \\newtheorem{prop}{Proposition}[section]
% \\newtheorem{coro}{Corollary}
% \\newtheorem{lem}{Lemma}

\\renewcommand{\\sectionautorefname}{Section} % name for \\autoref
\\renewcommand{\\subsectionautorefname}{Section} % name for \\autoref
\\renewcommand{\\subsubsectionautorefname}{Section} % name for \\autoref

% prop
\\newaliascnt{proposition}{theorem}% alias counter "<newTh>"
\\newtheorem{proposition}[proposition]{Proposition}
\\aliascntresetthe{proposition}
\\providecommand*{\\propositionautorefname}{Proposition} % name for \\autoref

% coro
\\newaliascnt{corollary}{theorem}% alias counter "<newTh>"
\\newtheorem{corollary}[corollary]{Corollary}
\\aliascntresetthe{corollary}
\\providecommand*{\\corollaryautorefname}{Corollary} % name for \\autoref

% lem
\\newaliascnt{lemma}{theorem}% alias counter "<newTh>"
\\newtheorem{lemma}[lemma]{Lemma}
\\aliascntresetthe{lemma}
\\providecommand*{\\lemmaautorefname}{Lemma} % name for \\autoref


\\theoremstyle{definition}
\\newtheorem{definition}{Definition}[section]
\\newtheorem{example}{Example}


\\theoremstyle{remark}
\\newtheorem{rmk}{Remark}[section]
\\newtheorem{fact}[rmk]{Fact}
\\newtheorem*{rmk*}{Remark}
\\newtheorem*{fact*}{Fact}

\\newenvironment{remark}
{\\pushQED{\\qed}\\renewcommand{\\qedsymbol}{$\\diamond$}\\rmk}
{\\popQED\\endrmk}

\\providecommand*{\\remarkautorefname}{Remark} % name for \\autoref
\\providecommand*{\\rmkautorefname}{Remark} % name for \\autoref
\\providecommand*{\\definitionautorefname}{Definition} % name for \\autoref`;
}
