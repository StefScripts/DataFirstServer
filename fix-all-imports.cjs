#!/usr/bin/env node

// Script to fix all relative imports in compiled JS files
const fs = require('fs');
const path = require('path');

// Directory containing compiled JS files
const DIST_DIR = path.join(process.cwd(), 'dist');
console.log(`Fixing imports in: ${DIST_DIR}`);

// Function to recursively process all js files
function processDirectory(dir) {
  fs.readdirSync(dir).forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file.endsWith('.js')) {
      fixImports(filePath);
    }
  });
}

// Function to fix imports in a file
function fixImports(filePath) {
  console.log(`Processing: ${filePath}`);
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix relative imports without extensions
  content = content.replace(/from\s+['"](\.[^'"]+)['"]/g, (match, importPath) => {
    // Skip if the import already has an extension
    if (path.extname(importPath)) {
      return match;
    }

    // Add .js extension
    return `from '${importPath}.js'`;
  });

  fs.writeFileSync(filePath, content);
}

// Start processing
processDirectory(DIST_DIR);
console.log('All imports fixed successfully!');
