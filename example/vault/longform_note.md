---
title: An example of how to use this plugin.
author: Matthew Scott
---
# Abstract
This is the abstract. The abstract needs only be placed under an header named "Abstract" in the longform note.
# Body
## Introduction
Most of the introduction is in another note. We embed its contents without creating a latex environment.

![[introduction#The good part of the good intro]]
## Literature review
We cite as follows: [[@vershyninHighDimensionalProbabilityIntroduction2018]]. A *textcite* cand be also used: the book is by [txt][[@vershyninHighDimensionalProbabilityIntroduction2018]]. Specific results can be referenced: [Example 5.4][[@vershyninHighDimensionalProbabilityIntroduction2018]]. Multi-citations are also supported: [[@berkCoherenceParameterCharacterizing2022]][[@berkModeladaptedFourierSampling2023]].

Alternatively, pandoc syntax also works, though you may want to set the default citation command to *textcite* in the plugin settings. @vershyninHighDimensionalProbabilityIntroduction2018, [-@vershyninHighDimensionalProbabilityIntroduction2018], @vershyninHighDimensionalProbabilityIntroduction2018[Example 2.1], @berkCoherenceParameterCharacterizing2022;@berkModeladaptedFourierSampling2023, and then @vershyninHighDimensionalProbabilityIntroduction2018.
## Main results
Here is an equation that we can reference.
$$1+1 = 2$$
{#eq-main}
lemma::{#lem-explicit}
We reference the equation: @eq-main and the result: @lem-explicit.
$$
\begin{align}
  1+1 & = 1+3-2\\
& = 2
\end{align}
$$
{#eq-aligned_eq}
We can reference individual lines of an align environment: @eq-aligned_eq-1 and @eq-aligned_eq-2.
::lemma
The next result is in its own note. Embedding the 'Statement' header as follows creates a latex environment.
theorem::![[theorem_1#Statement]]
We can link to [[theorem_1#Proof]] with a wikilink to the "Proof" header.
The theorem environment is then referenced as [[theorem_1]], or as [[theorem_1#Statement]]. To show [[theorem_1]], we need the following two results.
lemma::![[lemma_1#statement]]
We defer [[lemma_1#Proof]] to the appendix.
lemma::![[other_small_lemmas#First other lemma]]
We can use lists. Also, results can live in the same note under different headers. We embedded two results from the same note: 
1. The first is [[other_small_lemmas#First other lemma]].
2. The other,[[other_small_lemmas#Second other lemma]].

There are also options for comments.
%%This will not be exported at all%%
> This will become a comment in the latex export.
## Proofs
We are ready to prove our main result. We can embed proof environments from other notes. References to the correct results in the header of the proof are generated automatically.
proof::![[theorem_1#Proof]]
### Sub-section for proofs
There can be nested sections, which can be referenced via wikilinks from anywhere.
## Numerics
Behold! Figures with captions are supported! The relevant files will be copied over with the export.
![[intro_comp_wlabel.pdf|Captions of figures are specified in the display part of the figure's embed wikilink.]]
We can reference the figures with a wikilink [[intro_comp_wlabel.pdf]].
## Other features
External link: [google.com](https://www.google.com).
# Appendix
proof::![[lemma_1#Proof]]
