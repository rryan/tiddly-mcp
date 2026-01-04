/**
 * Search tiddlers tool - search for tiddlers by text content
 */

import type { MCPTool } from '../types';

const { z } = require('zod');

const searchTiddlersInputSchema = z.object({
  query: z.string().describe('Search query text'),
  field: z.string().optional().describe('Specific field to search in (default: searches all fields)'),
  caseSensitive: z.boolean().optional().default(false).describe('Whether search should be case-sensitive'),
});

export const searchTiddlersTool: MCPTool<typeof searchTiddlersInputSchema> = {
  name: 'search_tiddlers',
  description: 'Search for tiddlers containing specific text',
  inputSchema: searchTiddlersInputSchema,
  outputSchema: z.object({
    query: z.string(),
    count: z.number(),
    results: z.array(z.string()),
  }),
  handler: async (arguments_, wiki) => {
    console.log(`[MCP] search_tiddlers query=${arguments_.query} field=${arguments_.field} caseSensitive=${arguments_.caseSensitive}`);
    try {
      // Use TiddlyWiki's built-in search
      const results = wiki.search(arguments_.query, {
        field: arguments_.field,
        caseSensitive: arguments_.caseSensitive,
      });

      // Extract tiddler titles from results
      const tiddlerTitles = results.map((result: any) => result.title || result);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                query: arguments_.query,
                count: tiddlerTitles.length,
                results: tiddlerTitles,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error searching tiddlers: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
};
