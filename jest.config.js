module.exports = {
	verbose: true,
	preset: 'ts-jest',
	testEnvironment: 'node',
	moduleDirectories: ['node_modules', 'src', 'test'],
	transform: {
		'^.+\\.ts$': 'ts-jest',
	},
	moduleFileExtensions: ['js', 'ts'],
	collectCoverageFrom: [
		'src/*.ts',
	],
};
