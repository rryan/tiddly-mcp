/**
 * Filter tiddlers tool - execute TiddlyWiki filter expressions
 */

import type { MCPTool } from '../types';

const { z } = require('zod');

const filterTiddlersInputSchema = z.object({
  filter: z.string().describe('TiddlyWiki filter expression (e.g., "[tag[Journal]sort[created]]")'),
  includeDetails: z.boolean().optional().default(false).describe('Include tiddler details instead of just titles'),
});

export const filterTiddlersTool: MCPTool<typeof filterTiddlersInputSchema> = {
  name: 'filter_tiddlers',
  description: 'Execute a TiddlyWiki filter expression to query tiddlers with powerful filtering capabilities',
  inputSchema: filterTiddlersInputSchema,
  handler: async (arguments_, wiki) => {
    try {
      console.log(`[MCP] filter_tiddlers filter=${arguments_.filter} includeDetails=${arguments_.includeDetails}`);
      // Execute the filter
      const tiddlerTitles = wiki.filterTiddlers(arguments_.filter);

      let results: any;

      if (arguments_.includeDetails) {
        // Get full tiddler details
        results = tiddlerTitles.map((title: string) => {
          const tiddler = wiki.getTiddler(title);
          if (!tiddler) return null;

          return {
            title,
            text: tiddler.fields.text || '',
            tags: tiddler.fields.tags || [],
            type: tiddler.fields.type || 'text/vnd.tiddlywiki',
            created: tiddler.fields.created,
            modified: tiddler.fields.modified,
          };
        }).filter((t: any) => t !== null);
      } else {
        results = tiddlerTitles;
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                filter: arguments_.filter,
                count: tiddlerTitles.length,
                results,
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
            text: `Error executing filter: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
};
