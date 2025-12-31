#!/usr/bin/env node

/**
 * Convert drag-and-drop JSON plugin to plugin folder format
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(__dirname, 'dist', '$__plugins_rryan_tiddly-mcp.json');
const OUTPUT_DIR = path.join(__dirname, 'dist', 'tiddly-mcp');

console.log('🔄 Converting plugin to folder format...\n');

// Read the JSON plugin file
const pluginJson = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));

// Extract top-level metadata for plugin.info
const pluginInfo = {
  title: pluginJson.title,
  description: pluginJson.description,
  author: pluginJson.author,
  version: pluginJson.version,
  'core-version': pluginJson['core-version'],
  'plugin-type': pluginJson['plugin-type'],
  list: pluginJson.list,
  platform: pluginJson.platform,
  stability: pluginJson.stability,
  dependents: pluginJson.dependents,
};

// Remove undefined values
Object.keys(pluginInfo).forEach(key => {
  if (pluginInfo[key] === undefined) {
    delete pluginInfo[key];
  }
});

// Parse the embedded tiddlers
const tiddlersData = JSON.parse(pluginJson.text);
const tiddlers = tiddlersData.tiddlers;

// Create output directory
if (fs.existsSync(OUTPUT_DIR)) {
  fs.rmSync(OUTPUT_DIR, { recursive: true });
}
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Write plugin.info
const pluginInfoPath = path.join(OUTPUT_DIR, 'plugin.info');
fs.writeFileSync(pluginInfoPath, JSON.stringify(pluginInfo, null, 2));
console.log(`✅ Created plugin.info`);

// Process each tiddler
let fileCount = 0;
for (const [tiddlerTitle, tiddler] of Object.entries(tiddlers)) {
  // Skip the Modern.TiddlyDev#Origin field
  const fields = { ...tiddler };
  delete fields['Modern.TiddlyDev#Origin'];

  // Determine file path relative to output directory
  // Remove the plugin prefix from the title to get the relative path
  const pluginPrefix = '$:/plugins/rryan/tiddly-mcp/';
  let relativePath = tiddlerTitle;

  if (tiddlerTitle.startsWith(pluginPrefix)) {
    relativePath = tiddlerTitle.substring(pluginPrefix.length);
  }

  // Determine file extension based on type or title
  let fileExtension;
  if (tiddlerTitle.endsWith('.js')) {
    fileExtension = '.js';
    // Remove .js from the relative path since we'll add it back
    relativePath = relativePath.replace(/\.js$/, '');
  } else if (fields.type === 'application/javascript') {
    fileExtension = '.js';
  } else {
    fileExtension = '.tid';
  }

  const filePath = path.join(OUTPUT_DIR, relativePath + fileExtension);

  // Create directory if needed
  const fileDir = path.dirname(filePath);
  if (!fs.existsSync(fileDir)) {
    fs.mkdirSync(fileDir, { recursive: true });
  }

  // Write file based on type
  if (fileExtension === '.js') {
    // For JavaScript files, prepend metadata as TiddlyWiki comment block
    const metaFields = { ...fields };
    delete metaFields.text;

    // Build metadata header
    const metaLines = ['/*\\'];
    for (const [key, value] of Object.entries(metaFields)) {
      metaLines.push(`${key}: ${value}`);
    }
    metaLines.push('', '\\*/');
    metaLines.push('');

    const content = metaLines.join('\n') + fields.text;
    fs.writeFileSync(filePath, content);
  } else {
    // For .tid files, write in TiddlyWiki format with metadata headers
    const metaLines = [];

    // Write all fields except text
    for (const [key, value] of Object.entries(fields)) {
      if (key !== 'text') {
        metaLines.push(`${key}: ${value}`);
      }
    }

    // Combine metadata and text with blank line separator
    const content = metaLines.join('\n') + '\n\n' + (fields.text || '');
    fs.writeFileSync(filePath, content);
  }

  fileCount++;
  console.log(`✅ Created ${relativePath}${fileExtension}`);
}

console.log(`\n✅ Conversion complete! Created ${fileCount} files in ${OUTPUT_DIR}`);
