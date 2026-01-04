/**
 * List tiddlers tool - list all tiddlers or filter by criteria
 */

import { z } from 'zod';
import type { MCPTool, TiddlerFieldValue } from '../types';

const listTiddlersInputSchema = z.object({
  filter: z.string().optional().describe('TiddlyWiki filter expression (optional)'),
  limit: z.number().optional().describe('Maximum number of tiddlers to return'),
  includeSystem: z.boolean().optional().default(false).describe('Include system tiddlers (starting with $:/)'),
  includeDetails: z.boolean().optional().default(false).describe('Include tiddler details instead of just titles'),
});

const tiddlerDetailSchema = z.object({
  title: z.string().describe('Title of the tiddler'),
  text: z.string().describe('Content of the tiddler'),
  tags: z.array(z.string()).optional().describe('Tags associated with the tiddler'), // TiddlyWiki normalizes tags to arrays
  type: z.string().optional().describe('Content type of the tiddler'),
  created: z.string().datetime().optional().describe('Creation timestamp'),
  creator: z.string().optional().describe('Username of the creator'),
  modified: z.string().datetime().optional().describe('Last modification timestamp'),
  modifier: z.string().optional().describe('Username of the last modifier'),
}).passthrough().describe('Full tiddler details with all fields');

const listTiddlersOutputSchema = z.object({
  count: z.number().describe('Total number of tiddlers returned'),
  tiddlers: z.union([
    z.array(z.string()).describe('Array of tiddler titles when includeDetails is false'),
    z.array(tiddlerDetailSchema).describe('Array of tiddler objects with full details when includeDetails is true'),
  ]).describe('List of tiddlers (titles only or full details based on includeDetails parameter)'),
}).describe('List of tiddlers matching the filter criteria with count');

export const listTiddlersTool: MCPTool<typeof listTiddlersInputSchema, typeof listTiddlersOutputSchema> = {
  name: 'list_tiddlers',
  description: 'List all tiddlers or filter them using a TiddlyWiki filter expression',
  inputSchema: listTiddlersInputSchema,
  outputSchema: listTiddlersOutputSchema,
  // eslint-disable-next-line @typescript-eslint/require-await
  async handler(arguments_, wiki) {
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

      let results: string[] | Array<Record<string, TiddlerFieldValue>>;

      if (arguments_.includeDetails) {
        // Get full tiddler details (all fields, same as read_tiddler)
        results = tiddlerTitles.map((title: string) => {
          const tiddler = wiki.getTiddler(title);
          if (!tiddler) return null;

          return tiddler.fields;
        }).filter((t): t is Record<string, TiddlerFieldValue> => t !== null);
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
