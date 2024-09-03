---
type: conferencePaper
year: 2023
authors: [Aaron Berk, Simone Brugiapaglia, Yaniv Plan, Matthew Scott, Xia Sheng, Ozgur Yilmaz]
conference: "NeurIPS 2023 Workshop on Deep Learning and Inverse Problems"
title: "Model-adapted Fourier sampling for generative compressed sensing"

ctime: 2024-08-20
mtime: 2024-08-20
---
#literature
# Model-adapted Fourier sampling for generative compressed sensing
url::https://openreview.net/forum?id=RV4bTQfLW4
See the PDF: [Full Text PDF](zotero://select/library/items/5ZHPNG9Z)
## Literature Note
%% begin notes %%%% end notes %%
## Zotero Annotations

## Abstract
We study generative compressed sensing when the measurement matrix is randomly subsampled from a unitary matrix (with the DFT as an important special case). It was recently shown that $O(kdn\lVert \boldsymbol{\alpha}\rVert_{\infty}^{2})$ uniformly random Fourier measurements are sufficient to recover signals in the range of a neural network $G:\mathbb{R}^k \to \mathbb{R}^n$ of depth $d$, where each component of the so-called local coherence vector $\boldsymbol{\alpha}$ quantifies the alignment of a corresponding Fourier vector with the range of $G$. We construct a model-adapted sampling strategy with an improved sample complexity of $\mathcal{O}(kd\lVert \boldsymbol{\alpha}\rVert_{2}^{2})$ measurements. This is enabled by: (1) new theoretical recovery guarantees that we develop for nonuniformly random sampling distributions and then (2) optimizing the sampling distribution to minimize the number of measurements needed for these guarantees. This development offers a sample complexity applicable to natural signal classes, which are often almost maximally coherent with low Fourier frequencies. Finally, we consider a surrogate sampling scheme, and validate its performance in recovery experiments using the CelebA dataset.

%% Import Date: 2024-08-20T16:31:41.331-07:00 %%
