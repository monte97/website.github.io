#!/usr/bin/env node
/**
 * Wrapper script for batch cover generator
 * Delegates to cover-generator/generate-all.js
 */

const { execSync } = require('child_process');
const path = require('path');

const scriptPath = path.join(__dirname, 'cover-generator', 'generate-all.js');
const args = process.argv.slice(2).join(' ');

execSync(`node "${scriptPath}" ${args}`, { stdio: 'inherit' });
