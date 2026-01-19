-- ML Pipeline Tables for Warehouse Management System
-- These tables support machine learning features including:
-- - Order duration prediction
-- - Demand forecasting
-- - Route optimization
-- - Picker performance prediction

-- ============================================
-- MODEL REGISTRY
-- ============================================

CREATE TABLE IF NOT EXISTS ml_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name VARCHAR(255) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    model_type VARCHAR(100) NOT NULL, -- 'duration', 'demand', 'routes', 'performance'
    framework VARCHAR(50) NOT NULL, -- 'xgboost', 'tensorflow', 'sklearn', etc.
    file_path TEXT NOT NULL,
    hyperparameters JSONB,
    metrics JSONB,
    trained_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ml_models_name_version ON ml_models(model_name, model_version);
CREATE INDEX idx_ml_models_type_active ON ml_models(model_type, is_active);

-- ============================================
-- TRAINING RUNS
-- ============================================

CREATE TABLE IF NOT EXISTS ml_training_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES ml_models(id) ON DELETE CASCADE,
    run_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed', 'cancelled'
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    training_samples INTEGER,
    validation_samples INTEGER,
    test_samples INTEGER,
    parameters JSONB,
    metrics JSONB,
    artifacts TEXT, -- JSON array of artifact paths
    error_message TEXT,
    mlflow_run_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ml_training_runs_model_id ON ml_training_runs(model_id);
CREATE INDEX idx_ml_training_runs_status ON ml_training_runs(status);
CREATE INDEX idx_ml_training_runs_started_at ON ml_training_runs(started_at DESC);

-- ============================================
-- FEATURE STORE
-- ============================================

CREATE TABLE IF NOT EXISTS ml_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_name VARCHAR(255) NOT NULL,
    feature_type VARCHAR(50) NOT NULL, -- 'numerical', 'categorical', 'temporal', 'text'
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ml_feature_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_id UUID REFERENCES ml_features(id) ON DELETE CASCADE,
    entity_type VARCHAR(100) NOT NULL, -- 'order', 'sku', 'picker', 'location'
    entity_id VARCHAR(255) NOT NULL,
    feature_value JSONB NOT NULL,
    computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(feature_id, entity_type, entity_id)
);

CREATE INDEX idx_ml_feature_values_entity ON ml_feature_values(entity_type, entity_id);
CREATE INDEX idx_ml_feature_values_feature_id ON ml_feature_values(feature_id);

-- ============================================
-- PREDICTIONS LOG
-- ============================================

CREATE TABLE IF NOT EXISTS ml_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES ml_models(id),
    model_version VARCHAR(50) NOT NULL,
    prediction_type VARCHAR(100) NOT NULL, -- 'order_duration', 'demand', 'optimal_route', etc.
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    input_features JSONB NOT NULL,
    prediction JSONB NOT NULL,
    confidence DECIMAL(5,4),
    prediction_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Partition by prediction_type for better query performance
CREATE TABLE IF NOT EXISTS ml_predictions_order_duration (
    CHECK (prediction_type = 'order_duration')
) INHERITS (ml_predictions);

CREATE TABLE IF NOT EXISTS ml_predictions_demand (
    CHECK (prediction_type = 'demand')
) INHERITS (ml_predictions);

CREATE TABLE IF NOT EXISTS ml_predictions_route (
    CHECK (prediction_type = 'optimal_route')
) INHERITS (ml_predictions);

CREATE INDEX idx_ml_predictions_entity ON ml_predictions(entity_type, entity_id);
CREATE INDEX idx_ml_predictions_created_at ON ml_predictions(created_at DESC);
CREATE INDEX idx_ml_predictions_model_id ON ml_predictions(model_id);

-- ============================================
-- MODEL PERFORMANCE METRICS
-- ============================================

CREATE TABLE IF NOT EXISTS ml_model_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES ml_models(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL, -- 'mae', 'rmse', 'r2', 'accuracy', etc.
    metric_value DECIMAL(10,6) NOT NULL,
    dataset_type VARCHAR(50) NOT NULL, -- 'training', 'validation', 'test', 'production'
    calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX idx_ml_model_performance_model_id ON ml_model_performance(model_id);
CREATE INDEX idx_ml_model_performance_calculated_at ON ml_model_performance(calculated_at DESC);

-- ============================================
-- FEATURE IMPORTANCE
-- ============================================

CREATE TABLE IF NOT EXISTS ml_feature_importance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES ml_models(id) ON DELETE CASCADE,
    feature_name VARCHAR(255) NOT NULL,
    importance_value DECIMAL(10,6) NOT NULL,
    importance_type VARCHAR(50) NOT NULL, -- 'gain', 'weight', 'cover', 'shap'
    calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ml_feature_importance_model_id ON ml_feature_importance(model_id);
CREATE INDEX idx_ml_feature_importance_value ON ml_feature_importance(importance_value DESC);

-- ============================================
-- DATA QUALITY METRICS
-- ============================================

CREATE TABLE IF NOT EXISTS ml_data_quality (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(255) NOT NULL,
    row_count BIGINT,
    null_count INTEGER,
    duplicate_count INTEGER,
    outlier_count INTEGER,
    quality_score DECIMAL(5,4), -- 0 to 1
    checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    details JSONB
);

CREATE INDEX idx_ml_data_quality_table ON ml_data_quality(table_name);
CREATE INDEX idx_ml_data_quality_checked_at ON ml_data_quality(checked_at DESC);

-- ============================================
-- ALERTS & ANOMALIES
-- ============================================

CREATE TABLE IF NOT EXISTS ml_anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anomaly_type VARCHAR(100) NOT NULL, -- 'drift', 'outlier', 'performance', 'data_quality'
    severity VARCHAR(50) NOT NULL, -- 'low', 'medium', 'high', 'critical'
    description TEXT NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(255),
    metrics JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ml_anomalies_resolved ON ml_anomalies(resolved, created_at DESC);
CREATE INDEX idx_ml_anomalies_type_severity ON ml_anomalies(anomaly_type, severity);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ml_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ml_models_updated_at
    BEFORE UPDATE ON ml_models
    FOR EACH ROW
    EXECUTE FUNCTION update_ml_updated_at();

CREATE TRIGGER update_ml_features_updated_at
    BEFORE UPDATE ON ml_features
    FOR EACH ROW
    EXECUTE FUNCTION update_ml_updated_at();

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- Active models view
CREATE OR REPLACE VIEW v_active_ml_models AS
SELECT
    m.model_name,
    m.model_type,
    m.model_version,
    m.framework,
    m.metrics,
    m.trained_at,
    COUNT(r.id) as total_runs,
    AVG(r.duration_seconds) as avg_training_duration
FROM ml_models m
LEFT JOIN ml_training_runs r ON m.id = r.model_id
WHERE m.is_active = TRUE
GROUP BY m.id
ORDER BY m.trained_at DESC;

-- Recent predictions view
CREATE OR REPLACE VIEW v_recent_predictions AS
SELECT
    prediction_type,
    entity_type,
    COUNT(*) as prediction_count,
    AVG(CAST(confidence AS FLOAT)) as avg_confidence,
    MAX(created_at) as latest_prediction
FROM ml_predictions
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY prediction_type, entity_type
ORDER BY prediction_count DESC;

-- Model performance summary
CREATE OR REPLACE VIEW v_model_performance_summary AS
SELECT
    m.model_name,
    m.model_type,
    m.model_version,
    m.trained_at,
    p.metric_name,
    p.metric_value,
    p.dataset_type
FROM ml_models m
JOIN ml_model_performance p ON m.id = p.model_id
WHERE m.is_active = TRUE
ORDER BY m.model_name, p.dataset_type, p.metric_name;

-- ============================================
-- SAMPLE DATA FOR DEMONSTRATION
-- ============================================

-- Insert some initial features
INSERT INTO ml_features (feature_name, feature_type, description) VALUES
('order_item_count', 'numerical', 'Number of items in an order'),
('order_total_value', 'numerical', 'Total value of the order'),
('picker_experience_days', 'numerical', 'Days of experience for the picker'),
('hour_of_day', 'temporal', 'Hour when the order was placed'),
('day_of_week', 'temporal', 'Day of the week when the order was placed'),
('sku_popularity_score', 'numerical', 'Historical picking frequency of the SKU'),
('warehouse_zone', 'categorical', 'Warehouse zone where items are located'),
('is_peak_hour', 'categorical', 'Whether the order was placed during peak hours'),
('distance_to_pick_zone', 'numerical', 'Distance from picker station to pick zone'),
('order_priority', 'categorical', 'Priority level of the order')
ON CONFLICT DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE ml_models IS 'Registry of trained ML models';
COMMENT ON TABLE ml_training_runs IS 'Log of all model training runs';
COMMENT ON TABLE ml_features IS 'Feature catalog for ML models';
COMMENT ON TABLE ml_feature_values IS 'Computed feature values for entities';
COMMENT ON TABLE ml_predictions IS 'Log of all model predictions';
COMMENT ON TABLE ml_model_performance IS 'Performance metrics for models';
COMMENT ON TABLE ml_feature_importance IS 'Feature importance scores';
COMMENT ON TABLE ml_anomalies IS 'Detected anomalies and alerts';
