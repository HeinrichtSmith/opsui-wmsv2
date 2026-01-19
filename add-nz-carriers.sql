-- ============================================================================
-- Add New Zealand Carriers
-- ============================================================================

-- Insert NZ Courier
INSERT INTO carriers (carrier_id, name, carrier_code, service_types, contact_email, contact_phone, api_endpoint, is_active, requires_account_number, requires_package_dimensions, requires_weight)
VALUES
  ('CARR-NZC', 'NZ Courier', 'NZCOURIER', ARRAY['STANDARD', 'EXPRESS', 'OVERNIGHT', 'SAME_DAY'], 'support@nzcourier.co.nz', '0800-800-800', 'https://api.nzcourier.co.nz', true, true, true, true),
  ('CARR-MF', 'Mainfreight', 'MAINFREIGHT', ARRAY['STANDARD', 'EXPRESS', 'OVERNIGHT', 'INTERNATIONAL'], 'support@mainfreight.co.nz', '0800-800-111', 'https://api.mainfreight.com', true, true, true, true)
ON CONFLICT (carrier_id) DO NOTHING;