#!/bin/bash

echo "Fixing import paths in compiled JavaScript files..."

# Directory containing compiled JS files
DIST_DIR="dist"

# Find all JS files in the dist directory
find $DIST_DIR -type f -name "*.js" | while read file; do
  echo "Processing $file"
  
  # Fix relative imports without extensions (add .js)
  sed -i -E "s/from ['\"](\.[^'\"]+)['\"];/from '\1.js';/g" "$file"
  
  # Fix @db imports
  sed -i "s/from \"@db\";/from \"\.\/db\/index.js\";/g" "$file"
  sed -i "s/from '@db';/from '\.\/db\/index.js';/g" "$file"
  
  # Fix @db/* imports
  sed -i -E "s/from ['\"]@db\/([^'\"]+)['\"];/from '\.\/db\/\1.js';/g" "$file"
done

echo "Import paths fixed successfully!"