/**
 * Delete tiddler tool - remove a tiddler from the wiki
 */

import { z } from 'zod';
import type { MCPTool } from '../types';

const deleteTiddlerInputSchema = z.object({
  title: z.string().describe('Title of the tiddler to delete'),
});

const deleteTiddlerOutputSchema = z.object({
  success: z.boolean().describe('Whether the deletion was successful'),
  message: z.string().describe('Human-readable message describing the result of the deletion'),
  title: z.string().describe('Title of the tiddler that was deleted'),
}).describe('Result of the tiddler deletion operation');

export const deleteTiddlerTool: MCPTool<typeof deleteTiddlerInputSchema, typeof deleteTiddlerOutputSchema> = {
  name: 'delete_tiddler',
  description: 'Delete a tiddler from the wiki',
  inputSchema: deleteTiddlerInputSchema,
  outputSchema: deleteTiddlerOutputSchema,
  // eslint-disable-next-line @typescript-eslint/require-await
  async handler(arguments_, wiki) {
    console.log(`[MCP] delete_tiddler title=${arguments_.title}`);
    try {
      // Check if tiddler exists
      const tiddler = wiki.getTiddler(arguments_.title);

      if (!tiddler) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  message: `Tiddler "${arguments_.title}" not found`,
                  title: arguments_.title,
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }

      // Delete the tiddler
      wiki.deleteTiddler(arguments_.title);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: true,
                message: `Tiddler "${arguments_.title}" deleted successfully`,
                title: arguments_.title,
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
            text: JSON.stringify(
              {
                success: false,
                message: `Error deleting tiddler: ${error instanceof Error ? error.message : String(error)}`,
                title: arguments_.title,
              },
              null,
              2,
            ),
          },
        ],
        isError: true,
      };
    }
  },
};
