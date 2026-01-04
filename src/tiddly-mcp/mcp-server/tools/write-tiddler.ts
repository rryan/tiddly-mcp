/**
 * Write tiddler tool - create or update a tiddler
 */

import { z } from 'zod';
import type { MCPTool, TiddlerFieldValue } from '../types';

const writeTiddlerInputSchema = z.object({
  title: z.string().describe('Title of the tiddler'),
  text: z.string().describe('Content/text of the tiddler'),
  tags: z.array(z.string()).optional().describe('Array of tags for the tiddler'),
  type: z.string().optional().describe('Content type (default: text/markdown)'),
  username: z.string().default('tiddly-mcp').describe('Username of the agent creating or updating the tiddler. AI agents should use their name in lowercase.'),
});

const writeTiddlerOutputSchema = z.object({
  success: z.boolean().describe('Whether the write operation was successful'),
  message: z.string().describe('Human-readable message describing the result of the operation'),
  title: z.string().describe('Title of the tiddler that was created or updated'),
  operation: z.enum(['created', 'updated']).describe('Whether the tiddler was created or updated'),
}).describe('Result of the tiddler write operation');

export const writeTiddlerTool: MCPTool<typeof writeTiddlerInputSchema, typeof writeTiddlerOutputSchema> = {
  name: 'write_tiddler',
  description: 'Create or update a tiddler with the specified content and fields',
  inputSchema: writeTiddlerInputSchema,
  outputSchema: writeTiddlerOutputSchema,
  // eslint-disable-next-line @typescript-eslint/require-await
  async handler(arguments_, wiki) {
    console.log(`[MCP] write_tiddler title=${arguments_.title}`);
    try {
      // Check if tiddler exists
      const existingTiddler = wiki.getTiddler(arguments_.title);
      const isUpdate = !!existingTiddler;

      // Prepare tiddler fields
      const now = new Date();

      const defaultType = wiki.getTiddlerText('$:/plugins/rryan/tiddly-mcp/configs/default-content-type', 'text/vnd.tiddlywiki');

      const tiddlerFields: Record<string, TiddlerFieldValue> = {
        title: arguments_.title,
        text: arguments_.text,
        type: arguments_.type ?? defaultType,
        created: existingTiddler ? existingTiddler.fields.created : now,
        creator: existingTiddler ? existingTiddler.fields.creator : arguments_.username,
        modified: now,
        modifier: arguments_.username,
      };

      if (arguments_.tags && arguments_.tags.length > 0) {
        tiddlerFields.tags = arguments_.tags;
      }

      // Create/update the tiddler
      wiki.addTiddler(tiddlerFields);

      const operation = isUpdate ? 'updated' : 'created';
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: true,
                message: `Tiddler "${arguments_.title}" ${operation} successfully`,
                title: arguments_.title,
                operation,
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
                message: `Error writing tiddler: ${error instanceof Error ? error.message : String(error)}`,
                title: arguments_.title,
                operation: 'created', // Default to created for error case
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
