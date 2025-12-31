export default {
  spec_dir: "src/tiddly-mcp/mcp-server",
  spec_files: [
    "**/__tests__/**/*.test.ts"
  ],
  helpers: [
    "helpers/**/*.?(m)js"
  ],
  requires: [
    "ts-node/register"
  ],
  env: {
    stopSpecOnExpectationFailure: false,
    random: true,
    forbidDuplicateNames: true
  }
}
