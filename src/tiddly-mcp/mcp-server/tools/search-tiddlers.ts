/**
 * Search tiddlers tool - search for tiddlers by text content
 */

import { z } from 'zod';
import type { MCPTool } from '../types';

const searchTiddlersInputSchema = z.object({
  query: z.string().describe('Search query text'),
  field: z.string().optional().describe('Specific field to search in (default: searches all fields)'),
  caseSensitive: z.boolean().optional().default(false).describe('Whether search should be case-sensitive'),
});

const searchTiddlersOutputSchema = z.object({
  query: z.string().describe('The search query that was executed'),
  count: z.number().describe('Number of tiddlers matching the search query'),
  results: z.array(z.string()).describe('Array of tiddler titles that match the search query'),
}).describe('Search results containing the query, count of matches, and matching tiddler titles');

export const searchTiddlersTool: MCPTool<typeof searchTiddlersInputSchema, typeof searchTiddlersOutputSchema> = {
  name: 'search_tiddlers',
  description: 'Search for tiddlers containing specific text',
  inputSchema: searchTiddlersInputSchema,
  outputSchema: searchTiddlersOutputSchema,
  // eslint-disable-next-line @typescript-eslint/require-await
  async handler(arguments_, wiki) {
    console.log(`[MCP] search_tiddlers query=${arguments_.query} field=${arguments_.field} caseSensitive=${arguments_.caseSensitive}`);
    try {
      // Use TiddlyWiki's built-in search
      const tiddlerTitles = wiki.search(arguments_.query, {
        field: arguments_.field,
        caseSensitive: arguments_.caseSensitive,
      });

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
