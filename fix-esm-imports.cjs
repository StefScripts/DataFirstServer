#!/usr/bin/env node

// Using CommonJS for this script to avoid ESM issues
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
  const fileDir = path.dirname(filePath);

  // Fix @db/schema imports
  if (content.includes('from "@db/schema"') || content.includes("from '@db/schema'")) {
    const relPath = path.relative(fileDir, path.join(DIST_DIR, 'db', 'schema.js')).replace(/\\/g, '/');
    content = content.replace(/from ["']@db\/schema["']/g, `from '${relPath}'`);
  }

  // Fix @db imports
  if (content.includes('from "@db"') || content.includes("from '@db'")) {
    const relPath = path.relative(fileDir, path.join(DIST_DIR, 'db', 'index.js')).replace(/\\/g, '/');
    content = content.replace(/from ["']@db["']/g, `from '${relPath}'`);
  }

  // Fix other @db/* imports
  content = content.replace(/from ["']@db\/([^"']+)["']/g, (match, p1) => {
    const relPath = path.relative(fileDir, path.join(DIST_DIR, 'db', p1 + '.js')).replace(/\\/g, '/');
    return `from '${relPath}'`;
  });

  // Fix relative imports without extensions
  content = content.replace(/from ["'](\.[^"']+)["']/g, (match, importPath) => {
    if (importPath.endsWith('.js')) return match;

    // Try to determine if this is a directory or file import
    const currentDir = path.dirname(filePath);
    const potentialFile = path.resolve(currentDir, importPath + '.js');
    const potentialDir = path.resolve(currentDir, importPath, 'index.js');

    if (fs.existsSync(potentialFile)) {
      return `from '${importPath}.js'`;
    } else if (fs.existsSync(potentialDir)) {
      return `from '${importPath}/index.js'`;
    }

    // Default fallback - add .js (most common case)
    return `from '${importPath}.js'`;
  });

  fs.writeFileSync(filePath, content);
}

// Start processing
processDirectory(DIST_DIR);
console.log('All imports fixed successfully!');
