module.exports = {
  roots: ["<rootDir>/src"],
  transform: {
    // ts-jest handles both .ts/.tsx (our source) and .js/.jsx (ESM-only
    // deps like @noble/hashes that ship as native ESM and would otherwise
    // crash Jest with "Cannot use import statement outside a module").
    "^.+\\.[jt]sx?$": "ts-jest",
  },
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  // By default Jest skips transforming anything under node_modules. ts-jest
  // transformer above can read JS, but Jest still needs an explicit allow
  // for the ESM-only packages we depend on.
  transformIgnorePatterns: ["node_modules/(?!@noble/)"],
};
