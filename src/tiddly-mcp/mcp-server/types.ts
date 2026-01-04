/**
 * Shared TypeScript types for TiddlyWiki MCP Server
 */

import type { z } from 'zod';

/**
 * TiddlyWiki interface
 * Using any for now since tw5-typed types may not be complete
 */
export interface Wiki {
  getTiddler(title: string): Tiddler | undefined;
  addTiddler(tiddler: Tiddler | Record<string, unknown>): void;
  deleteTiddler(title: string): void;
  filterTiddlers(filter: string, widget?: unknown, source?: unknown): string[];
  getTiddlers(): string[];
  getTiddlerText(title: string, defaultText?: string): string;
  search(text: string, options?: unknown): unknown[];
}

/**
 * TiddlyWiki Tiddler interface
 */
export interface Tiddler {
  fields: Record<string, unknown>;
  getFieldString(field: string): string;
  getFieldList(field: string): string[];
}

/**
 * MCP Tool definition
 */
export interface MCPTool<T extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  inputSchema: T;
  handler: (arguments_: z.infer<T>, wiki: Wiki) => Promise<ToolResult>;
}

/**
 * MCP Server configuration
 */
export interface MCPConfig {
  enabled: boolean;
  readOnly: boolean;
  port: number;
  corsOrigins: string[];
  defaultContentType: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Tool call result
 */
export interface ToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}
