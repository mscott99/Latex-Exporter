module.exports = {
	verbose: true,
	preset: 'ts-jest',
	testEnvironment: 'node',
	moduleDirectories: ['node_modules', 'src', 'test'],
	transform: {
		'^.+\\.ts$': 'ts-jest',
	},
	// moduleNameMapper: {
	//   obsidian: 'mocks/obsidian.ts',
	// },
	moduleFileExtensions: ['js', 'ts'],
	collectCoverage: true,
	// collectCoverageFrom: [
	// 	'src/*.ts', // Adjust pattern to include your source files
	// 	'!src/archived', // Exclude TypeScript declaration files
	// ],
};
// module.exports = {
// 	verbose: true,
// 	preset: 'ts-jest',
// 	transform: {
// 		'^.+\\.ts$': 'ts-jest',
// 	},
// 	// module: {
// 	// 	rules: [
// 	// 		{
// 	// 			test: /\.txt/,
// 	// 			type: 'asset/source',
// 	// 		},
// 	// 	]
// 	// },
// 	// testEnvironment: "jsdom",
// 	moduleFileExtensions: ['js', 'ts'],
// };
