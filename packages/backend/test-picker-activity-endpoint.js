const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/metrics/picker-activity',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    // Add test auth token (would need real token in production)
  }
};

console.log('Testing /api/metrics/picker-activity endpoint...');

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\nResponse:');
    console.log(data);
    
    if (res.statusCode === 200) {
      try {
        const parsed = JSON.parse(data);
        console.log('\nParsed response:');
        console.log(JSON.stringify(parsed, null, 2));
        
        // Check currentView for each picker
        console.log('\n--- Picker Locations ---');
        parsed.forEach(picker => {
          console.log(`${picker.pickerName}: ${picker.currentView || 'None'}`);
        });
      } catch (e) {
        console.error('Failed to parse JSON:', e.message);
      }
    } else {
      console.error('Request failed with status:', res.statusCode);
    }
    
    process.exit(0);
  });
});

req.on('error', (error) => {
  console.error('Request error:', error.message);
  console.error('\nMake sure backend is running on port 3001');
  process.exit(1);
});

req.end();