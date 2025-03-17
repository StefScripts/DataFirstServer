#!/bin/bash

echo "Fixing import paths in compiled JavaScript files..."

# Directory containing compiled JS files
DIST_DIR="dist"

# First, create a map file to help with imports
echo "Creating path mapping file..."
cat > ./path-map.js << 'EOL'
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Get the base directory
const __filename = fileURLToPath(import.meta.url);
const BASE_DIR = path.dirname(__filename);

function processFile(filePath) {
  console.log(`Processing: ${filePath}`);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix @db imports
  content = content.replace(/from ['"]@db['"]/g, `from '${path.relative(path.dirname(filePath), path.join(BASE_DIR, 'db', 'index.js')).replace(/\\/g, '/')}'`);
  
  // Fix @db/* imports
  content = content.replace(/from ['"]@db\/([^'"]+)['"]/g, (match, p1) => {
    const relativePath = path.relative(path.dirname(filePath), path.join(BASE_DIR, 'db', p1 + '.js')).replace(/\\/g, '/');
    return `from '${relativePath}'`;
  });
  
  // Fix other relative imports without extensions
  content = content.replace(/from ['"](\.[^'"]+)['"]/g, (match, importPath) => {
    if (importPath.endsWith('.js')) return match;
    return `from '${importPath}.js'`;
  });
  
  fs.writeFileSync(filePath, content);
}

function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.name.endsWith('.js')) {
      processFile(fullPath);
    }
  }
}

processDirectory(path.join(BASE_DIR, 'dist'));
console.log('All import paths fixed successfully!');
EOL

# Make the script executable and run it
node --input-type=module path-map.js

echo "Import paths fixed successfully!"