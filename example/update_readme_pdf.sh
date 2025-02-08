cd ~/Obsidian/myVault/.obsidian/plugins/Latex-Exporter/example/
pdftoppm -png ./vault/longform_note/longform_note_output.pdf ./export/longform_note_output
cp ./vault/longform_note/longform_note_output.pdf ./export
rm -r ./export/longform_note
cp -r ./vault/longform_note ./export/longform_note
ls ./export/longform_note/
rm ./export/longform_note/*.pdf
rm ./export/longform_note/*.synctex.gz
rm ./export/longform_note/*.run.xml
rm ./export/longform_note/*.log
rm ./export/longform_note/*.out
rm ./export/longform_note/*.fls
rm ./export/longform_note/*.fdb_latexmk
rm ./export/longform_note/*.blg
rm ./export/longform_note/*.bcf
rm ./export/longform_note/*.bbl
rm ./export/longform_note/*.aux
