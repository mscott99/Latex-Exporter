import { mkdir, existsSync } from "fs";
import * as path from "path";
import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
} from "obsidian";
// import parseMarkdown from "./parseMarkdown";
// import myObRemark from './src/index'
// import remarkObsidian from 'remark-obsidian';
// Remember to rename these classes and interfaces!

import { export_longform_with_template } from "./parseMarkdown";

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

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "export-paper",
			name: "Export to paper",
			callback: async () => {
				const active_file = this.app.workspace.getActiveFile();
				const template_path = this.settings.template_path;

				if (active_file instanceof TFile) {
					if (!this.settings.base_output_folder) {
						return new Notice(
							"Remember to set your output folder in the settings.",
						);
					}
					const base_folder = this.app.vault.getFolderByPath(
						this.settings.base_output_folder,
					);
					if (!base_folder) {
						return new Notice(
							"The specified output folder does not exist",
						);
					}
					const output_file_name =
						active_file.basename + "_output.tex";
					let output_path = path.join(
						base_folder.path,
						output_file_name,
					);
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
						await export_longform_with_template(
							this.app.vault,
							active_file,
							out_file,
							template_file,
						);
					} catch (e) {
						console.error(e)
					}
				} else {
					return new Notice("No active file found.");
				}
			},
		});

		// This creates an icon in the left ribbon.
		// const ribbonIconEl = this.addRibbonIcon(
		// 	"dice",
		// 	"Sample Plugin",
		// 	(evt: MouseEvent) => {
		// 		// Called when the user clicks the icon.
		// 		new Notice("This is a notice!");
		// 	},
		// );
		// Perform additional things with the ribbon
		// ribbonIconEl.addClass("my-plugin-ribbon-class");

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		// const statusBarItemEl = this.addStatusBarItem();
		// statusBarItemEl.setText("Status Bar Text");

		// This adds a simple command that can be triggered anywhere
		// This adds a simple command that can be triggered anywhere
		// this.addCommand({
		// 	id: "open-sample-modal-simple",
		// 	name: "Open sample modal (simple)",
		// 	callback: () => {
		// 		new SampleModal(this.app).open();
		// 	},
		// });
		// This adds an editor command that can perform some operation on the current editor instance
		// this.addCommand({
		// 	id: "sample-editor-command",
		// 	name: "Sample editor command",
		// 	editorCallback: (editor: Editor, view: MarkdownView) => {
		// 		console.log(editor.getSelection());
		// 		editor.replaceSelection("Sample Editor Command");
		// 	},
		// });
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		// this.addCommand({
		// 	id: "open-sample-modal-complex",
		// 	name: "Open sample modal (complex)",
		// 	checkCallback: (checking: boolean) => {
		// 		// Conditions to check
		// 		const markdownView =
		// 			this.app.workspace.getActiveViewOfType(MarkdownView);
		// 		if (markdownView) {
		// 			// If checking is true, we're simply "checking" if the command can be run.
		// 			// If checking is false, then we want to actually perform the operation.
		// 			if (!checking) {
		// 				new SampleModal(this.app).open();
		// 			}
		//
		// 			// This command will only show up in Command Palette when the check function returns true
		// 			return true;
		// 		}
		// 	},
		// });

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, "click", (evt: MouseEvent) => {
		// 	console.log("click", evt);
		// });

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(
		// 	window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000),
		// );
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

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText("Woah!");
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
					// let val: string|null;
					// val = value
					// 		if(value == ""){
					// 		val = null
					// 	}
					this.plugin.settings.template_path = value;
					await this.plugin.saveSettings();
				}),
		);
		new Setting(containerEl).setName("Output folder").addText((text) =>
			text
				.setPlaceholder("path/to/output_folder/")
				.setValue(this.plugin.settings.base_output_folder)
				.onChange(async (value) => {
					this.plugin.settings.base_output_folder = value;
					await this.plugin.saveSettings();
				}),
		);
	}
}
