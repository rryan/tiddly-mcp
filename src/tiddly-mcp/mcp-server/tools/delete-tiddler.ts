/**
 * Delete tiddler tool - remove a tiddler from the wiki
 */

import { z } from 'zod';
import type { MCPTool } from '../types';

const deleteTiddlerInputSchema = z.object({
  title: z.string().describe('Title of the tiddler to delete'),
});

export const deleteTiddlerTool: MCPTool<typeof deleteTiddlerInputSchema> = {
  name: 'delete_tiddler',
  description: 'Delete a tiddler from the wiki',
  inputSchema: deleteTiddlerInputSchema,
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
              text: `Tiddler "${arguments_.title}" not found`,
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
            text: `Tiddler "${arguments_.title}" deleted successfully`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error deleting tiddler: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
};
