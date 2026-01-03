/**
 * Comprehensive unit tests for TiddlyWiki MCP tools
 */

import type { Wiki } from '../../types';
import { deleteTiddlerTool } from '../delete-tiddler';
import { listTiddlersTool } from '../list-tiddlers';
import { readTiddlerTool } from '../read-tiddler';
import { searchTiddlersTool } from '../search-tiddlers';
import { writeTiddlerTool } from '../write-tiddler';

// Mock Wiki implementation for testing
class MockWiki implements Wiki {
  private tiddlers: Map<string, any> = new Map();

  constructor(initialTiddlers: any[] = []) {
    initialTiddlers.forEach(tiddler => {
      this.tiddlers.set(tiddler.title, {
        fields: tiddler,
        getFieldString: (field: string) => tiddler[field] || '',
        getFieldList: (field: string) => tiddler[field] || [],
      });
    });
  }

  getTiddler(title: string) {
    return this.tiddlers.get(title);
  }

  addTiddler(tiddler: any) {
    const title = tiddler.title;
    this.tiddlers.set(title, {
      fields: tiddler,
      getFieldString: (field: string) => tiddler[field] || '',
      getFieldList: (field: string) => tiddler[field] || [],
    });
  }

  deleteTiddler(title: string) {
    this.tiddlers.delete(title);
  }

  filterTiddlers(filter: string) {
    // Simple mock implementation
    const titles = Array.from(this.tiddlers.keys());

    if (filter.includes('[tag[')) {
      const tagMatch = filter.match(/\[tag\[([^\]]+)\]\]/);
      if (tagMatch) {
        const tag = tagMatch[1];
        return titles.filter(title => {
          const tiddler = this.tiddlers.get(title);
          return tiddler?.fields.tags?.includes(tag);
        });
      }
    }

    return titles;
  }

  getTiddlers() {
    return Array.from(this.tiddlers.keys());
  }

  getTiddlerText(title: string, defaultText?: string) {
    const tiddler = this.tiddlers.get(title);
    return tiddler?.fields.text || defaultText || '';
  }

  search(text: string, options?: any) {
    const results: any[] = [];
    this.tiddlers.forEach((tiddler, title) => {
      const searchIn = options?.field
        ? tiddler.fields[options.field] || ''
        : JSON.stringify(tiddler.fields);

      const query = options?.caseSensitive ? text : text.toLowerCase();
      const content = options?.caseSensitive ? searchIn : searchIn.toLowerCase();

      if (content.includes(query)) {
        results.push({ title });
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
      const data = JSON.parse(result.content[0].text);

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
      const data = JSON.parse(result.content[0].text);

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
      const data = JSON.parse(result.content[0].text);

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
      const data = JSON.parse(result.content[0].text);

      expect(data.tiddlers).toContain('Regular');
      expect(data.tiddlers).not.toContain('$:/system');
    });

    it('should include system tiddlers when requested', async () => {
      const wiki = new MockWiki([
        { title: 'Regular', text: 'Content' },
        { title: '$:/system', text: 'System' },
      ]);

      const result = await listTiddlersTool.handler({ includeSystem: true }, wiki);
      const data = JSON.parse(result.content[0].text);

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
      const data = JSON.parse(result.content[0].text);

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
      const data = JSON.parse(result.content[0].text);

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
      const data = JSON.parse(result.content[0].text);

      expect(data.results).toContain('Upper');
      expect(data.results).not.toContain('Lower');
    });

    it('should return empty results when no matches', async () => {
      const wiki = new MockWiki([
        { title: 'T1', text: 'Content' },
      ]);

      const result = await searchTiddlersTool.handler({ query: 'nomatch' }, wiki);
      const data = JSON.parse(result.content[0].text);

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
      const data = JSON.parse(result.content[0].text);

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
      const data = JSON.parse(result.content[0].text);

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
      const data = JSON.parse(result.content[0].text);

      expect(data.tiddlers[0].title).toBeDefined();
      expect(data.tiddlers[0].text).toBeDefined();
      expect(data.tiddlers[0].tags).toBeDefined();
      expect(data.tiddlers[0].type).toBeDefined();
    });
  });
});
