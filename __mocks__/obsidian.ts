// __mocks__/obsidian.js
export const obsidian = {
	TFile: class TFile {
		basename: string;
		name: string;
		path: string;
		constructor(basename: string, path: string, name: string) {
			this.basename = basename;
			this.path = path;
			this.name = name;
		}
	},
	Vault: class Vault {
		modify(file: TFile) {}
		read(file: TFile): string {
			return "";
		}
	},
	// Add other mocked functions or properties here
};
