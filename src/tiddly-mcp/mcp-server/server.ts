/**
 * MCP Server initialization
 */

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { registerTools } from './tools/index';
import type { Wiki } from './types';
import type { MCPConfig } from './types';

// Dynamic import for MCP SDK at runtime
const { Server: ServerClass } = require('@modelcontextprotocol/sdk/server/index.js');

/**
 * Create and configure the MCP server
 */
// eslint-disable-next-line @typescript-eslint/no-deprecated
export function createMCPServer(wiki: Wiki, config: MCPConfig): Server {
  // Create the server instance
  const server = new ServerClass(
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

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return server;
}
/* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
