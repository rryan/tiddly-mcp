#!/usr/bin/env node

/**
 * Live MCP Tools Testing Script
 * This script actually calls the MCP server tools and verifies they work
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { ListToolsResultSchema, CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';

const MCP_URL = 'http://localhost:3100/mcp';

console.log('TiddlyWiki MCP Tools Live Test\n');

async function testMCPServer() {
  console.log(`Connecting to MCP server at ${MCP_URL}...`);

  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));
  const client = new Client({
    name: 'test-client',
    version: '1.0.0',
  }, {
    capabilities: {},
  });

  try {
    await client.connect(transport);
    console.log('Connected to MCP server\n');

    // Test 1: List available tools
    console.log('Test 1: Listing available tools');
    const toolsResult = await client.request({
      method: 'tools/list',
    }, ListToolsResultSchema);
    console.log(`Found ${toolsResult.tools.length} tools:`);
    toolsResult.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    console.log();

    // Test 2: List tiddlers
    console.log('Test 2: Listing tiddlers');
    const listResult = await client.request({
      method: 'tools/call',
      params: {
        name: 'list_tiddlers',
        arguments: {
          limit: 5,
          includeSystem: false,
        },
      },
    }, CallToolResultSchema);
    const listData = JSON.parse(listResult.content[0].text);
    console.log(`Found ${listData.count} tiddlers (showing first 5):`);
    listData.tiddlers.slice(0, 5).forEach(title => {
      console.log(`  - ${title}`);
    });
    console.log();

    // Test 3: Write a test tiddler
    console.log('Test 3: Writing a test tiddler');
    const writeResult = await client.request({
      method: 'tools/call',
      params: {
        name: 'write_tiddler',
        arguments: {
          title: 'MCPTestTiddler',
          text: 'This is a test tiddler created by the MCP test script',
          username: 'test-tools-live',
          type: 'text/markdown',
          tags: ['test', 'mcp', 'automated'],
        },
      },
    }, CallToolResultSchema);
    console.log(`Write result: ${writeResult.content[0].text}`);
    console.log();

    // Test 4: Read the test tiddler back
    console.log('Test 4: Reading the test tiddler');
    const readResult = await client.request({
      method: 'tools/call',
      params: {
        name: 'read_tiddler',
        arguments: {
          title: 'MCPTestTiddler',
        },
      },
    }, CallToolResultSchema);
    const readData = JSON.parse(readResult.content[0].text);
    console.log(`Read tiddler: ${readData.title}`);
    console.log(readData);
    console.log();

    // Test 5: Update the test tiddler
    console.log('Test 5: Updating a test tiddler');
    const updateResult = await client.request({
      method: 'tools/call',
      params: {
        name: 'write_tiddler',
        arguments: {
          title: 'MCPTestTiddler',
          text: 'This is an updated tiddler created by the MCP test script',
          username: 'auto-updater',
          type: 'text/vnd.tiddlywiki',
          tags: ['test', 'mcp', 'zzz'],
        },
      },
    }, CallToolResultSchema);
    console.log(`Write result: ${updateResult.content[0].text}`);
    console.log();

    // Test 6: Read the test tiddler back
    console.log('Test 6: Reading the test tiddler');
    const readUpdateResult = await client.request({
      method: 'tools/call',
      params: {
        name: 'read_tiddler',
        arguments: {
          title: 'MCPTestTiddler',
        },
      },
    }, CallToolResultSchema);
    const readUpdateData = JSON.parse(readUpdateResult.content[0].text);
    console.log(`Read tiddler: ${readUpdateData.title}`);
    console.log(readUpdateData);
    console.log();

    // Test 7: Search for the test tiddler
    console.log('Test 7: Searching for test tiddler');
    const searchResult = await client.request({
      method: 'tools/call',
      params: {
        name: 'search_tiddlers',
        arguments: {
          query: 'MCP test',
        },
      },
    }, CallToolResultSchema);
    const searchData = JSON.parse(searchResult.content[0].text);
    console.log(`Search found ${searchData.count} results:`);
    searchData.results.forEach(title => {
      console.log(`  - ${title}`);
    });
    console.log();

    // Test 8: Filter tiddlers by tag
    console.log('Test 8: Filtering tiddlers by tag');
    const filterResult = await client.request({
      method: 'tools/call',
      params: {
        name: 'list_tiddlers',
        arguments: {
          filter: '[tag[test]]',
        },
      },
    }, CallToolResultSchema);
    const filterData = JSON.parse(filterResult.content[0].text);
    console.log(`Filter found ${filterData.count} tiddlers with tag 'test':`);
    filterData.tiddlers.forEach(title => {
      console.log(`  - ${title}`);
    });
    console.log();

    // Test 9: Delete the test tiddler
    console.log('Test 9: Deleting test tiddler');
    const deleteResult = await client.request({
      method: 'tools/call',
      params: {
        name: 'delete_tiddler',
        arguments: {
          title: 'MCPTestTiddler',
        },
      },
    }, CallToolResultSchema);
    console.log(`Delete result: ${deleteResult.content[0].text}`);
    console.log();

    console.log('All tests completed successfully!');

    await client.close();
  }
  catch (error) {
    console.error('Test failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testMCPServer();
