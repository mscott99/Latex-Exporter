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
} from "obsidian";

import {
	parse_longform,
	export_selection,
	write_without_template,
	write_with_template,
	get_header_tex,
} from "./export_longform";

export interface ExportPluginSettings {
	mySetting: string;
	template_path: string;
	base_output_folder: string;
	preamble_file: string;
	bib_file: string;
}

const DEFAULT_SETTINGS: ExportPluginSettings = {
	mySetting: "default",
	template_path: "",
	base_output_folder: "/",
	preamble_file: "preamble.sty",
	bib_file: "bibliography.bib",
};

export default class ExportPaperPlugin extends Plugin {
	settings: ExportPluginSettings;

	async find_files_and_export(active_file: TFile) {
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
		await this.app.vault.createFolder(output_folder_path).catch(e => e);
		// await this.create_folder_if_not(output_folder_path);

		let out_file = this.app.vault.getFileByPath(output_path);
		if (out_file !== null) {
			console.log("Overwritting the main tex file.");
		} else {
			console.log("Creating new output file");
			out_file = await this.app.vault.create(output_path, "");
		}

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
			console.log(
				"Template file not found, exporting with default template.",
			);
		}

		const notes_dir = this.app.vault;
		const longform_file = active_file;
		const output_file = out_file;

		const parsed_contents = await parse_longform(notes_dir, longform_file);

		if (parsed_contents.media_files.length > 0) {
			const files_folder = path.join(output_folder_path, "Files");
			await this.app.vault.createFolder(files_folder).catch(e => e);
			// await this.create_folder_if_not(files_folder);
			for (const media_file of parsed_contents.media_files) {
				await this.app.vault.copy(media_file, path.join(files_folder, media_file.name)).catch(e => e);
			}
		 }

		if (template_file !== undefined) {
			await write_with_template(
				template_file,
				parsed_contents,
				output_file,
				notes_dir,
			);
			new Notice(
				"Latex content written to " +
					output_file.path +
					" by using the template file " +
					template_file.path,
			);
		} else {
			await write_without_template(
				parsed_contents,
				output_file,
				notes_dir,
				preamble_file,
			);
			new Notice(
				"Latex content written to " +
					output_file.path +
					" by using the default template",
			);
		}
		// try {
		// 	return await export_longform(
		// 		this.app.vault,
		// 		active_file,
		// 		out_file,
		// 		template_file,
		// 		preamble_file,
		// 	);
		// } catch (e) {
		// 	console.error(e);
		// }
	}
	async export_with_selection(active_file: TFile, selection: string) {
		try {
			return export_selection(
				this.app.vault,
				active_file,
				selection,
			);
		} catch (e) {
			console.error(e);
		}
	}

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "export-paper",
			name: "Export to paper",
			editorCallback: async (
				editor: Editor,
				ctx: MarkdownView | MarkdownFileInfo,
			) => {
				const active_file = ctx.file;
				if (!(active_file instanceof TFile)) {
					new Notice("No active file found.");
					throw new Error("No active file found.");
				}
				this.find_files_and_export(active_file);
			},
		});
		this.addCommand({
			id: "selection-export-paper",
			name: "Export selection to paper",
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
				this.export_with_selection(active_file, selection);
			},
		});
		this.addSettingTab(new SampleSettingTab(this.app, this));
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

class SampleSettingTab extends PluginSettingTab {
	plugin: ExportPaperPlugin;

	constructor(app: App, plugin: ExportPaperPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Setting #1")
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					}),
			);
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
	}
}
