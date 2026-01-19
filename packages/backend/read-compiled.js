const fs = require('fs');
const path = require('path');

const servicePath = path.join(__dirname, 'dist/services/MetricsService.js');

console.log('=== Reading Compiled MetricsService.js ===\n');

if (fs.existsSync(servicePath)) {
  const content = fs.readFileSync(servicePath, 'utf-8');
  
  // Find getPickerActivity function
  const startIndex = content.indexOf('async getPickerActivity()');
  
  if (startIndex !== -1) {
    console.log('Found getPickerActivity function\n');
    
    // Extract 500 chars around it
    const excerpt = content.substring(startIndex - 100, startIndex + 1000);
    console.log('Function excerpt:');
    console.log(excerpt);
  } else {
    console.log('Could not find getPickerActivity function');
  }
}

process.exit(0);