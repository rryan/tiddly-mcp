/**
 * Tool registration and request handling
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ZodType } from 'zod';
import type { MCPConfig, MCPTool, ToolResult, Wiki } from '../types';
import { deleteTiddlerTool } from './delete-tiddler';
import { listTiddlersTool } from './list-tiddlers';
import { readTiddlerTool } from './read-tiddler';
import { searchTiddlersTool } from './search-tiddlers';
import { writeTiddlerTool } from './write-tiddler';

// Dynamic imports for runtime dependencies
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const { zodToJsonSchema } = require('zod-to-json-schema');

/**
 * Register all tools with the MCP server
 */
export function registerTools(
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  server: Server,
  wiki: Wiki,
  config: MCPConfig,
): void {
  // Collect all tools
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: MCPTool<any>[] = [readTiddlerTool, listTiddlersTool, searchTiddlersTool];

  if (!config.readOnly) {
    tools.push(deleteTiddlerTool);
    tools.push(writeTiddlerTool);
  }

  // Create a map for quick tool lookup
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toolMap = new Map<string, MCPTool<any>>();
  tools.forEach((tool) => toolMap.set(tool.name, tool));

  // Handle ListTools request

  server.setRequestHandler(ListToolsRequestSchema, () => {
    console.log('[MCP] tools/list_tools');
    const toolsList = tools.map((tool) => {
      try {
        // Check if the schema is valid
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const jsonSchema = zodToJsonSchema(tool.inputSchema, {
          name: undefined,
          $refStrategy: 'none',
        });

        return {
          name: tool.name,
          description: tool.description,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          inputSchema: jsonSchema,
        };
      } catch (error) {
        console.error(`[MCP] Error converting schema for ${tool.name}:`, error);
        // Return a basic schema as fallback
        return {
          name: tool.name,
          description: tool.description,
          inputSchema: {
            type: 'object',
            properties: {},
          },
        };
      }
    });
    return { tools: toolsList };
  });

  // Handle CallTool request

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const { name, arguments: arguments_ } = request.params;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const tool = toolMap.get(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }

    try {
      // Validate and parse arguments
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const validatedArguments = (tool.inputSchema as ZodType).parse(arguments_);

      // Execute tool handler
      const result: ToolResult = await tool.handler(validatedArguments, wiki);

      return result;
    } catch (error) {
      // Return error as tool result
      return {
        content: [
          {
            type: 'text' as const,

            text: `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });
}
