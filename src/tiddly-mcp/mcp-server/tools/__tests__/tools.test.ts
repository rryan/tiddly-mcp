/**
 * Comprehensive unit tests for TiddlyWiki MCP tools
 */

import type { Tiddler, TiddlerFieldValue, Wiki } from '../../types';
import { deleteTiddlerTool } from '../delete-tiddler';
import { listTiddlersTool } from '../list-tiddlers';
import { readTiddlerTool } from '../read-tiddler';
import { searchTiddlersTool } from '../search-tiddlers';
import { writeTiddlerTool } from '../write-tiddler';

// Mock tiddler data structure
interface MockTiddlerData {
  fields: Record<string, TiddlerFieldValue>;
  getFieldString: (field: string) => string;
  getFieldList: (field: string) => string[];
}

/**
 * Parse JSON response from tool result
 */
function parseToolResponse(text: string): Record<string, unknown> {
  return JSON.parse(text) as Record<string, unknown>;
}

// Mock Wiki implementation for testing
class MockWiki implements Wiki {
  private tiddlers: Map<string, MockTiddlerData> = new Map();

  constructor(initialTiddlers: Array<Record<string, TiddlerFieldValue>> = []) {
    initialTiddlers.forEach(tiddlerFields => {
      const title = typeof tiddlerFields.title === 'string' ? tiddlerFields.title : '';
      this.tiddlers.set(title, {
        fields: tiddlerFields,
        getFieldString: (field: string) => {
          const value = tiddlerFields[field];
          return typeof value === 'string' ? value : '';
        },
        getFieldList: (field: string) => {
          const value = tiddlerFields[field];
          return Array.isArray(value) ? value : [];
        },
      });
    });
  }

  getTiddler(title: string): Tiddler | undefined {
    return this.tiddlers.get(title);
  }

  addTiddler(tiddler: Tiddler | Record<string, TiddlerFieldValue>): void {
    const fields: Record<string, TiddlerFieldValue> = 'fields' in tiddler ? tiddler.fields : tiddler;
    const title = typeof fields.title === 'string' ? fields.title : '';
    const fieldsForClosure = fields;
    this.tiddlers.set(title, {
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
    this.tiddlers.delete(title);
  }

  filterTiddlers(filter: string): string[] {
    // Simple mock implementation
    const titles = Array.from(this.tiddlers.keys());

    if (filter.includes('[tag[')) {
      const tagMatch = /\[tag\[([^\]]+)\]\]/.exec(filter);
      if (tagMatch) {
        const tag = tagMatch[1];
        return titles.filter(title => {
          const tiddler = this.tiddlers.get(title);
          const tags = tiddler?.fields.tags;
          return Array.isArray(tags) && tags.includes(tag);
        });
      }
    }

    return titles;
  }

  getTiddlers(): string[] {
    return Array.from(this.tiddlers.keys());
  }

  getTiddlerText(title: string, defaultText?: string): string {
    const tiddler = this.tiddlers.get(title);
    const text = tiddler?.fields.text;
    return typeof text === 'string' ? text : (defaultText ?? '');
  }

  search(text: string, options?: Record<string, unknown>): string[] {
    const results: string[] = [];
    this.tiddlers.forEach((tiddler) => {
      const field = typeof options?.field === 'string' ? options.field : undefined;
      const searchIn = field
        ? String(tiddler.fields[field] ?? '')
        : JSON.stringify(tiddler.fields);

      const caseSensitive = options?.caseSensitive === true;
      const query = caseSensitive ? text : text.toLowerCase();
      const content = caseSensitive ? searchIn : searchIn.toLowerCase();

      if (content.includes(query)) {
        results.push(tiddler.fields.title);
      }
    });
    return results;
  }
}

describe('TiddlyWiki MCP Tools', () => {
  describe('Read Tiddler Tool', () => {
    it('should read an existing tiddler', async () => {
      const wiki = new MockWiki([
        {
          title: 'TestTiddler',
          text: 'This is test content',
          tags: ['test', 'demo'],
          type: 'text/vnd.tiddlywiki',
        },
      ]);

      const result = await readTiddlerTool.handler({ title: 'TestTiddler' }, wiki);
      const data = parseToolResponse(result.content[0].text);

      expect(data.title).toBe('TestTiddler');
      expect(data.text).toBe('This is test content');
      expect(data.tags).toEqual(['test', 'demo']);
      expect(result.isError).toBeUndefined();
    });

    it('should return error for non-existent tiddler', async () => {
      const wiki = new MockWiki();
      const result = await readTiddlerTool.handler({ title: 'NonExistent' }, wiki);

      expect(result.content[0].text).toContain('not found');
      expect(result.isError).toBe(true);
    });

    it('should handle system tiddlers', async () => {
      const wiki = new MockWiki([
        {
          title: '$:/config/test',
          text: 'System config',
          type: 'text/vnd.tiddlywiki',
        },
      ]);

      const result = await readTiddlerTool.handler({ title: '$:/config/test' }, wiki);
      const data = parseToolResponse(result.content[0].text);

      expect(data.title).toBe('$:/config/test');
      expect(data.text).toBe('System config');
    });
  });

  describe('Write Tiddler Tool', () => {
    it('should create a new tiddler', async () => {
      const wiki = new MockWiki();
      const result = await writeTiddlerTool.handler(
        {
          title: 'NewTiddler',
          text: 'New content',
          username: 'test-user',
          type: 'type',
          tags: ['new'],
        },
        wiki,
      );

      expect(result.content[0].text).toContain('created');
      expect(result.isError).toBeUndefined();

      const tiddler = wiki.getTiddler('NewTiddler');
      expect(tiddler?.fields.creator).toBe('test-user');
      expect(tiddler?.fields.created).toBeDefined();
      expect(tiddler?.fields.modifier).toBe('test-user');
      expect(tiddler?.fields.modified).toBeDefined();
      expect(tiddler?.fields.text).toBe('New content');
      expect(tiddler?.fields.type).toBe('type');
      expect(tiddler?.fields.tags).toEqual(['new']);
    });

    it('should update an existing tiddler', async () => {
      const created = new Date();
      created.setHours(created.getHours() - 2);

      const wiki = new MockWiki([
        {
          title: 'ExistingTiddler',
          text: 'Old content',
          tags: ['old'],
          creator: 'original-user',
          created,
          modifier: 'original-user',
          modified: created,
        },
      ]);

      const result = await writeTiddlerTool.handler(
        {
          title: 'ExistingTiddler',
          text: 'Updated content',
          tags: ['updated'],
          username: 'test-user',
        },
        wiki,
      );

      expect(result.content[0].text).toContain('updated');

      const tiddler = wiki.getTiddler('ExistingTiddler');
      expect(tiddler?.fields.text).toBe('Updated content');
      expect(tiddler?.fields.tags).toEqual(['updated']);
      expect(tiddler?.fields.creator).toBe('original-user');
      expect(tiddler?.fields.created).toEqual(created);
      expect(tiddler?.fields.modifier).toBe('test-user');
      expect(tiddler?.fields.modified).not.toEqual(created);
    });

    it('should set default content type', async () => {
      const wiki = new MockWiki([
        {
          title: '$:/plugins/rryan/tiddly-mcp/configs/default-content-type',
          text: 'default-content-type',
        },
      ]);
      await writeTiddlerTool.handler(
        {
          title: 'DefaultType',
          text: 'Content',
        },
        wiki,
      );

      const tiddler = wiki.getTiddler('DefaultType');
      expect(tiddler?.fields.type).toBe('default-content-type');
    });
  });

  describe('Delete Tiddler Tool', () => {
    it('should delete an existing tiddler', async () => {
      const wiki = new MockWiki([
        {
          title: 'ToDelete',
          text: 'This will be deleted',
        },
      ]);

      const result = await deleteTiddlerTool.handler({ title: 'ToDelete' }, wiki);

      expect(result.content[0].text).toContain('deleted successfully');
      expect(result.isError).toBeUndefined();
      expect(wiki.getTiddler('ToDelete')).toBeUndefined();
    });

    it('should return error for non-existent tiddler', async () => {
      const wiki = new MockWiki();
      const result = await deleteTiddlerTool.handler({ title: 'NonExistent' }, wiki);

      expect(result.content[0].text).toContain('not found');
      expect(result.isError).toBe(true);
    });
  });

  describe('List Tiddlers Tool', () => {
    it('should list all tiddlers', async () => {
      const wiki = new MockWiki([
        { title: 'Tiddler1', text: 'Content 1' },
        { title: 'Tiddler2', text: 'Content 2' },
        { title: 'Tiddler3', text: 'Content 3' },
      ]);

      const result = await listTiddlersTool.handler({}, wiki);
      const data = parseToolResponse(result.content[0].text);

      expect(data.count).toBe(3);
      expect(data.tiddlers).toContain('Tiddler1');
      expect(data.tiddlers).toContain('Tiddler2');
      expect(data.tiddlers).toContain('Tiddler3');
    });

    it('should filter out system tiddlers by default', async () => {
      const wiki = new MockWiki([
        { title: 'Regular', text: 'Content' },
        { title: '$:/system', text: 'System' },
      ]);

      const result = await listTiddlersTool.handler({}, wiki);
      const data = parseToolResponse(result.content[0].text);

      expect(data.tiddlers).toContain('Regular');
      expect(data.tiddlers).not.toContain('$:/system');
    });

    it('should include system tiddlers when requested', async () => {
      const wiki = new MockWiki([
        { title: 'Regular', text: 'Content' },
        { title: '$:/system', text: 'System' },
      ]);

      const result = await listTiddlersTool.handler({ includeSystem: true }, wiki);
      const data = parseToolResponse(result.content[0].text);

      expect(data.tiddlers).toContain('Regular');
      expect(data.tiddlers).toContain('$:/system');
    });

    it('should apply limit', async () => {
      const wiki = new MockWiki([
        { title: 'T1', text: '1' },
        { title: 'T2', text: '2' },
        { title: 'T3', text: '3' },
        { title: 'T4', text: '4' },
      ]);

      const result = await listTiddlersTool.handler({ limit: 2 }, wiki);
      const data = parseToolResponse(result.content[0].text);

      expect(data.count).toBe(2);
      expect(data.tiddlers.length).toBe(2);
    });
  });

  describe('Search Tiddlers Tool', () => {
    it('should find tiddlers by text', async () => {
      const wiki = new MockWiki([
        { title: 'Match1', text: 'This contains the keyword test' },
        { title: 'Match2', text: 'Another test document' },
        { title: 'NoMatch', text: 'Different content' },
      ]);

      const result = await searchTiddlersTool.handler({ query: 'test' }, wiki);
      const data = parseToolResponse(result.content[0].text);

      expect(data.count).toBe(2);
      expect(data.results).toContain('Match1');
      expect(data.results).toContain('Match2');
      expect(data.results).not.toContain('NoMatch');
    });

    it('should handle case-sensitive search', async () => {
      const wiki = new MockWiki([
        { title: 'Lower', text: 'test' },
        { title: 'Upper', text: 'TEST' },
        { title: 'Mixed', text: 'Test' },
      ]);

      const result = await searchTiddlersTool.handler(
        { query: 'TEST', caseSensitive: true },
        wiki,
      );
      const data = parseToolResponse(result.content[0].text);

      expect(data.results).toContain('Upper');
      expect(data.results).not.toContain('Lower');
    });

    it('should return empty results when no matches', async () => {
      const wiki = new MockWiki([
        { title: 'T1', text: 'Content' },
      ]);

      const result = await searchTiddlersTool.handler({ query: 'nomatch' }, wiki);
      const data = parseToolResponse(result.content[0].text);

      expect(data.count).toBe(0);
      expect(data.results).toEqual([]);
    });
  });

  describe('List Tiddlers Tool - Filter Support', () => {
    it('should execute basic filter', async () => {
      const wiki = new MockWiki([
        { title: 'T1', text: 'Content 1', tags: ['journal'] },
        { title: 'T2', text: 'Content 2', tags: ['journal'] },
        { title: 'T3', text: 'Content 3', tags: ['note'] },
      ]);

      const result = await listTiddlersTool.handler(
        { filter: '[tag[journal]]' },
        wiki,
      );
      const data = parseToolResponse(result.content[0].text);

      expect(data.count).toBe(2);
      expect(data.tiddlers).toContain('T1');
      expect(data.tiddlers).toContain('T2');
      expect(data.tiddlers).not.toContain('T3');
    });

    it('should return tiddler titles by default', async () => {
      const wiki = new MockWiki([
        { title: 'T1', text: 'Content' },
      ]);

      const result = await listTiddlersTool.handler(
        { filter: '[all[tiddlers]]', includeDetails: false },
        wiki,
      );
      const data = parseToolResponse(result.content[0].text);

      expect(Array.isArray(data.tiddlers)).toBe(true);
      expect(typeof data.tiddlers[0]).toBe('string');
    });

    it('should return detailed info when requested', async () => {
      const wiki = new MockWiki([
        {
          title: 'Detailed',
          text: 'Content',
          tags: ['test'],
          type: 'text/vnd.tiddlywiki',
        },
      ]);

      const result = await listTiddlersTool.handler(
        { filter: '[all[tiddlers]]', includeDetails: true },
        wiki,
      );
      const data = parseToolResponse(result.content[0].text);
      const tiddlers = data.tiddlers as Array<Record<string, unknown>>;

      expect(tiddlers[0]?.title).toBeDefined();
      expect(tiddlers[0]?.text).toBeDefined();
      expect(tiddlers[0]?.tags).toBeDefined();
      expect(tiddlers[0]?.type).toBeDefined();
    });
  });
});
