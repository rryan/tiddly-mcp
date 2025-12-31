import { defineConfig } from '@modern-js/module-tools';

// https://modernjs.dev/module-tools/en/api
export default defineConfig({
  buildConfig: {
    platform: 'node',
    target: 'es2020',
    externals: [
      // Node.js built-in modules
      'node:crypto',
      'node:url',
      'node:http',
      'node:https',
      'node:stream',
      'node:buffer',
      'node:events',
      'node:util',
      'node:path',
      'node:fs',
      // Regular node modules
      'crypto',
      'url',
      'http',
      'https',
      'stream',
      'buffer',
      'events',
      'util',
      'path',
      'fs',
      // MCP SDK and dependencies
      '@modelcontextprotocol/sdk',
      'zod',
      'zod-to-json-schema',
    ],
  },
});
