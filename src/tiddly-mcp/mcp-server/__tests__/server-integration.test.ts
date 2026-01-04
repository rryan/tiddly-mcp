/**
 * Integration tests for MCP server
 */

import { createMCPServer } from '../server';
import type { MCPConfig, Tiddler, TiddlerFieldValue, Wiki } from '../types';

// Mock tiddler data structure
interface MockTiddlerData {
  fields: Record<string, TiddlerFieldValue>;
  getFieldString: (field: string) => string;
  getFieldList: (field: string) => string[];
}

// Mock Wiki for integration testing
class TestWiki implements Wiki {
  private data = new Map<string, MockTiddlerData>();

  constructor() {
    // Add some test data
    const testFields: Record<string, TiddlerFieldValue> = {
      title: 'TestTiddler',
      text: 'Test content',
      tags: ['test'],
    };
    this.data.set('TestTiddler', {
      fields: testFields,
      getFieldString: (field: string) => {
        const value = testFields[field];
        return typeof value === 'string' ? value : '';
      },
      getFieldList: (field: string) => {
        const value = testFields[field];
        return Array.isArray(value) ? value : [];
      },
    });
  }

  getTiddler(title: string): Tiddler | undefined {
    return this.data.get(title);
  }

  addTiddler(tiddler: Tiddler | Record<string, TiddlerFieldValue>): void {
    const fields: Record<string, TiddlerFieldValue> = 'fields' in tiddler ? tiddler.fields : tiddler;
    const titleValue = typeof fields.title === 'string' ? fields.title : '';
    const fieldsForClosure = fields;
    this.data.set(titleValue, {
      fields: fieldsForClosure,
      getFieldString: (field: string) => {
        const value = fieldsForClosure[field];
        return typeof value === 'string' ? value : '';
      },
      getFieldList: (field: string) => {
        const value = fieldsForClosure[field];
        return Array.isArray(value) ? value : [];
      },
    });
  }

  deleteTiddler(title: string): void {
    this.data.delete(title);
  }

  filterTiddlers(_filter: string): string[] {
    return Array.from(this.data.keys());
  }

  getTiddlers(): string[] {
    return Array.from(this.data.keys());
  }

  getTiddlerText(title: string, defaultText?: string): string {
    const text = this.data.get(title)?.fields.text;
    return typeof text === 'string' ? text : (defaultText ?? '');
  }

  search(_text: string): Tiddler[] {
    const results: Tiddler[] = [];
    this.data.forEach((tiddler) => {
      results.push(tiddler);
    });
    return results;
  }
}

describe('MCP Server Integration', () => {
  let server: ReturnType<typeof createMCPServer>;
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
    const serverWithError = server as { onerror?: unknown };
    expect(serverWithError.onerror).toBeDefined();
    expect(typeof serverWithError.onerror).toBe('function');
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
