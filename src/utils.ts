import * as fs from "fs";
import * as path from "path";

("Searches recursively in the folder_path for a file with name file_name.");
export function find_file(notes_dir: string, address: string): string | null {
	let file_path: string | null = null;
	const files = fs.readdirSync(notes_dir);
	for (const file of files) {
		const curr_file_path = path.join(notes_dir, file);
		const stat = fs.statSync(curr_file_path);
		if (stat.isDirectory()) {
			if (file_path) {
				console.warn(
					"Multiple files found with the same name. Returning the first one found.",
				);
			}
			file_path = find_file(curr_file_path, address);
		} else if (file === address + ".md") {
			file_path = curr_file_path;
		}
	}
	return file_path;
}
