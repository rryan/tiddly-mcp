/**
 * TiddlyWiki startup module for MCP Server
 * This module initializes and starts the MCP server when TiddlyWiki starts
 */

// CRITICAL: Polyfills MUST be inline here, before ANY imports
// ESBuild bundles everything, so imported polyfills don't run early enough
if (typeof global === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  (globalThis as any).global = globalThis;
}

if (typeof AbortController === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  (globalThis as any).AbortController = class AbortController {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signal: any;
    constructor() {
      this.signal = {
        aborted: false,
        addEventListener: () => {},
        removeEventListener: () => {},
      };
    }
    abort() {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      this.signal.aborted = true;
    }
  };
}

import { createHTTPServer } from './http-server';
import { createMCPServer } from './server';
import type { MCPConfig, Wiki } from './types';

/**
 * Startup function called by TiddlyWiki
 */
function startup() {
  // Check if running in Node.js environment
  if (!$tw.node) {
    console.log('[MCP] Not running in Node.js environment, skipping MCP server');
    return;
  }

  // Get configuration from TiddlyWiki config tiddlers
  const config: MCPConfig = {
    enabled: $tw.wiki.getTiddlerText('$:/plugins/rryan/tiddly-mcp/configs/enabled', 'yes') === 'yes',
    readOnly: $tw.wiki.getTiddlerText('$:/plugins/rryan/tiddly-mcp/configs/read-only', 'yes') === 'yes',
    port: parseInt($tw.wiki.getTiddlerText('$:/plugins/rryan/tiddly-mcp/configs/port', '3100'), 10),
    corsOrigins: parseCorsOrigins($tw.wiki.getTiddlerText('$:/plugins/rryan/tiddly-mcp/configs/cors-origins', '*')),
    defaultContentType: $tw.wiki.getTiddlerText('$:/plugins/rryan/tiddly-mcp/configs/default-content-type', 'text/vnd.tiddlywiki'),
    logLevel: ($tw.wiki.getTiddlerText('$:/plugins/rryan/tiddly-mcp/configs/log-level', 'info') as MCPConfig['logLevel']),
  };
  console.log(`[MCP] Initializing TiddlyWiki MCP Server with config=${JSON.stringify(config)}`);

  // Check if MCP server is enabled
  if (!config.enabled) {
    console.log('[MCP] MCP Server is disabled in configuration');
    return;
  }

  try {
    // Get wiki instance (cast to our Wiki type)
    const wiki = $tw.wiki as unknown as Wiki;

    // Create MCP server
    const mcpServer = createMCPServer(wiki, config);

    // Create and start HTTP server
    const httpServer = createHTTPServer(mcpServer, config);

    // Store server instance for cleanup
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    ($tw as any).mcpServer = {
      mcp: mcpServer,
      http: httpServer,
    };

    console.log('[MCP] MCP Server initialized successfully');
  } catch (error) {
    console.error('[MCP] Failed to initialize MCP Server:', error);
  }
}

/**
 * Parse CORS origins from config string
 */
function parseCorsOrigins(originsString: string): string[] {
  if (!originsString || originsString.trim() === '*') {
    return ['*'];
  }

  return originsString
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

// TypeScript declarations for TiddlyWiki globals
declare global {
  var $tw: {
    node: boolean;
    wiki: Wiki;
    mcpServer?: {
      mcp: unknown;
      http: unknown;
    };
  };
}

// CommonJS export pattern for TiddlyWiki

declare var exports: {
  name: string;
  platforms: string[];
  after: string[];
  synchronous: boolean;
  startup: () => void;
};

exports.name = 'mcp-server';
exports.platforms = ['node']; // Only run on Node.js server
exports.after = ['load-modules']; // Run after modules are loaded
exports.synchronous = false; // Async initialization
exports.startup = startup;
