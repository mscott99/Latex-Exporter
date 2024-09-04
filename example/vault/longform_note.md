---
title: "An example of how to use this plugin"
author: "Matthew Scott"
---
# Abstract
This is the abstract.
# Body
## Introduction
![[introduction#The good part of the good intro]]
## Literature review
We cite [[@vershyninHighDimensionalProbabilityIntroduction2018]] because it is a good book. It is by [txt][[@vershyninHighDimensionalProbabilityIntroduction2018]]. Specifically, see [Example 5.4][[@vershyninHighDimensionalProbabilityIntroduction2018]]. Other relevant sources are [[@berkCoherenceParameterCharacterizing2022]][[@berkModeladaptedFourierSampling2023]].
## Main results
Here is an equation that we can reference.
$$1+1 = 2$${#eq-main}
lemma::{#lem-explicit}
We could say that
$$1+1  = 2$$
as in @eq-main, but we will not.
$$
\begin{align}
  1+1 & = 1+3-2\\
& = 2
\end{align}
$${#eq-aligned_eq}
Notice that @eq-aligned_eq-1 and @eq-aligned_eq-2 follows from arithmetic.

::lemma
Since @lem-explicit failed to help us, we employ the following result.
theorem::![[theorem_1#Statement]]
See [[theorem_1#Proof]]. To prove [[theorem_1]], we need the following two results.
lemma::![[lemma_1#statement]]
We defer [[lemma_1#Proof]] to the appendix.
lemma::![[other_small_lemmas#First other lemma]]
We can reference: 
1. [[other_small_lemmas#First other lemma]] and 
2. The other,[[other_small_lemmas#Second other lemma]].

%%This will not be exported at all%%
> This will become a comment in latex.
## Proofs
We are ready to prove our main result.
proof::![[theorem_1#Proof]]
## Numerics
Behold!
![[intro_comp_wlabel.pdf|Notice that this is a great plot.]]
We can reference the above [[intro_comp_wlabel.pdf]].
# Appendix
proof::![[lemma_1#Proof]]
