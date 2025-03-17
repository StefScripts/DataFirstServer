// Create this file as server/fix-imports.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the dist directory
const distDir = path.join(__dirname, 'dist');
console.log(`Fixing imports in: ${distDir}`);

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
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace relative imports without extensions
  content = content.replace(/from\s+['"](\.[^'"]+)['"]/g, (match, importPath) => {
    // If the import already has an extension, leave it alone
    if (path.extname(importPath)) {
      return match;
    }
    // Otherwise add .js
    return `from '${importPath}.js'`;
  });

  // Replace @db path alias
  content = content.replace(/from\s+["']@db["']/g, "from './db/index.js'");
  content = content.replace(/from\s+["']@db\/([^"']+)["']/g, "from './db/$1.js'");

  fs.writeFileSync(filePath, content);
  console.log(`Fixed imports in ${filePath}`);
}

// Start processing
processDirectory(distDir);
console.log('All imports fixed successfully!');
