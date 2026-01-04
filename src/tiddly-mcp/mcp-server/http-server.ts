/**
 * HTTP Server with Web Standard Streamable HTTP Transport for MCP
 * Uses WebStandardStreamableHTTPServerTransport to avoid Hono dependency
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { MCPConfig } from './types';

/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

// Polyfill Web Standard APIs - TiddlyWiki's sandbox hides them
// Node.js 20+ has these built-in, but TiddlyWiki's eval sandbox blocks access
if (typeof Headers === 'undefined' || typeof Request === 'undefined' || typeof Response === 'undefined') {
  try {
    // Try using vm module to access the real global context
    const vm = require('vm');
    const script = new vm.Script('({ Headers: globalThis.Headers, Request: globalThis.Request, Response: globalThis.Response, ReadableStream: globalThis.ReadableStream })');
    const context = script.runInThisContext();

    if (context && context.Headers) {
      (globalThis as Record<string, unknown>).Headers = context.Headers;
      (globalThis as Record<string, unknown>).Request = context.Request;
      (globalThis as Record<string, unknown>).Response = context.Response;
      (globalThis as Record<string, unknown>).ReadableStream = context.ReadableStream;
      console.log('[MCP] Set Web Standard APIs from vm context');
    } else {
      console.log('[MCP] vm context did not have Web Standard APIs');
    }
  } catch (error) {
    console.log('[MCP] Could not polyfill Web Standard APIs:', error);
  }
}

// Dynamic imports for Node.js modules at runtime
const http = require('http');
const url = require('url');
const nodeCrypto = require('node:crypto');
const { WebStandardStreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js');

// Polyfill crypto global if needed
if (typeof crypto === 'undefined') {
  (globalThis as Record<string, unknown>).crypto = nodeCrypto.webcrypto || nodeCrypto;
}

// Polyfill TextEncoder/TextDecoder if needed
if (typeof TextEncoder === 'undefined') {
  const util = require('node:util');
  (globalThis as Record<string, unknown>).TextEncoder = util.TextEncoder;
  (globalThis as Record<string, unknown>).TextDecoder = util.TextDecoder;
}

/* eslint-enable @typescript-eslint/no-require-imports */
/* eslint-enable @typescript-eslint/no-unsafe-assignment */
/* eslint-enable @typescript-eslint/no-unsafe-member-access */
/* eslint-enable @typescript-eslint/no-unsafe-call */

/**
 * Transport interface for MCP server
 */
interface MCPTransport {
  handleRequest(request: Request): Promise<Response>;
  close(): void;
}

/**
 * Convert Node.js IncomingMessage to Web Standard Request
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-condition */
function nodeRequestToWebRequest(request: http.IncomingMessage, body?: string): Request {
  const HeadersClass = (globalThis as Record<string, unknown>).Headers as typeof Headers || Headers;
  const RequestClass = (globalThis as Record<string, unknown>).Request as typeof Request || Request;

  const protocol = 'http:'; // TiddlyWiki runs over HTTP
  const host = request.headers.host ?? 'localhost';
  const urlString = `${protocol}//${host}${request.url ?? ''}`;

  const headers = new HeadersClass();
  for (const [key, value] of Object.entries(request.headers)) {
    if (value) {
      if (Array.isArray(value)) {
        for (const v of value) {
          headers.append(key, v);
        }
      } else {
        headers.set(key, value);
      }
    }
  }

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (body && request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = body;
  }

  return new RequestClass(urlString, init);
}
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-condition */

/**
 * Convert Web Standard Response to Node.js response
 */
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unnecessary-condition */
async function webResponseToNodeResponse(webResponse: Response, nodeResponse: http.ServerResponse): Promise<void> {
  // Set status
  nodeResponse.statusCode = webResponse.status;

  // Set headers
  webResponse.headers.forEach((value, key) => {
    nodeResponse.setHeader(key, value);
  });

  // Write body
  if (webResponse.body) {
    const reader = webResponse.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        nodeResponse.write(value);
      }
    } finally {
      reader.releaseLock();
    }
  }

  nodeResponse.end();
}
/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unnecessary-condition */

/**
 * Create and start HTTP server with Web Standard Streamable HTTP transport
 * Maintains separate transport instances per session for multi-client support
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/await-thenable, @typescript-eslint/restrict-plus-operands, unicorn/prevent-abbreviations, @typescript-eslint/no-deprecated */
export function createHTTPServer(
  mcpServer: Server,
  config: MCPConfig,
): http.Server {
  // Map to store transport instances by session ID
  const transports = new Map<string, MCPTransport>();

  /**
   * Get an existing transport for the given session ID
   */
  function getTransport(sessionId: string): MCPTransport {
    const transport = transports.get(sessionId);
    if (!transport) {
      throw new Error(`No transport found for session: ${sessionId}`);
    }
    return transport;
  }

  /**
   * Clean up transport for a session
   */
  function closeTransport(sessionId: string): void {
    const transport = transports.get(sessionId);
    if (transport) {
      console.log(`[MCP] Closing transport for session: ${sessionId}`);
      try {
        transport.close();
      } catch (error) {
        console.error(`[MCP] Error closing transport for session ${sessionId}:`, error);
      }
      transports.delete(sessionId);
    }
  }

  const server = http.createServer(async (request, res) => {
    console.log(`[MCP] ${request.method} ${request.url}`);

    const parsedUrl = url.parse(request.url || '/', true);
    const pathname = parsedUrl.pathname || '/';

    // Set CORS headers
    const origin = request.headers.origin || '*';
    const allowedOrigins = config.corsOrigins.length > 0 ? config.corsOrigins : ['*'];
    const isAllowed = allowedOrigins.includes('*') || allowedOrigins.includes(origin);

    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, MCP-Session-ID');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Expose-Headers', 'MCP-Session-ID');
    }

    // Handle OPTIONS preflight
    if (request.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Handle MCP endpoint
    if (pathname === '/mcp') {
      try {
        // Extract session ID from header
        const sessionId = request.headers['mcp-session-id'] as string;

        // Read request body if POST
        let body = '';
        if (request.method === 'POST') {
          request.on('data', (chunk) => {
            body += chunk.toString();
          });

          await new Promise<void>((resolve) => {
            request.on('end', () => {
              resolve();
            });
          });
        }

        // Convert to Web Standard Request
        const webRequest = await nodeRequestToWebRequest(request, body || undefined);

        let transport;
        let webResponse;

        if (sessionId) {
          // Use existing transport for this session
          transport = getTransport(sessionId);
          webResponse = await transport.handleRequest(webRequest);
        } else {
          // No session ID - this should be a new initialization request
          // Create a new transport that will generate its own session ID
          transport = new WebStandardStreamableHTTPServerTransport({
            sessionIdGenerator: () => nodeCrypto.randomUUID(),
          });

          // Connect transport to MCP server
          await mcpServer.connect(transport);

          // Handle the request
          webResponse = await transport.handleRequest(webRequest);

          // Extract the session ID that the transport generated and stored
          // The transport stores it internally and returns it in response headers
          const responseSessionId = webResponse.headers.get('mcp-session-id');
          if (responseSessionId) {
            // Store this transport for future requests with this session ID
            transports.set(responseSessionId, transport);
            console.log(`[MCP] Created new session: ${responseSessionId}`);
          }
        }

        // Convert Web Standard Response back to Node.js response
        await webResponseToNodeResponse(webResponse, res);
      } catch (error) {
        console.error('[MCP] Error handling request:', error);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: String(error) }));
        }
      }
      return;
    }

    // Health check endpoint
    if (pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        service: 'tiddlywiki-mcp',
        activeSessions: transports.size,
      }));
      return;
    }

    if (pathname.startsWith('/.well-known/')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({}));
      return;
    }

    // 404 for all other paths
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found. Available endpoints: /mcp, /health');
  });

  server.listen(config.port, () => {
    console.log(`[MCP] TiddlyWiki MCP Server started on port ${config.port}`);
    console.log(`[MCP] Streamable HTTP endpoint: http://localhost:${config.port}/mcp`);
    console.log(`[MCP] Health check: http://localhost:${config.port}/health`);
  });

  server.on('error', (error) => {
    console.error('[MCP] HTTP Server error:', error);
  });

  // Clean up all transports on server close
  server.on('close', () => {
    console.log('[MCP] Server closing, cleaning up all transports');
    transports.forEach((_, sessionId) => {
      closeTransport(sessionId);
    });
  });

  return server;
}
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/await-thenable, @typescript-eslint/restrict-plus-operands, unicorn/prevent-abbreviations, @typescript-eslint/no-deprecated */
