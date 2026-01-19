-- ============================================================================
-- Update Carrier API Endpoints
-- Based on verified API documentation
-- ============================================================================

-- Update NZ Courier with correct endpoint
UPDATE carriers 
SET 
  api_endpoint = 'https://customer-integration.ep-sandbox.freightways.co.nz',
  contact_phone = '0800-800-800'
WHERE carrier_id = 'CARR-NZC';

-- Update Mainfreight with correct endpoint
UPDATE carriers 
SET 
  api_endpoint = 'https://api.mainfreight.com',
  contact_phone = '0800-800-111'
WHERE carrier_id = 'CARR-MF';

-- Note: FedEx, UPS, USPS, and DHL endpoints require developer portal access
-- Their endpoints should be updated with production URLs after account setup

-- Verify the updates
SELECT carrier_id, name, carrier_code, api_endpoint, contact_phone, is_active
FROM carriers
ORDER BY carrier_id;