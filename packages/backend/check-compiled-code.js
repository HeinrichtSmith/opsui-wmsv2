const fs = require('fs');
const path = require('path');

const servicePath = path.join(__dirname, 'dist/services/MetricsService.js');

console.log('=== Checking Compiled MetricsService ===\n');

if (fs.existsSync(servicePath)) {
  const content = fs.readFileSync(servicePath, 'utf-8');
  
  // Look for the getPickerActivity function
  const startIndex = content.indexOf('async getPickerActivity()');
  
  if (startIndex !== -1) {
    console.log('Found getPickerActivity function at position:', startIndex);
    
    // Look for currentView in the code
    const currentViewMatches = content.match(/currentView/g);
    console.log('Found "currentView" occurrences:', currentViewMatches ? currentViewMatches.length : 0);
    
    // Look for the query that fetches current_view
    const queryIndex = content.indexOf('SELECT last_login_at, current_view, current_view_updated_at');
    console.log('Found current_view query at position:', queryIndex);
  } else {
    console.log('Could not find getPickerActivity function');
  }
} else {
  console.log('Compiled file not found at:', servicePath);
  console.log('Need to build backend first');
}

process.exit(0);