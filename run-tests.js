#!/usr/bin/env node

// Configure ts-node/tsx to handle TypeScript before loading Jasmine
process.env.TS_NODE_PROJECT = './tsconfig.json';
process.env.TS_NODE_TRANSPILE_ONLY = 'true';

// Register ts-node to handle TypeScript files
require('ts-node').register({
  transpileOnly: true,
  project: './tsconfig.json',
  compilerOptions: {
    module: 'commonjs',
  }
});

// Now run jasmine
const Jasmine = require('jasmine');
const jasmine = new Jasmine();

jasmine.loadConfigFile('spec/support/jasmine.json');
jasmine.execute();
