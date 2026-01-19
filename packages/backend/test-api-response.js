/**
 * Test the API response directly
 */

const http = require('http');

async function login() {
  return new Promise((resolve, reject) => {
    const loginOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:5173',
        'Referer': 'http://localhost:5173/'
      }
    };

    const loginReq = http.request(loginOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.accessToken) {
            resolve(response.accessToken);
          } else {
            reject(new Error('No access token in response: ' + data));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    loginReq.on('error', reject);
    loginReq.write(JSON.stringify({
      email: 'admin@wms.local',
      password: 'admin123'
    }));
    loginReq.end();
  });
}

async function testOrderQueue() {
  const token = await login();

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/orders?status=PICKING',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Origin': 'http://localhost:5173',
        'Referer': 'http://localhost:5173/'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('Status code:', res.statusCode);
        console.log('Headers:', JSON.stringify(res.headers, null, 2));
        console.log('\nRaw response body:');
        console.log(data);
        console.log('\nLength:', data.length);

        try {
          const response = JSON.parse(data);
          console.log('\n=== Parsed Response ===');
          console.log('Total orders:', response.total);
          console.log('Orders count:', response.orders?.length);

          if (response.orders && response.orders.length > 0) {
            const firstOrder = response.orders[0];
            console.log('\nFirst order:');
            console.log('  Order ID:', firstOrder.orderId || firstOrder.order_id);
            console.log('  Status:', firstOrder.status);
            console.log('  Picker ID:', firstOrder.pickerId || firstOrder.picker_id);
            console.log('  Progress:', firstOrder.progress);
            console.log('  Items count:', firstOrder.items?.length || 0);

            if (firstOrder.items && firstOrder.items.length > 0) {
              console.log('  First item:', JSON.stringify(firstOrder.items[0], null, 2));
            }
          }
          resolve(response);
        } catch (e) {
          console.log('\nParse error:', e.message);
          reject(e);
        }
      });
    });

    req.on('error', (e) => {
      console.error(`Request error: ${e.message}`);
      reject(e);
    });

    req.end();
  });
}

testOrderQueue().catch(console.error);
