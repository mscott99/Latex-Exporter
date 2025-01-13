import * as path from "path";
import {
	App,
	Editor,
	Notice,
	MarkdownView,
	MarkdownFileInfo,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	Modal,
	normalizePath,
} from "obsidian";
import {
	parse_longform,
	export_selection,
	write_without_template,
	write_with_template,
	get_header_tex,
	ExportPluginSettings,
	DEFAULT_SETTINGS,
	parsed_longform,
	notice_and_warn
} from "./export_longform";

export default class ExportPaperPlugin extends Plugin {
	settings: ExportPluginSettings;
	find_file = (address: string): TFile | undefined => {
		const temp_result = this.app.metadataCache.getFirstLinkpathDest(
			address,
			"/",
		);
		if (temp_result) {
			return temp_result;
		} else {
			return undefined;
		}
	};
	async find_files_and_export(
		active_file: TFile,
		settings: ExportPluginSettings,
	) {
		if (this.settings.base_output_folder === "") {
			this.settings.base_output_folder = "/";
		}
		const notes_dir = this.app.vault;
		const parsed_contents = await parse_longform(
			notes_dir.cachedRead.bind(notes_dir),
			this.find_file,
			active_file,
			settings,
		);

		let base_folder;
		if (parsed_contents.yaml["export_dir"] != null) {
			// console.log(parsed_contents.yaml["export_dir"] === "Shared/Exact_regularisation/exports")
			base_folder = this.app.vault.getFolderByPath(
				// parsed_contents.yaml["export_dir"],
				parsed_contents.yaml["export_dir"]
			);
		} else {
			base_folder = this.app.vault.getFolderByPath(
				this.settings.base_output_folder,
			);
		}
		if (!base_folder) {
			notice_and_warn(				"Output folder path not found, defaulting to the root of the vault.")
			base_folder = this.app.vault.getRoot();
		}
		const output_file_name = active_file.basename + "_output.tex";
		let output_folder_path = path.join(
			base_folder.path,
			active_file.basename.replace(/ /g, "_"),
		);
		const output_folder_match = /^\/(.*)$/.exec(output_folder_path);
		if (output_folder_match) {
			output_folder_path = output_folder_match[1];
		}
		let output_path = path.join(output_folder_path, output_file_name);
		await this.app.vault.createFolder(output_folder_path).catch((e) => e);
		// await this.create_folder_if_not(output_folder_path);
		const the_preamble_file = this.app.vault.getFileByPath(
			this.settings.preamble_file,
		);
		let export_message = "Exporting the current file:\n";
		const preamble_file = the_preamble_file ? the_preamble_file : undefined;
		if (preamble_file !== undefined) {
			const new_preamble = path.join(output_folder_path, "preamble.sty");
			const existing_preamble =
				this.app.vault.getFileByPath(new_preamble);
			if (!existing_preamble) {
				this.app.vault.copy(preamble_file, new_preamble);
				export_message += "- Copying the preamble file\n";
			} else if (this.settings.overwrite_preamble) {
				this.app.vault.delete(existing_preamble);
				this.app.vault.copy(preamble_file, new_preamble);
				export_message += "- Overwriting the preamble file\n";
			} else {
				export_message += "- Without overwriting the preamble file\n";
			}
		} else {
			export_message += " - Without a preamble file (none found)\n";
		}
		const header_file = this.app.vault.getFileByPath(
			path.join(output_folder_path, "header.tex"),
		);
		if (!header_file) {
			export_message += "- Creating the header file\n";
			await this.app.vault.create(
				path.join(output_folder_path, "header.tex"),
				get_header_tex(),
			);
		} else {
			export_message += "- Without overwriting the header file\n";
		}
		const the_bib_file = this.app.vault.getFileByPath(
			this.settings.bib_file,
		);
		const bib_file = the_bib_file ? the_bib_file : undefined;
		if (bib_file !== undefined) {
			const new_bib = path.join(output_folder_path, "bibliography.bib");
			if (!this.app.vault.getFileByPath(new_bib)) {
				export_message += "- Copying the bib file\n";
				this.app.vault.copy(bib_file, new_bib);
			} else {
				export_message += "- Without overwriting the bib file\n";
			}
		} else {
			export_message += "- Without a bib file (none found)";
		}
		const the_template_file = this.app.vault.getFileByPath(
			this.settings.template_path,
		);
		const template_file =
			the_template_file !== null ? the_template_file : undefined;
		if (template_file !== undefined) {
			export_message += "- Using the specified template file,\n";
		}

		let out_file = this.app.vault.getFileByPath(output_path);
		if (out_file === null) {
			out_file = await this.app.vault.create(output_path, "");
			await this.proceed_with_export(
				active_file,
				parsed_contents,
				settings,
				output_folder_path,
				template_file,
				out_file,
				preamble_file,
				export_message,
			);
		} else {
			const out_file_other = out_file;
			if (this.settings.warn_before_overwrite) {
				new WarningModal(
					this.app,
					this,
					() =>
						this.proceed_with_export(
							active_file,
							parsed_contents,
							settings,
							output_folder_path,
							template_file,
							out_file_other,
							preamble_file,
							export_message,
						),
					"It seems there is a previously exported file. Overwrite it?",
				).open();
			} else {
				await this.proceed_with_export(
					active_file,
					parsed_contents,
					settings,
					output_folder_path,
					template_file,
					out_file,
					preamble_file,
					export_message,
				);
			}
		}
	}

	async proceed_with_export(
		active_file: TFile,
		parsed_contents: parsed_longform,
		settings: ExportPluginSettings,
		output_folder_path: string,
		template_file: TFile | undefined,
		out_file: TFile,
		preamble_file: TFile | undefined,
		partial_message: string = "",
	) {
		const notes_dir = this.app.vault;

		if (parsed_contents.media_files.length > 0) {
			const files_folder = path.join(output_folder_path, "Files");
			await this.app.vault.createFolder(files_folder).catch((e) => e);
			// await this.create_folder_if_not(files_folder);
			for (const media_file of parsed_contents.media_files) {
				await this.app.vault
					.copy(media_file, path.join(files_folder, media_file.name))
					.catch((e) => e);
			}
		}

		if (template_file !== undefined) {
			await write_with_template(
				template_file,
				parsed_contents,
				out_file,
				notes_dir.modify.bind(notes_dir),
				notes_dir.cachedRead.bind(notes_dir),
			);
		} else {
			await write_without_template(
				parsed_contents,
				out_file,
				notes_dir.modify.bind(notes_dir),
				preamble_file,
			);
		}
		new Notice(
			partial_message +
				"To the vault folder inside the vault:\n" +
				output_folder_path +
				"/",
		);
	}

	async export_with_selection(
		active_file: TFile,
		selection: string,
		settings: ExportPluginSettings,
	) {
		try {
			return export_selection(
				this.app.vault.cachedRead.bind(this.app.vault),
				this.find_file,
				active_file,
				selection,
				settings,
			);
		} catch (e) {
			console.error(e);
		}
	}

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "export-paper",
			name: "Export current note",
			checkCallback: (checking: boolean) => {
				const active_file = this.app.workspace.getActiveFile();
				if (!(active_file instanceof TFile)) {
					return false;
					// new Notice("No active file found.");
					// throw new Error("No active file found.");
				} else if (checking) {
					return true;
				} else {
					this.find_files_and_export(active_file, this.settings);
				}
			},
		});
		this.addCommand({
			id: "selection-export-paper",
			name: "Export selection",
			editorCheckCallback: (
				checking: boolean,
				editor: Editor,
				ctx: MarkdownView | MarkdownFileInfo,
			): boolean | void => {
				if (checking) {
					return editor.somethingSelected();
				}
				const active_file = ctx.file;
				if (!active_file) {
					throw new Error("No active file found.");
				}
				const selection = editor.getSelection();
				this.export_with_selection(
					active_file,
					selection,
					this.settings,
				);
			},
		});
		this.addSettingTab(new LatexExportSettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class WarningModal extends Modal {
	private plugin: ExportPaperPlugin;
	private rememberChoice: boolean;
	private callback: any;
	private message: string;

	constructor(
		app: App,
		plugin: ExportPaperPlugin,
		callback: any,
		message: string,
	) {
		super(app);
		this.plugin = plugin;
		this.rememberChoice = false;
		this.callback = callback;
		this.message = message;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText(this.message);

		new Setting(contentEl)
			.addButton((btn) =>
				btn.setButtonText("OK").onClick(async () => {
					if (this.rememberChoice) {
						this.plugin.settings.warn_before_overwrite = false;
					}
					await this.callback();
					await this.plugin.saveSettings();
					this.close();
				}),
			)
			.addButton((btn) =>
				btn.setButtonText("Cancel").onClick(() => {
					this.close();
				}),
			);

		const toggleContainer = contentEl.createDiv();
		toggleContainer.createDiv({ text: "Remember my choice:" });
		new Setting(toggleContainer).addToggle((toggle) =>
			toggle
				.setValue(false)
				.onChange((value) => (this.rememberChoice = value)),
		);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class LatexExportSettingTab extends PluginSettingTab {
	plugin: ExportPaperPlugin;

	constructor(app: App, plugin: ExportPaperPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		new Setting(containerEl)
			.setName("Template file")
			.setDesc(
				"Relative vault path to a template file. Only set this if you would like to export with a template (you don't need to.)",
			)
			.addText((text) =>
				text
					.setPlaceholder("path/to/template_file.tex")
					.setValue(this.plugin.settings.template_path)
					.onChange(async (value) => {
						if (value === "") {
							value = "/";
						}
						this.plugin.settings.template_path =
							normalizePath(value);
						await this.plugin.saveSettings();
					}),
			);
		new Setting(containerEl)
			.setName("Output folder")
			.setDesc(
				"Vault relative path of an existing folder in your vault. Exports will be written within that folder.",
			)
			.addText((text) =>
				text
					.setPlaceholder("path/to/output_folder/")
					.setValue(this.plugin.settings.base_output_folder)
					.onChange(async (value) => {
						const match = /^(?:\/|\/?(.*?)\/?)$/.exec(value);
						if (match) {
							if (match[1] === undefined) {
								value = "/";
							} else {
								value = match[1];
							}
						}
						this.plugin.settings.base_output_folder =
							normalizePath(value);
						await this.plugin.saveSettings();
					}),
			);
		new Setting(containerEl)
			.setName("Math preamble file")
			.setDesc(
				"Vault relative path to a preamble.sty file in your vault. It will be included in the export.",
			)
			.addText((text) =>
				text
					.setPlaceholder("path/to/preamble_file")
					.setValue(this.plugin.settings.preamble_file)
					.onChange(async (value) => {
						this.plugin.settings.preamble_file =
							normalizePath(value);
						await this.plugin.saveSettings();
					}),
			);
		new Setting(containerEl).setName("Bib file").addText((text) =>
			text
				.setPlaceholder("path/to/bib_file")
				.setValue(this.plugin.settings.bib_file)
				.onChange(async (value) => {
					this.plugin.settings.bib_file = normalizePath(value);
					await this.plugin.saveSettings();
				}),
		);
		new Setting(containerEl)
			.setName("Prioritize lists over equations")
			.setDesc(
				"Whether to include display equations in lists, or stop the list and have the equation outside of the list.",
			)
			.addToggle((cb) =>
				cb
					.setValue(this.plugin.settings.prioritize_lists)
					.onChange(async (value) => {
						this.plugin.settings.prioritize_lists = value;
						await this.plugin.saveSettings();
					}),
			);
		new Setting(containerEl)
			.setName("Overwrite preamble.sty")
			.setDesc(
				"Overwrite the preamble file also if a preamble file is found in the root of the vault.",
			)
			.addToggle((cb) =>
				cb
					.setValue(this.plugin.settings.overwrite_preamble)
					.onChange(async (value) => {
						this.plugin.settings.overwrite_preamble = value;
						await this.plugin.saveSettings();
					}),
			);
		new Setting(containerEl)
			.setName("Warn before overwriting on export")
			.addToggle((cb) =>
				cb
					.setValue(this.plugin.settings.warn_before_overwrite)
					.onChange(async (value) => {
						this.plugin.settings.warn_before_overwrite = value;
						await this.plugin.saveSettings();
					}),
			);
		new Setting(containerEl)
			.setName("Default cite command")
			.addText((txt) =>
				txt
					.setValue(this.plugin.settings.default_citation_command)
					.onChange(async (value) => {
						this.plugin.settings.default_citation_command = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
