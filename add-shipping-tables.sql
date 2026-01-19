-- ============================================================================
-- Shipping Tables
-- ============================================================================

-- Shipping Status Enum
CREATE TYPE shipment_status AS ENUM (
  'DRAFT',
  'LABEL_CREATED',
  'SHIPPED',
  'IN_TRANSIT',
  'DELIVERED',
  'EXCEPTION',
  'CANCELLED'
);

-- Label Format Enum
CREATE TYPE label_format AS ENUM (
  'PDF',
  'PNG',
  'ZPL',
  'EPL'
);

-- ----------------------------------------------------------------------------
-- Carriers Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS carriers (
  carrier_id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  carrier_code VARCHAR(50) UNIQUE NOT NULL,
  service_types TEXT[] DEFAULT '{}',
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  api_endpoint VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT true,
  requires_account_number BOOLEAN NOT NULL DEFAULT false,
  requires_package_dimensions BOOLEAN NOT NULL DEFAULT true,
  requires_weight BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Shipments Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shipments (
  shipment_id VARCHAR(20) PRIMARY KEY,
  order_id VARCHAR(30) NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  carrier_id VARCHAR(20) NOT NULL REFERENCES carriers(carrier_id),
  service_type VARCHAR(100),
  shipping_method VARCHAR(100),
  tracking_number VARCHAR(255),
  tracking_url VARCHAR(500),
  ship_from_address JSONB,
  ship_to_address JSONB,
  total_weight DECIMAL(10, 2) NOT NULL,
  total_packages INTEGER NOT NULL DEFAULT 1,
  dimensions JSONB,
  shipping_cost DECIMAL(10, 2),
  insurance_cost DECIMAL(10, 2),
  total_cost DECIMAL(10, 2),
  status shipment_status NOT NULL DEFAULT 'DRAFT',
  ship_date TIMESTAMP WITH TIME ZONE,
  estimated_delivery_date TIMESTAMP WITH TIME ZONE,
  actual_delivery_date TIMESTAMP WITH TIME ZONE,
  carrier_shipment_id VARCHAR(100),
  carrier_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_by VARCHAR(20) REFERENCES users(user_id),
  shipped_by VARCHAR(20) REFERENCES users(user_id)
);

-- ----------------------------------------------------------------------------
-- Shipping Labels Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shipping_labels (
  label_id VARCHAR(20) PRIMARY KEY,
  shipment_id VARCHAR(20) NOT NULL REFERENCES shipments(shipment_id) ON DELETE CASCADE,
  label_format label_format NOT NULL DEFAULT 'PDF',
  label_url TEXT,
  label_data TEXT,
  package_number INTEGER NOT NULL,
  package_weight DECIMAL(10, 2) NOT NULL,
  package_dimensions JSONB,
  carrier_tracking_number VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  printed_at TIMESTAMP WITH TIME ZONE,
  created_by VARCHAR(20) REFERENCES users(user_id)
);

-- ----------------------------------------------------------------------------
-- Shipment Tracking Events Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shipment_tracking_events (
  event_id VARCHAR(20) PRIMARY KEY,
  shipment_id VARCHAR(20) NOT NULL REFERENCES shipments(shipment_id) ON DELETE CASCADE,
  event_code VARCHAR(50) NOT NULL,
  event_description TEXT,
  event_location VARCHAR(255),
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  event_source VARCHAR(100),
  raw_event_data JSONB
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_carrier_id ON shipments(carrier_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_created_at ON shipments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_number ON shipments(tracking_number);

CREATE INDEX IF NOT EXISTS idx_shipping_labels_shipment_id ON shipping_labels(shipment_id);

CREATE INDEX IF NOT EXISTS idx_tracking_events_shipment_id ON shipment_tracking_events(shipment_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_event_date ON shipment_tracking_events(event_date DESC);

-- ============================================================================
-- SAMPLE DATA
-- ============================================================================

-- Insert sample carriers
INSERT INTO carriers (carrier_id, name, carrier_code, service_types, contact_email, contact_phone, api_endpoint, is_active, requires_account_number, requires_package_dimensions, requires_weight)
VALUES
  ('CARR-FEDEX', 'FedEx', 'FEDEX', ARRAY['OVERNIGHT', '2DAY', 'GROUND', 'EXPRESS'], 'support@fedex.com', '1-800-463-3339', 'https://api.fedex.com', true, true, true, true),
  ('CARR-UPS', 'UPS', 'UPS', ARRAY['NEXT_DAY_AIR', '2ND_DAY_AIR', 'GROUND', 'SAVER'], 'support@ups.com', '1-800-742-5877', 'https://api.ups.com', true, true, true, true),
  ('CARR-USPS', 'US Postal Service', 'USPS', ARRAY['PRIORITY', 'EXPRESS', 'FIRST_CLASS', 'PARCEL'], 'support@usps.com', '1-800-275-8777', 'https://api.usps.com', true, false, true, true),
  ('CARR-DHL', 'DHL Express', 'DHL', ARRAY['EXPRESS', 'ECONOMY_SELECT', 'SAME_DAY'], 'support@dhl.com', '1-800-225-5345', 'https://api.dhl.com', true, true, true, true)
ON CONFLICT (carrier_id) DO NOTHING;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamp for shipments
CREATE OR REPLACE FUNCTION update_shipments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_shipments_updated_at
  BEFORE UPDATE ON shipments
  FOR EACH ROW
  EXECUTE FUNCTION update_shipments_updated_at();

-- Auto-update updated_at timestamp for carriers
CREATE OR REPLACE FUNCTION update_carriers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_carriers_updated_at
  BEFORE UPDATE ON carriers
  FOR EACH ROW
  EXECUTE FUNCTION update_carriers_updated_at();

-- ============================================================================
-- END OF SHIPPING TABLES
-- ============================================================================