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
} from "obsidian";
import {
	parse_longform,
	export_selection,
	write_without_template,
	write_with_template,
	get_header_tex,
	ExportPluginSettings,
	DEFAULT_SETTINGS,
} from "./export_longform";
import { find_file } from "./export_longform/utils";

export default class ExportPaperPlugin extends Plugin {
	settings: ExportPluginSettings;

	async find_files_and_export(
		active_file: TFile,
		settings: ExportPluginSettings,
	) {
		console.log("Exporting paper");
		if (this.settings.base_output_folder === "") {
			this.settings.base_output_folder = "/";
		}
		let base_folder = this.app.vault.getFolderByPath(
			this.settings.base_output_folder,
		);
		if (!base_folder) {
			console.log(this.settings.base_output_folder);
			base_folder = this.app.vault.getRoot();
			console.warn(
				"Output folder path not found, defaulting to the root of the vault.",
			);
			new Notice(
				"Output folder path not found, defaulting to the root of the vault.",
			);
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
		const preamble_file = the_preamble_file ? the_preamble_file : undefined;
		if (preamble_file !== undefined) {
			const new_preamble = path.join(output_folder_path, "preamble.sty");
			if (!this.app.vault.getFileByPath(new_preamble))
				this.app.vault.copy(preamble_file, new_preamble);
		} else {
			console.log("no preamble file found.");
		}

		const header_file = this.app.vault.getFileByPath(
			path.join(output_folder_path, "header.tex"),
		);
		if (!header_file) {
			await this.app.vault.create(
				path.join(output_folder_path, "header.tex"),
				get_header_tex(),
			);
		}

		const the_bib_file = this.app.vault.getFileByPath(
			this.settings.bib_file,
		);
		const bib_file = the_bib_file ? the_bib_file : undefined;
		if (bib_file !== undefined) {
			const new_bib = path.join(output_folder_path, "bibliography.bib");
			if (!this.app.vault.getFileByPath(new_bib))
				this.app.vault.copy(bib_file, new_bib);
		} else {
			console.log("no bib file found.");
		}

		const the_template_file = this.app.vault.getFileByPath(
			this.settings.template_path,
		);
		const template_file =
			the_template_file !== null ? the_template_file : undefined;

		if (!template_file) {
			console.log("Exporting with the default template.");
		} else {
			console.log("Exporting with template.");
		}

		let out_file = this.app.vault.getFileByPath(output_path);
		if (out_file === null) {
			console.log("Creating new output file");
			out_file = await this.app.vault.create(output_path, "");
			await this.proceed_with_export(
				active_file,
				settings,
				output_folder_path,
				template_file,
				out_file,
				preamble_file,
			);
		} else {
			const out_file_other = out_file;
			if (this.settings.warn_before_overwrite) {
				console.log("Warning before overwriting file");
				new WarningModal(
					this.app,
					this,
					() =>
						this.proceed_with_export(
							active_file,
							settings,
							output_folder_path,
							template_file,
							out_file_other,
							preamble_file,
						),
					"It seems there is a previously exported file. Overwrite it?",
				).open();
			} else {
				console.log("Overwriting without warning");
				await this.proceed_with_export(
					active_file,
					settings,
					output_folder_path,
					template_file,
					out_file,
					preamble_file,
				);
			}
		}
	}

	async proceed_with_export(
		active_file: TFile,
		settings: ExportPluginSettings,
		output_folder_path: string,
		template_file: TFile | undefined,
		out_file: TFile,
		preamble_file: TFile | undefined,
	) {
		const notes_dir = this.app.vault;
		const parsed_contents = await parse_longform(
			notes_dir.cachedRead.bind(notes_dir),
			(address: string) => find_file(notes_dir, address),
			active_file,
			settings,
		);

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
			new Notice(
				"Latex content written to " +
				out_file.path +
				" by using the template file " +
				template_file.path,
			);
		} else {
			await write_without_template(
				parsed_contents,
				out_file,
				notes_dir.modify.bind(notes_dir),
				preamble_file,
			);
			new Notice(
				"Latex content written to " +
				out_file.path +
				" by using the default template",
			);
		}
	}

	async export_with_selection(
		active_file: TFile,
		selection: string,
		settings: ExportPluginSettings,
	) {
		try {
			return export_selection(
				this.app.vault.cachedRead.bind(this.app.vault),
				(address: string) => find_file(this.app.vault, address),
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
			editorCallback: async (
				editor: Editor,
				ctx: MarkdownView | MarkdownFileInfo,
			) => {
				const active_file = ctx.file;
				if (!(active_file instanceof TFile)) {
					new Notice("No active file found.");
					throw new Error("No active file found.");
				}
				this.find_files_and_export(active_file, this.settings);
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
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() { }

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

class SampleSettingTab extends PluginSettingTab {
	plugin: ExportPaperPlugin;

	constructor(app: App, plugin: ExportPaperPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		// new Setting(containerEl)
		// 	.setName("Setting #1")
		// 	.setDesc("It's a secret")
		// 	.addText((text) =>
		// 		text
		// 			.setPlaceholder("Enter your secret")
		// 			.setValue(this.plugin.settings.mySetting)
		// 			.onChange(async (value) => {
		// 				this.plugin.settings.mySetting = value;
		// 				await this.plugin.saveSettings();
		// 			}),
		// 	);
		// new Setting(containerEl).setName("test").addSearch((component)=>{
		// component.setPlaceholder(this.plugin.settings.template_path).setValue(this.plugin.settings.template_path).onChange(async (value) => {
		// 			// let val: string|null;
		// 			// val = value
		// 			// 		if(value == ""){
		// 			// 		val = null
		// 			// 	}
		// 			this.plugin.settings.template_path = value;
		// 			await this.plugin.saveSettings();
		// 			console.log(this.plugin.settings.template_path);
		// 		})});
		new Setting(containerEl).setName("Template file").addText((text) =>
			text
				.setPlaceholder("path/to/template_file.tex")
				.setValue(this.plugin.settings.template_path)
				.onChange(async (value) => {
					if (value === "") {
						value = "/";
					}
					this.plugin.settings.template_path = value;
					await this.plugin.saveSettings();
				}),
		);
		new Setting(containerEl).setName("Output folder").addText((text) =>
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
					this.plugin.settings.base_output_folder = value;
					await this.plugin.saveSettings();
				}),
		);
		new Setting(containerEl).setName("Math preamble file").addText((text) =>
			text
				.setPlaceholder("path/to/preamble_file")
				.setValue(this.plugin.settings.preamble_file)
				.onChange(async (value) => {
					this.plugin.settings.preamble_file = value;
					await this.plugin.saveSettings();
				}),
		);
		new Setting(containerEl).setName("Bib file").addText((text) =>
			text
				.setPlaceholder("path/to/bib_file")
				.setValue(this.plugin.settings.bib_file)
				.onChange(async (value) => {
					this.plugin.settings.bib_file = value;
					await this.plugin.saveSettings();
				}),
		);
		new Setting(containerEl)
			.setName("Prioritize lists over equations")
			.addToggle((cb) =>
				cb
					.setValue(this.plugin.settings.prioritize_lists)
					.onChange(async (value) => {
						this.plugin.settings.prioritize_lists = value;
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
