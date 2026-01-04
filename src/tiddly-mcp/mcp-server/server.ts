/**
 * MCP Server initialization
 */

import { registerTools } from './tools/index';
import type { Wiki } from './types';
import type { MCPConfig } from './types';

// Dynamic import for MCP SDK at runtime
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');

import type { Server as ServerType } from '@modelcontextprotocol/sdk/server/index.js';

/**
 * Create and configure the MCP server
 */
// eslint-disable-next-line @typescript-eslint/no-deprecated
export function createMCPServer(wiki: Wiki, config: MCPConfig): ServerType {
  // Create the server instance
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const server = new Server(
    {
      name: 'tiddlywiki-mcp',
      version: '0.0.1',
    },
    {
      capabilities: {
        tools: {},
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-deprecated
  ) as ServerType;

  // Register all tools

  registerTools(server, wiki, config);

  // Error handling
  server.onerror = (error: Error) => {
    console.error('[MCP Server Error]:', error);
  };

  return server;
}
