/**
 * Read tiddler tool - retrieve tiddler content and fields
 */

import { z } from 'zod';
import type { MCPTool } from '../types';

const readTiddlerInputSchema = z.object({
  title: z.string().describe('Title of the tiddler to read'),
});

export const readTiddlerTool: MCPTool<typeof readTiddlerInputSchema> = {
  name: 'read_tiddler',
  description: 'Read a tiddler and return its content and fields',
  inputSchema: readTiddlerInputSchema,
  outputSchema: z.object({
    title: z.string().describe('Title of the tiddler'),
    text: z.string().optional().describe('Content/text of the tiddler'),
    type: z.string().optional().describe('Content type of the tiddler'),
    modified: z.string().optional().describe('Last modification timestamp (UTC)'),
    modifier: z.string().optional().describe('Last modifier username'),
    created: z.string().optional().describe('Creation timestamp (UTC)'),
    creator: z.string().optional().describe('Creator username'),
    tags: z.array(z.string()).optional().describe('List of tags'),
  }).passthrough().describe('Tiddler fields'),
  async handler(arguments_, wiki) {
    console.log(`[MCP] read_tiddler title=${arguments_.title}`);
    const tiddler = wiki.getTiddler(arguments_.title);

    if (!tiddler) {
      return Promise.resolve({
        content: [
          {
            type: 'text' as const,
            text: `Tiddler "${arguments_.title}" not found`,
          },
        ],
        isError: true,
      });
    }

    return Promise.resolve({
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(tiddler.fields, null, 2),
        },
      ],
    });
  },
};
