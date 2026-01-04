/**
 * HTTP Server with Web Standard Streamable HTTP Transport for MCP
 * Uses WebStandardStreamableHTTPServerTransport to avoid Hono dependency
 */

// eslint-disable-next-line @typescript-eslint/no-deprecated
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import http = require('http');
import type { IncomingMessage, ServerResponse } from 'http';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import url = require('url');
// eslint-disable-next-line @typescript-eslint/no-require-imports
import nodeCrypto = require('node:crypto');
import type { MCPConfig } from './types';

// Polyfill Web Standard APIs - TiddlyWiki's sandbox hides them
// Node.js 20+ has these built-in, but TiddlyWiki's eval sandbox blocks access
if (typeof Headers === 'undefined' || typeof Request === 'undefined' || typeof Response === 'undefined') {
  try {
    // Try using vm module to access the real global context
    const vm = require('vm'); // eslint-disable-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const script = new vm.Script(
      '({ Headers: globalThis.Headers, Request: globalThis.Request, Response: globalThis.Response, ReadableStream: globalThis.ReadableStream })',
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const context = script.runInThisContext();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unnecessary-condition
    if (context && context.Headers) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-unsafe-assignment
      (globalThis as any).Headers = context.Headers; // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      (globalThis as any).Request = context.Request; // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      (globalThis as any).Response = context.Response; // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      (globalThis as any).ReadableStream = context.ReadableStream; // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      console.log('[MCP] Set Web Standard APIs from vm context');
    } else {
      console.log('[MCP] vm context did not have Web Standard APIs');
    }
  } catch (error) {
    console.log('[MCP] Could not polyfill Web Standard APIs:', error);
  }
}

// Dynamic imports for Node.js modules at runtime
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const { WebStandardStreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js');

// Polyfill crypto global if needed
if (typeof crypto === 'undefined') {
  (globalThis as any).crypto = nodeCrypto.webcrypto || nodeCrypto; // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
}

// Polyfill TextEncoder/TextDecoder if needed
if (typeof TextEncoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const util = require('node:util');
  (globalThis as any).TextEncoder = util.TextEncoder; // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
  (globalThis as any).TextDecoder = util.TextDecoder; // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
}

/**
 * Convert Node.js IncomingMessage to Web Standard Request
 */
// eslint-disable-next-line @typescript-eslint/require-await
async function nodeRequestToWebRequest(request: IncomingMessage, body?: string): Promise<Request> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
  const HeadersClass = (globalThis as any).Headers || Headers;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
  const RequestClass = (globalThis as any).Request || Request; // eslint-disable-line @typescript-eslint/no-unnecessary-type-assertion

  const protocol = 'http:'; // TiddlyWiki runs over HTTP
  const host = request.headers.host || 'localhost';
  const urlString = `${protocol}//${host}${request.url}`;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const headers = new HeadersClass();
  for (const [key, value] of Object.entries(request.headers)) {
    if (value) {
      if (Array.isArray(value)) {
        for (const v of value) {
          headers.append(key, v); // eslint-disable-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        }
      } else {
        headers.set(key, value as string); // eslint-disable-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      }
    }
  }

  const init: RequestInit = {
    method: request.method,
    headers, // eslint-disable-line @typescript-eslint/no-unsafe-assignment
  };

  if (body && request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = body;
  }

  return new RequestClass(urlString, init);
}

/**
 * Convert Web Standard Response to Node.js response
 */
async function webResponseToNodeResponse(webResponse: Response, nodeResponse: ServerResponse): Promise<void> {
  // Set status
  nodeResponse.statusCode = webResponse.status;

  // Set headers
  webResponse.headers.forEach((value, key) => {
    nodeResponse.setHeader(key, value);
  });

  // Write body
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (webResponse.body) {
    const reader = webResponse.body.getReader();
    try {
      while (true) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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

/**
 * Create and start HTTP server with Web Standard Streamable HTTP transport
 * Maintains separate transport instances per session for multi-client support
 */
export function createHTTPServer(
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  mcpServer: Server,
  config: MCPConfig,
): http.Server {
  // Map to store transport instances by session ID
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transports = new Map<string, any>();

  /**
   * Get an existing transport for the given session ID
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getTransport(sessionId: string): any {
    const transport = transports.get(sessionId);
    if (!transport) {
      throw new Error(`No transport found for session: ${sessionId}`);
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        transport.close();
      } catch (error) {
        console.error(`[MCP] Error closing transport for session ${sessionId}:`, error);
      }
      transports.delete(sessionId);
    }
  }

  const server = http.createServer(async (request, response) => {
    console.log(`[MCP] ${request.method} ${request.url}`);

    const parsedUrl = url.parse(request.url || '/', true);
    const pathname = parsedUrl.pathname || '/';

    // Set CORS headers
    const origin = request.headers.origin || '*';
    const allowedOrigins = config.corsOrigins.length > 0 ? config.corsOrigins : ['*'];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const isAllowed = allowedOrigins.includes('*') || allowedOrigins.includes(origin as any);

    if (isAllowed) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      response.setHeader('Access-Control-Allow-Origin', origin as any);
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type, MCP-Session-ID');
      response.setHeader('Access-Control-Allow-Credentials', 'true');
      response.setHeader('Access-Control-Expose-Headers', 'MCP-Session-ID');
    }

    // Handle OPTIONS preflight
    if (request.method === 'OPTIONS') {
      response.writeHead(200);
      response.end();
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
            // eslint-disable-next-line @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let transport: any; // eslint-disable-line @typescript-eslint/no-explicit-any
        let webResponse: Response; // eslint-disable-line @typescript-eslint/no-explicit-any

        if (sessionId) {
          // Use existing transport for this session
          transport = getTransport(sessionId);
          webResponse = await transport.handleRequest(webRequest); // eslint-disable-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        } else {
          // No session ID - this should be a new initialization request
          // Create a new transport that will generate its own session ID
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          transport = new WebStandardStreamableHTTPServerTransport({
            sessionIdGenerator: () => nodeCrypto.randomUUID(),
          });

          // Connect transport to MCP server
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          await mcpServer.connect(transport);

          // Handle the request
          webResponse = await transport.handleRequest(webRequest); // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any

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
        await webResponseToNodeResponse(webResponse, response);
      } catch (error) {
        console.error('[MCP] Error handling request:', error);
        if (!response.headersSent) {
          response.writeHead(500, { 'Content-Type': 'application/json' });
          response.end(JSON.stringify({ error: String(error) }));
        }
      }
      return;
    }

    // Health check endpoint
    if (pathname === '/health') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({
        status: 'ok',
        service: 'tiddlywiki-mcp',
        activeSessions: transports.size,
      }));
      return;
    }

    if (pathname.startsWith('/.well-known/')) {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({}));
      return;
    }

    // 404 for all other paths
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end('Not Found. Available endpoints: /mcp, /health');
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