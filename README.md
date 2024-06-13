# Obsidian to LaTeX Math Academic Paper Exporter
This project exports an Obsidian note to a LaTeX math academic paper, retaining embeds as proofs and results. The main feature is to embed contents through Obsidian wikilinks from other local files.

This program takes a single obsidian-style markdown note and converts it to latex. If the note has a header named "Body", it will take the content below that header instead. The program will convert obsidian elements to latex elements.
## Supported Elements
Most markdown elements that you can find in obsidian are supported. 
### Markdown headers 
h1 headers become Latex sections h2 and onwards become subsections.

### Mathjax Math
Obsidian-style math is recognized. Anything `$inline_math$`and `$$ display_math$$`. These are rendered by default with the `\begin{equation*}` environment. If an `align` or `align*` environment is within dollar signs, it will be rendered using the corresponding environment instead.

### Note Embeds
Transcribes the content of note referred to by an embed link at the location of the link, in a way that matches what is seen in the reading view. The transcription is recursive; an embed in an embed will be embedded. Embeddings of sections of notes will also be embedded.

### Latex Environments
Results, remarks, proofs, lemmas and corollaries can be generated by specifying breadcrumbs-like attributes in front of the link. It takes the form `<environment_name>::![[FILE_NAME]]` on a new line. The embedded content will be inserted inside of a "environment" latex environment, where "environment".

### Internal References
Standard wikilinks will be converted to an `\autoref{}`. It will reference a latex section which was generated from the same note that is referenced by the wikilink. In case there is no embedded content matching it, it will create a dead reference.

### Figures
Figures are created from embed links referencing an image file. They are recognized by their file suffix. A caption can be added by putting it in the display section of the link: `![[image.jpeg|caption text here]]`.

Images will be copied to a folder "Files" in the output latex folder.

### Citations
Citations are wikilinks starting with the '@' character. Markdown citations are also supported. Citations can also have labels, in which case they look like `[<label>][[@<bibtex_key_1>]][[@<bibtex_key_2>]]` and gives an output of `\cite[<label>]{<bibtex_key_1>, <bibtex_key_2>}`.

This item is made to work with either markdown citations or either the "Zotero Integration" or the "Citations" plugin in Obsidian. Support is only tested for the wikilink format.

## Markdown Note Structure

I suggest to put each relevant result into its own note with a h1 header "statement" and one h1 header "Proof"; and possibly one #Remark.

To omit information at the end of files, use a line break `---`, and insert the information after. Only dashed line breaks will be considered for this.
# Other projects
See also the Obsidian-to-latex repository in python for an alternative implementation with a different focus.
