/**
 * Write tiddler tool - create or update a tiddler
 */

import type { MCPTool } from '../types';

const { z } = require('zod');

const writeTiddlerInputSchema = z.object({
  title: z.string().describe('Title of the tiddler'),
  text: z.string().describe('Content/text of the tiddler'),
  tags: z.array(z.string()).optional().describe('Array of tags for the tiddler'),
  type: z.string().optional().describe('Content type (default: text/markdown)'),
  username: z.string().default('tiddly-mcp').describe('Username of the agent creating or updating the tiddler. AI agents should use their name in lowercase.'),
});

export const writeTiddlerTool: MCPTool<typeof writeTiddlerInputSchema> = {
  name: 'write_tiddler',
  description: 'Create or update a tiddler with the specified content and fields',
  inputSchema: writeTiddlerInputSchema,
  outputSchema: z.object({
    message: z.string(),
  }),
  handler: async (arguments_, wiki) => {
    console.log(`[MCP] write_tiddler title=${arguments_.title}`);
    try {
      // Check if tiddler exists
      const existingTiddler = wiki.getTiddler(arguments_.title);
      const isUpdate = !!existingTiddler;

      // Prepare tiddler fields
      const now = new Date();

      const defaultType = wiki.getTiddlerText('$:/plugins/rryan/tiddly-mcp/configs/default-content-type', 'text/vnd.tiddlywiki');

      const tiddlerFields: Record<string, any> = {
        title: arguments_.title,
        text: arguments_.text,
        type: arguments_.type ? arguments_.type : defaultType,
        created: isUpdate ? existingTiddler.fields.created : now,
        creator: isUpdate ? existingTiddler.fields.creator : arguments_.username,
        modified: now,
        modifier: arguments_.username,
      };

      if (arguments_.tags && arguments_.tags.length > 0) {
        tiddlerFields.tags = arguments_.tags;
      }

      // Create/update the tiddler
      wiki.addTiddler(tiddlerFields);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              message: `Tiddler "${arguments_.title}" ${isUpdate ? 'updated' : 'created'} successfully`,
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error writing tiddler: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
};
