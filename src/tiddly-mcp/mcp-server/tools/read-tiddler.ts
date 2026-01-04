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
