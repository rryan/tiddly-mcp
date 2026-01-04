/**
 * Read tiddler tool - retrieve tiddler content and fields
 */

import type { MCPTool } from '../types';

const { z } = require('zod');

const readTiddlerInputSchema = z.object({
  title: z.string().describe('Title of the tiddler to read'),
});

export const readTiddlerTool: MCPTool<typeof readTiddlerInputSchema> = {
  name: 'read_tiddler',
  description: 'Read a tiddler and return its content and fields',
  inputSchema: readTiddlerInputSchema,
  outputSchema: z.object({
    title: z.string(),
    text: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }).passthrough().describe('Tiddler fields'),
  handler: async (arguments_, wiki) => {
    console.log(`[MCP] read_tiddler title=${arguments_.title}`);
    const tiddler = wiki.getTiddler(arguments_.title);

    if (!tiddler) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Tiddler "${arguments_.title}" not found`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(tiddler.fields, null, 2),
        },
      ],
    };
  },
};
