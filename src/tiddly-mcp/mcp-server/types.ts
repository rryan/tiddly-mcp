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
  addTiddler(tiddler: Tiddler | Record<string, any>): void;
  deleteTiddler(title: string): void;
  filterTiddlers(filter: string, widget?: any, source?: any): string[];
  getTiddlers(): string[];
  getTiddlerText(title: string, defaultText?: string): string;
  search(text: string, options?: any): any[];
}

/**
 * TiddlyWiki Tiddler interface
 */
export interface Tiddler {
  fields: Record<string, any>;
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
  handler: (arguments_: z.infer<T>, wiki: Wiki) => Promise<any>;
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
