import esbuild from "rollup-plugin-esbuild";

export default {
	input: "./copy_with_style.js",
	output: [
		{
			file: "./dist/copy_with_style.mjs",
			format: "es",
		},
		{
			file: "./dist/copy_with_style.cjs",
			format: "cjs",
		},
		{
			file: "./dist/copy_with_style.js",
			format: "umd",
			name: "CopyWithStyle",
		},
	],
	plugins: [
		esbuild({
			minify: true,
			target: [
				"es2021",
				"chrome80",
				"safari14",
				"firefox78",
				"edge80",
				"node18",
			],
		}),
	],
};
