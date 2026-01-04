/**
 * Read tiddler tool - retrieve tiddler content and fields
 */

import { z } from 'zod';
import type { MCPTool } from '../types';

const readTiddlerInputSchema = z.object({
  title: z.string().describe('Title of the tiddler to read'),
});

const readTiddlerOutputSchema = z.object({
  title: z.string().describe('Title of the tiddler'),
  text: z.string().describe('Content of the tiddler'),
  tags: z.array(z.string()).optional().describe('Tags associated with the tiddler'), // TiddlyWiki normalizes tags to arrays
  type: z.string().optional().describe('Content type of the tiddler (e.g., text/vnd.tiddlywiki, text/markdown)'),
  created: z.string().datetime().optional().describe('Creation timestamp'),
  creator: z.string().optional().describe('Username of the creator'),
  modified: z.string().datetime().optional().describe('Last modification timestamp'),
  modifier: z.string().optional().describe('Username of the last modifier'),
}).passthrough().describe('The tiddler fields including title, text, tags, type, and other metadata');

export const readTiddlerTool: MCPTool<typeof readTiddlerInputSchema, typeof readTiddlerOutputSchema> = {
  name: 'read_tiddler',
  description: 'Read a tiddler and return its content and fields',
  inputSchema: readTiddlerInputSchema,
  outputSchema: readTiddlerOutputSchema,
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
      structuredContent: tiddler.fields as Record<string, unknown>,
    });
  },
};
