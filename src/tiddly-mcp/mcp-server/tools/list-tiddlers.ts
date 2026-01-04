/**
 * List tiddlers tool - list all tiddlers or filter by criteria
 */

import { z } from 'zod';
import type { MCPTool } from '../types';

const listTiddlersInputSchema = z.object({
  filter: z.string().optional().describe('TiddlyWiki filter expression (optional)'),
  limit: z.number().optional().describe('Maximum number of tiddlers to return'),
  includeSystem: z.boolean().optional().default(false).describe('Include system tiddlers (starting with $:/)'),
  includeDetails: z.boolean().optional().default(false).describe('Include tiddler details instead of just titles'),
});

export const listTiddlersTool: MCPTool<typeof listTiddlersInputSchema> = {
  name: 'list_tiddlers',
  description: 'List all tiddlers or filter them using a TiddlyWiki filter expression',
  inputSchema: listTiddlersInputSchema,
  // eslint-disable-next-line @typescript-eslint/require-await
  handler: async (arguments_, wiki) => {
    console.log(`[MCP] list_tiddlers filter=${arguments_.filter} includeSystem=${arguments_.includeSystem} limit=${arguments_.limit} includeDetails=${arguments_.includeDetails}`);
    try {
      let tiddlerTitles: string[];

      if (arguments_.filter) {
        // Use the provided filter
        tiddlerTitles = wiki.filterTiddlers(arguments_.filter);
      } else {
        // Get all tiddlers
        tiddlerTitles = wiki.getTiddlers();

        // Filter out system tiddlers if not requested
        if (!arguments_.includeSystem) {
          tiddlerTitles = tiddlerTitles.filter((title: string) => !title.startsWith('$:/'));
        }
      }

      // Apply limit if specified
      if (arguments_.limit && arguments_.limit > 0) {
        tiddlerTitles = tiddlerTitles.slice(0, arguments_.limit);
      }

      // Sort alphabetically
      tiddlerTitles.sort();

      let results: unknown;

      if (arguments_.includeDetails) {
        // Get full tiddler details (all fields, same as read_tiddler)
        results = tiddlerTitles.map((title: string) => {
          const tiddler = wiki.getTiddler(title);
          if (!tiddler) return null;

          return tiddler.fields;
        }).filter((t): t is Record<string, unknown> => t !== null);
      } else {
        results = tiddlerTitles;
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                count: tiddlerTitles.length,
                tiddlers: results,
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
            text: `Error listing tiddlers: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
};
