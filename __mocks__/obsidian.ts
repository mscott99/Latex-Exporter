// __mocks__/obsidian.js

export class TFile {
	basename: string;
	name: string;
	path: string;
	constructor() {}
}

export class Notice {}

// The parser calls parseYaml on the front matter of every note. Obsidian
// provides it; outside Obsidian we use js-yaml when it is installed (it comes
// in with the dev dependencies) and fall back to a flat `key: value` reader so
// the headless export never dies on a missing optional module.
export function parseYaml(input: string): { [key: string]: string } {
	try {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const yaml = require("js-yaml") as { load: (s: string) => unknown };
		const loaded = yaml.load(input);
		if (loaded !== null && typeof loaded === "object") {
			return loaded as { [key: string]: string };
		}
		return {};
	} catch (e) {
		return parse_flat_yaml(input);
	}
}

function parse_flat_yaml(input: string): { [key: string]: string } {
	const result: { [key: string]: string } = {};
	for (const line of input.split("\n")) {
		const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
		if (match === null) {
			continue;
		}
		result[match[1]] = match[2].trim().replace(/^["'](.*)["']$/, "$1");
	}
	return result;
}
