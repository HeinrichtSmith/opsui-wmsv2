-- ============================================================================
-- ADD-ON MODULES DATABASE SCHEMA
-- Production Management, Sales & CRM, Maintenance & Assets
-- ============================================================================

-- ============================================================================
-- PRODUCTION MANAGEMENT MODULE
-- ============================================================================

-- Bill of Materials table
CREATE TABLE IF NOT EXISTS bill_of_materials (
  bom_id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  product_id VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL DEFAULT '1.0',
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  total_quantity INTEGER NOT NULL DEFAULT 1,
  unit_of_measure VARCHAR(50) NOT NULL,
  estimated_cost DECIMAL(15, 2),
  effective_date TIMESTAMP WITH TIME ZONE,
  expiry_date TIMESTAMP WITH TIME ZONE,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by VARCHAR(255),
  updated_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT fk_bom_creator FOREIGN KEY (created_by) REFERENCES users(user_id),
  CONSTRAINT fk_bom_updater FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

-- BOM Components table
CREATE TABLE IF NOT EXISTS bom_components (
  component_id VARCHAR(255) PRIMARY KEY,
  bom_id VARCHAR(255) NOT NULL,
  sku VARCHAR(255) NOT NULL,
  quantity DECIMAL(15, 2) NOT NULL,
  unit_of_measure VARCHAR(50) NOT NULL,
  is_optional BOOLEAN DEFAULT FALSE,
  substitute_skus JSONB,
  notes TEXT,
  CONSTRAINT fk_bom_component_bom FOREIGN KEY (bom_id) REFERENCES bill_of_materials(bom_id) ON DELETE CASCADE,
  CONSTRAINT fk_bom_component_sku FOREIGN KEY (sku) REFERENCES skus(sku)
);

-- Production Orders table
CREATE TABLE IF NOT EXISTS production_orders (
  order_id VARCHAR(255) PRIMARY KEY,
  order_number VARCHAR(100) UNIQUE NOT NULL,
  product_id VARCHAR(255) NOT NULL,
  product_name VARCHAR(500) NOT NULL,
  bom_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
  quantity_to_produce INTEGER NOT NULL,
  quantity_completed INTEGER DEFAULT 0,
  quantity_rejected INTEGER DEFAULT 0,
  unit_of_measure VARCHAR(50) NOT NULL,
  scheduled_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_start_date TIMESTAMP WITH TIME ZONE,
  actual_end_date TIMESTAMP WITH TIME ZONE,
  assigned_to VARCHAR(255),
  work_center VARCHAR(255),
  notes TEXT,
  materials_reserved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE,
  updated_by VARCHAR(255),
  CONSTRAINT fk_production_order_bom FOREIGN KEY (bom_id) REFERENCES bill_of_materials(bom_id),
  CONSTRAINT fk_production_order_product FOREIGN KEY (product_id) REFERENCES skus(sku),
  CONSTRAINT fk_production_order_assignee FOREIGN KEY (assigned_to) REFERENCES users(user_id),
  CONSTRAINT fk_production_order_creator FOREIGN KEY (created_by) REFERENCES users(user_id),
  CONSTRAINT fk_production_order_updater FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

-- Production Order Components table
CREATE TABLE IF NOT EXISTS production_order_components (
  component_id VARCHAR(255) PRIMARY KEY,
  order_id VARCHAR(255) NOT NULL,
  sku VARCHAR(255) NOT NULL,
  description TEXT,
  quantity_required DECIMAL(15, 2) NOT NULL,
  quantity_issued DECIMAL(15, 2) DEFAULT 0,
  quantity_returned DECIMAL(15, 2) DEFAULT 0,
  unit_of_measure VARCHAR(50) NOT NULL,
  bin_location VARCHAR(255),
  lot_number VARCHAR(255),
  CONSTRAINT fk_production_component_order FOREIGN KEY (order_id) REFERENCES production_orders(order_id) ON DELETE CASCADE,
  CONSTRAINT fk_production_component_sku FOREIGN KEY (sku) REFERENCES skus(sku)
);

-- Production Output table
CREATE TABLE IF NOT EXISTS production_outputs (
  output_id VARCHAR(255) PRIMARY KEY,
  order_id VARCHAR(255) NOT NULL,
  product_id VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  quantity_rejected INTEGER DEFAULT 0,
  lot_number VARCHAR(255),
  produced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  produced_by VARCHAR(255) NOT NULL,
  inspected_by VARCHAR(255),
  inspection_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  bin_location VARCHAR(255),
  CONSTRAINT fk_production_output_order FOREIGN KEY (order_id) REFERENCES production_orders(order_id),
  CONSTRAINT fk_production_output_product FOREIGN KEY (product_id) REFERENCES skus(sku),
  CONSTRAINT fk_production_output_producer FOREIGN KEY (produced_by) REFERENCES users(user_id),
  CONSTRAINT fk_production_output_inspector FOREIGN KEY (inspected_by) REFERENCES users(user_id)
);

-- Production Journal table
CREATE TABLE IF NOT EXISTS production_journals (
  journal_id VARCHAR(255) PRIMARY KEY,
  order_id VARCHAR(255) NOT NULL,
  entry_type VARCHAR(50) NOT NULL,
  entered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  entered_by VARCHAR(255) NOT NULL,
  quantity DECIMAL(15, 2),
  notes TEXT,
  duration_minutes INTEGER,
  CONSTRAINT fk_production_journal_order FOREIGN KEY (order_id) REFERENCES production_orders(order_id) ON DELETE CASCADE,
  CONSTRAINT fk_production_journal_user FOREIGN KEY (entered_by) REFERENCES users(user_id)
);

-- ============================================================================
-- SALES & CRM MODULE
-- ============================================================================

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  customer_id VARCHAR(255) PRIMARY KEY,
  customer_number VARCHAR(100) UNIQUE NOT NULL,
  company_name VARCHAR(500) NOT NULL,
  contact_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(100),
  billing_address JSONB NOT NULL,
  shipping_address JSONB,
  status VARCHAR(50) NOT NULL DEFAULT 'PROSPECT',
  tax_id VARCHAR(255),
  payment_terms VARCHAR(100),
  credit_limit DECIMAL(15, 2),
  account_balance DECIMAL(15, 2) DEFAULT 0,
  notes TEXT,
  assigned_to VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE,
  updated_by VARCHAR(255),
  last_contact_date TIMESTAMP WITH TIME ZONE,
  CONSTRAINT fk_customer_assignee FOREIGN KEY (assigned_to) REFERENCES users(user_id),
  CONSTRAINT fk_customer_creator FOREIGN KEY (created_by) REFERENCES users(user_id),
  CONSTRAINT fk_customer_updater FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  lead_id VARCHAR(255) PRIMARY KEY,
  customer_name VARCHAR(500) NOT NULL,
  contact_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(100),
  company VARCHAR(500),
  status VARCHAR(50) NOT NULL DEFAULT 'NEW',
  priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
  estimated_value DECIMAL(15, 2),
  source VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_to VARCHAR(255) NOT NULL,
  expected_close_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE,
  updated_by VARCHAR(255),
  last_contact_date TIMESTAMP WITH TIME ZONE,
  next_follow_up_date TIMESTAMP WITH TIME ZONE,
  CONSTRAINT fk_lead_assignee FOREIGN KEY (assigned_to) REFERENCES users(user_id),
  CONSTRAINT fk_lead_creator FOREIGN KEY (created_by) REFERENCES users(user_id),
  CONSTRAINT fk_lead_updater FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

-- Opportunities table
CREATE TABLE IF NOT EXISTS opportunities (
  opportunity_id VARCHAR(255) PRIMARY KEY,
  opportunity_number VARCHAR(100) UNIQUE NOT NULL,
  customer_id VARCHAR(255),
  name VARCHAR(500) NOT NULL,
  stage VARCHAR(50) NOT NULL DEFAULT 'PROSPECTING',
  amount DECIMAL(15, 2) NOT NULL,
  probability INTEGER DEFAULT 50,
  expected_close_date TIMESTAMP WITH TIME ZONE NOT NULL,
  description TEXT,
  assigned_to VARCHAR(255) NOT NULL,
  source VARCHAR(255) NOT NULL,
  competitor VARCHAR(500),
  lost_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE,
  updated_by VARCHAR(255),
  closed_at TIMESTAMP WITH TIME ZONE,
  closed_by VARCHAR(255),
  CONSTRAINT fk_opportunity_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
  CONSTRAINT fk_opportunity_assignee FOREIGN KEY (assigned_to) REFERENCES users(user_id),
  CONSTRAINT fk_opportunity_creator FOREIGN KEY (created_by) REFERENCES users(user_id),
  CONSTRAINT fk_opportunity_updater FOREIGN KEY (updated_by) REFERENCES users(user_id),
  CONSTRAINT fk_opportunity_closer FOREIGN KEY (closed_by) REFERENCES users(user_id)
);

-- Quotes table
CREATE TABLE IF NOT EXISTS quotes (
  quote_id VARCHAR(255) PRIMARY KEY,
  quote_number VARCHAR(100) UNIQUE NOT NULL,
  customer_id VARCHAR(255) NOT NULL,
  opportunity_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  terms_and_conditions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE,
  updated_by VARCHAR(255),
  sent_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  converted_to_order_id VARCHAR(255),
  CONSTRAINT fk_quote_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
  CONSTRAINT fk_quote_opportunity FOREIGN KEY (opportunity_id) REFERENCES opportunities(opportunity_id),
  CONSTRAINT fk_quote_creator FOREIGN KEY (created_by) REFERENCES users(user_id),
  CONSTRAINT fk_quote_updater FOREIGN KEY (updated_by) REFERENCES users(user_id),
  CONSTRAINT fk_quote_order FOREIGN KEY (converted_to_order_id) REFERENCES orders(order_id)
);

-- Quote Line Items table
CREATE TABLE IF NOT EXISTS quote_line_items (
  line_item_id VARCHAR(255) PRIMARY KEY,
  quote_id VARCHAR(255) NOT NULL,
  sku VARCHAR(255) NOT NULL,
  description TEXT,
  quantity DECIMAL(15, 2) NOT NULL,
  unit_price DECIMAL(15, 2) NOT NULL,
  discount DECIMAL(15, 2) DEFAULT 0,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  line_number INTEGER NOT NULL,
  total DECIMAL(15, 2) NOT NULL,
  CONSTRAINT fk_quote_line_item_quote FOREIGN KEY (quote_id) REFERENCES quotes(quote_id) ON DELETE CASCADE,
  CONSTRAINT fk_quote_line_item_sku FOREIGN KEY (sku) REFERENCES skus(sku)
);

-- Customer Interactions table
CREATE TABLE IF NOT EXISTS customer_interactions (
  interaction_id VARCHAR(255) PRIMARY KEY,
  customer_id VARCHAR(255),
  lead_id VARCHAR(255),
  opportunity_id VARCHAR(255),
  interaction_type VARCHAR(50) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  notes TEXT NOT NULL,
  duration_minutes INTEGER,
  next_follow_up_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL,
  CONSTRAINT fk_interaction_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
  CONSTRAINT fk_interaction_lead FOREIGN KEY (lead_id) REFERENCES leads(lead_id),
  CONSTRAINT fk_interaction_opportunity FOREIGN KEY (opportunity_id) REFERENCES opportunities(opportunity_id),
  CONSTRAINT fk_interaction_creator FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- ============================================================================
-- MAINTENANCE & ASSETS MODULE
-- ============================================================================

-- Assets table
CREATE TABLE IF NOT EXISTS assets (
  asset_id VARCHAR(255) PRIMARY KEY,
  asset_number VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'OPERATIONAL',
  serial_number VARCHAR(255),
  manufacturer VARCHAR(255),
  model VARCHAR(255),
  year INTEGER,
  purchase_date DATE,
  purchase_price DECIMAL(15, 2),
  location VARCHAR(255),
  assigned_to VARCHAR(255),
  parent_id VARCHAR(255),
  warranty_expiry DATE,
  expected_lifespan_years INTEGER,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE,
  updated_by VARCHAR(255),
  CONSTRAINT fk_asset_parent FOREIGN KEY (parent_id) REFERENCES assets(asset_id),
  CONSTRAINT fk_asset_assignee FOREIGN KEY (assigned_to) REFERENCES users(user_id),
  CONSTRAINT fk_asset_creator FOREIGN KEY (created_by) REFERENCES users(user_id),
  CONSTRAINT fk_asset_updater FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

-- Maintenance Schedules table
CREATE TABLE IF NOT EXISTS maintenance_schedules (
  schedule_id VARCHAR(255) PRIMARY KEY,
  asset_id VARCHAR(255) NOT NULL,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  maintenance_type VARCHAR(50) NOT NULL,
  priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
  frequency VARCHAR(50) NOT NULL,
  interval_days INTEGER,
  estimated_duration_hours DECIMAL(8, 2) NOT NULL,
  assigned_to VARCHAR(255),
  parts_required JSONB,
  instructions TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE,
  updated_by VARCHAR(255),
  last_performed_date DATE,
  next_due_date DATE NOT NULL,
  CONSTRAINT fk_schedule_asset FOREIGN KEY (asset_id) REFERENCES assets(asset_id) ON DELETE CASCADE,
  CONSTRAINT fk_schedule_assignee FOREIGN KEY (assigned_to) REFERENCES users(user_id),
  CONSTRAINT fk_schedule_creator FOREIGN KEY (created_by) REFERENCES users(user_id),
  CONSTRAINT fk_schedule_updater FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

-- Maintenance Work Orders table
CREATE TABLE IF NOT EXISTS maintenance_work_orders (
  work_order_id VARCHAR(255) PRIMARY KEY,
  work_order_number VARCHAR(100) UNIQUE NOT NULL,
  asset_id VARCHAR(255) NOT NULL,
  schedule_id VARCHAR(255),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  maintenance_type VARCHAR(50) NOT NULL,
  priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
  status VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED',
  scheduled_date DATE NOT NULL,
  scheduled_start_time VARCHAR(50),
  estimated_duration_hours DECIMAL(8, 2) NOT NULL,
  assigned_to VARCHAR(255),
  actual_start_date TIMESTAMP WITH TIME ZONE,
  actual_end_date TIMESTAMP WITH TIME ZONE,
  actual_duration_hours DECIMAL(8, 2),
  work_performed TEXT,
  parts_used JSONB,
  labor_cost DECIMAL(15, 2),
  parts_cost DECIMAL(15, 2),
  total_cost DECIMAL(15, 2),
  performed_by VARCHAR(255),
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE,
  updated_by VARCHAR(255),
  CONSTRAINT fk_work_order_asset FOREIGN KEY (asset_id) REFERENCES assets(asset_id),
  CONSTRAINT fk_work_order_schedule FOREIGN KEY (schedule_id) REFERENCES maintenance_schedules(schedule_id),
  CONSTRAINT fk_work_order_assignee FOREIGN KEY (assigned_to) REFERENCES users(user_id),
  CONSTRAINT fk_work_order_performer FOREIGN KEY (performed_by) REFERENCES users(user_id),
  CONSTRAINT fk_work_order_completer FOREIGN KEY (completed_by) REFERENCES users(user_id),
  CONSTRAINT fk_work_order_creator FOREIGN KEY (created_by) REFERENCES users(user_id),
  CONSTRAINT fk_work_order_updater FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

-- Service Logs table
CREATE TABLE IF NOT EXISTS service_logs (
  log_id VARCHAR(255) PRIMARY KEY,
  asset_id VARCHAR(255) NOT NULL,
  work_order_id VARCHAR(255),
  service_date DATE NOT NULL,
  service_type VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  performed_by VARCHAR(255) NOT NULL,
  cost DECIMAL(15, 2),
  notes TEXT,
  attachments JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL,
  CONSTRAINT fk_service_log_asset FOREIGN KEY (asset_id) REFERENCES assets(asset_id),
  CONSTRAINT fk_service_log_work_order FOREIGN KEY (work_order_id) REFERENCES maintenance_work_orders(work_order_id),
  CONSTRAINT fk_service_log_performer FOREIGN KEY (performed_by) REFERENCES users(user_id),
  CONSTRAINT fk_service_log_creator FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Meter Readings table
CREATE TABLE IF NOT EXISTS meter_readings (
  reading_id VARCHAR(255) PRIMARY KEY,
  asset_id VARCHAR(255) NOT NULL,
  meter_type VARCHAR(100) NOT NULL,
  value DECIMAL(15, 2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  reading_date TIMESTAMP WITH TIME ZONE NOT NULL,
  read_by VARCHAR(255) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_meter_reading_asset FOREIGN KEY (asset_id) REFERENCES assets(asset_id),
  CONSTRAINT fk_meter_reading_reader FOREIGN KEY (read_by) REFERENCES users(user_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Production module indexes
CREATE INDEX IF NOT EXISTS idx_production_orders_status ON production_orders(status);
CREATE INDEX IF NOT EXISTS idx_production_orders_scheduled_start ON production_orders(scheduled_start_date);
CREATE INDEX IF NOT EXISTS idx_production_orders_assigned_to ON production_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_production_outputs_order_id ON production_outputs(order_id);

-- Sales & CRM module indexes
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_to ON customers(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_opportunities_customer_id ON opportunities(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_customer_interactions_customer_id ON customer_interactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_interactions_lead_id ON customer_interactions(lead_id);

-- Maintenance & Assets module indexes
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);
CREATE INDEX IF NOT EXISTS idx_assets_location ON assets(location);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_asset_id ON maintenance_schedules(asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_next_due ON maintenance_schedules(next_due_date);
CREATE INDEX IF NOT EXISTS idx_work_orders_asset_id ON maintenance_work_orders(asset_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON maintenance_work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_scheduled_date ON maintenance_work_orders(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_service_logs_asset_id ON service_logs(asset_id);
CREATE INDEX IF NOT EXISTS idx_meter_readings_asset_id ON meter_readings(asset_id);

-- ============================================================================
-- UPDATE USERS TABLE FOR NEW ROLES
-- ============================================================================

-- Add check constraint for user roles (including new roles)
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_user_role;
ALTER TABLE users ADD CONSTRAINT chk_user_role
  CHECK (role IN ('PICKER', 'PACKER', 'STOCK_CONTROLLER', 'SUPERVISOR', 'ADMIN', 'PRODUCTION', 'SALES', 'MAINTENANCE'));
