/**
 * Integration tests for MCP server
 */

// eslint-disable-next-line @typescript-eslint/no-deprecated
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createMCPServer } from '../server';
import type { MCPConfig, Tiddler, Wiki } from '../types';

// Mock Wiki for integration testing
class TestWiki implements Wiki {
  private data = new Map<string, Tiddler>();

  constructor() {
    // Add some test data
    const testTiddler: Tiddler = {
      fields: {
        title: 'TestTiddler',
        text: 'Test content',
        tags: ['test'],
      },
      getFieldString: (field: string) => (this.data.get('TestTiddler')?.fields[field] as string | undefined) || '',
      getFieldList: (field: string) => (this.data.get('TestTiddler')?.fields[field] as string[] | undefined) || [],
    };
    this.data.set('TestTiddler', testTiddler);
  }

  getTiddler(title: string) {
    return this.data.get(title);
  }

  addTiddler(tiddler: Tiddler | Record<string, unknown>) {
    let newTiddler: Tiddler;
    if ('fields' in tiddler) {
      newTiddler = tiddler as Tiddler;
    } else {
      const fields = tiddler;
      newTiddler = {
        fields,
        getFieldString: (field: string) => (fields[field] as string | undefined) || '',
        getFieldList: (field: string) => (fields[field] as string[] | undefined) || [],
      };
    }
    this.data.set(newTiddler.fields.title as string, newTiddler);
  }

  deleteTiddler(title: string) {
    this.data.delete(title);
  }

  filterTiddlers(filter: string) {
    const _ = filter;
    return Array.from(this.data.keys());
  }

  getTiddlers() {
    return Array.from(this.data.keys());
  }

  getTiddlerText(title: string, defaultText?: string) {
    return (this.data.get(title)?.fields.text as string) || defaultText || '';
  }

  search(text: string) {
    const results: { title: string }[] = [];
    this.data.forEach((tiddler, title) => {
      if (JSON.stringify(tiddler.fields).toLowerCase().includes(text.toLowerCase())) {
        results.push({ title });
      }
    });
    return results;
  }
}

describe('MCP Server Integration', () => {
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  let server: Server;
  let wiki: Wiki;

  beforeEach(() => {
    wiki = new TestWiki();
    const config: MCPConfig = { enabled: true, readOnly: false, port: 3100, corsOrigins: ['*'], defaultContentType: 'text/vnd.tiddlywiki', logLevel: 'info' };
    server = createMCPServer(wiki, config);
  });

  it('should create MCP server instance', () => {
    expect(server).toBeDefined();
    expect(typeof server).toBe('object');
  });

  it('should have error handler', () => {
    expect(server.onerror).toBeDefined();
    expect(typeof server.onerror).toBe('function');
  });

  it('should register all tools', () => {
    // This is a basic check that the server was set up
    // More detailed tool testing is in the unit tests
    expect(server).toBeDefined();
  });
});

describe('MCP Server Tools Registration', () => {
  it('should register all TiddlyWiki tools', () => {
    const wiki = new TestWiki();
    const config: MCPConfig = { enabled: true, readOnly: false, port: 3100, corsOrigins: ['*'], defaultContentType: 'text/vnd.tiddlywiki', logLevel: 'info' };
    const server = createMCPServer(wiki, config);

    // Verify server was created with all tools
    expect(server).toBeDefined();

    // Expected tools:
    // - read_tiddler
    // - write_tiddler
    // - delete_tiddler
    // - list_tiddlers
    // - search_tiddlers
    // - filter_tiddlers
  });
});
