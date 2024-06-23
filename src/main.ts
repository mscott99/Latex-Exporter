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

import { export_longform } from "./export_longform";

interface ExportPluginSettings {
	mySetting: string;
	template_path: string;
	base_output_folder: string;
}

const DEFAULT_SETTINGS: ExportPluginSettings = {
	mySetting: "default",
	template_path: "",
	base_output_folder: "/",
};

export default class ExportPaperPlugin extends Plugin {
	settings: ExportPluginSettings;

	async find_files_and_export(active_file: TFile, selection?: string) {
		let base_folder = this.app.vault.getFolderByPath(
			this.settings.base_output_folder,
		);
		if (!base_folder) {
			base_folder = this.app.vault.getRoot();
			console.warn(
				"Output folder path not found, defaulting to the root of the vault.",
			);
		}
		const output_file_name = active_file.basename + "_output.tex";
		let output_path = path.join(base_folder.path, output_file_name);
		const output_path_match = /^\/(.*)$/.exec(output_path);
		if (output_path_match) {
			output_path = output_path_match[1];
		}
		let out_file = this.app.vault.getFileByPath(output_path);
		if (out_file !== null) {
			console.log("File exists, overwriting.");
		} else {
			console.log("Creating new output file");
			out_file = await this.app.vault.create(output_path, "");
		}
		const template_file = this.app.vault.getFileByPath(
			this.settings.template_path,
		);
		if (!template_file) {
			console.log(
				"Template file not found, exporting with default template.",
			);
		}
		try {
			return await export_longform(
				this.app.vault,
				active_file,
				out_file,
				template_file,
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
			callback: async () => {
				const active_file = this.app.workspace.getActiveFile();

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
				const selection = editor.getSelection();
				const active_file = ctx.file;
				if (!active_file) {
					throw new Error("No active file found.");
				}
				this.find_files_and_export(active_file, selection);
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
	}
}
