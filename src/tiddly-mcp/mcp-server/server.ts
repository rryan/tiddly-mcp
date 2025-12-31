/**
 * MCP Server initialization
 */

import { registerTools } from './tools/index';
import type { Wiki } from './types';
import type { MCPConfig } from './types';

// Dynamic import for MCP SDK at runtime
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');

/**
 * Create and configure the MCP server
 */
export function createMCPServer(wiki: Wiki, config: MCPConfig): any {
  // Create the server instance
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
  );

  // Register all tools
  registerTools(server, wiki, config);

  // Error handling
  server.onerror = (error: Error) => {
    console.error('[MCP Server Error]:', error);
  };

  return server;
}
