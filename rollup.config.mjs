import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";

import pkg from "./package.json" assert { type: "json" };
import replace from "@rollup/plugin-replace";

const banner = `
/**
 * @license
 * author: ${pkg.author}
 * ${pkg.name}@${pkg.version}
 * Released under the ${pkg.license} license.
 */
`;

export default [
  {
    input: "./src/index.node.ts",
    output: [
      {
        file: pkg.main,
        format: "cjs", // commonJS
        banner,
      },
    ],
    external: [...Object.keys(pkg.dependencies || {})],
    plugins: [
      typescript({
        tsconfig: "./tsconfig.build.json",
        sourceMap: false,
      }),
      nodeResolve({
        browser: false,
      }),
      commonjs({ extensions: [".ts"] }),
    ],
  },
  {
    input: "./src/index.browser.ts",
    output: [
      {
        name: "sidedrawer",
        file: pkg.browser,
        format: "umd", // browser
        banner,
      },
    ],
    plugins: [
      typescript({
        tsconfig: "./tsconfig.build.json",
        sourceMap: false,
      }),
      nodeResolve({
        browser: true,
      }),
      commonjs({ extensions: [".ts"] }),
      replace({
        "process.env.NODE_ENV": `"browser"`,
        preventAssignment: false,
      }),
      terser(),
    ],
  },
];
