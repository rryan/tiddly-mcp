/**
 * Tool registration and request handling
 */

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-deprecated */
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { MCPConfig, MCPTool, Wiki } from '../types';
import { deleteTiddlerTool } from './delete-tiddler';
import { listTiddlersTool } from './list-tiddlers';
import { readTiddlerTool } from './read-tiddler';
import { searchTiddlersTool } from './search-tiddlers';
import { writeTiddlerTool } from './write-tiddler';

// Dynamic imports for runtime dependencies
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const { zodToJsonSchema } = require('zod-to-json-schema');
/* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment */

/**
 * Register all tools with the MCP server
 */
export function registerTools(server: Server, wiki: Wiki, config: MCPConfig): void {
  // Collect all tools
  const tools: MCPTool[] = [
    readTiddlerTool,
    listTiddlersTool,
    searchTiddlersTool,
  ];

  if (!config.readOnly) {
    tools.push(deleteTiddlerTool);
    tools.push(writeTiddlerTool);
  }

  // Create a map for quick tool lookup
  const toolMap = new Map<string, MCPTool>();
  tools.forEach((tool) => toolMap.set(tool.name, tool));

  // Handle ListTools request
  /* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/require-await */
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    console.log('[MCP] tools/list_tools');
    const toolsList = tools.map((tool) => {
      try {
        // Check if the schema is valid
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
  /* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/require-await */

  // Handle CallTool request
  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: arguments_ } = request.params;

    const tool = toolMap.get(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }

    try {
      // Validate and parse arguments
      const validatedArguments = tool.inputSchema.parse(arguments_);

      // Execute tool handler
      const result = await tool.handler(validatedArguments, wiki);

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
  /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
}
/* eslint-enable @typescript-eslint/no-deprecated */
