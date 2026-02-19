#!/usr/bin/env node
/**
 * Wrapper script for cover generator
 * Delegates to cover-generator/index.js
 */

const { execSync } = require('child_process');
const path = require('path');

const scriptPath = path.join(__dirname, 'cover-generator', 'index.js');
const args = process.argv.slice(2).join(' ');

execSync(`node "${scriptPath}" ${args}`, { stdio: 'inherit' });
