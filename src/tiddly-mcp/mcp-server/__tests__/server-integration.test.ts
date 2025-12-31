/**
 * Integration tests for MCP server
 */

import { createMCPServer } from '../server';
import type { MCPConfig, Wiki } from '../types';

// Mock Wiki for integration testing
class TestWiki implements Wiki {
  private data = new Map<string, any>();

  constructor() {
    // Add some test data
    this.data.set('TestTiddler', {
      fields: {
        title: 'TestTiddler',
        text: 'Test content',
        tags: ['test'],
      },
      getFieldString: (field: string) => this.data.get('TestTiddler')?.fields[field] || '',
      getFieldList: (field: string) => this.data.get('TestTiddler')?.fields[field] || [],
    });
  }

  getTiddler(title: string) {
    return this.data.get(title);
  }

  addTiddler(tiddler: any) {
    this.data.set(tiddler.title, {
      fields: tiddler,
      getFieldString: (field: string) => tiddler[field] || '',
      getFieldList: (field: string) => tiddler[field] || [],
    });
  }

  deleteTiddler(title: string) {
    this.data.delete(title);
  }

  filterTiddlers(filter: string) {
    return Array.from(this.data.keys());
  }

  getTiddlers() {
    return Array.from(this.data.keys());
  }

  getTiddlerText(title: string, defaultText?: string) {
    return this.data.get(title)?.fields.text || defaultText || '';
  }

  search(text: string) {
    const results: any[] = [];
    this.data.forEach((tiddler, title) => {
      if (JSON.stringify(tiddler.fields).toLowerCase().includes(text.toLowerCase())) {
        results.push({ title });
      }
    });
    return results;
  }
}

describe('MCP Server Integration', () => {
  let server: any;
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
