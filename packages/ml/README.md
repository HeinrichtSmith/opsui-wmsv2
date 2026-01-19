# 🤖 Machine Learning Pipeline Documentation

> **Warehouse Management System - ML Infrastructure**
> Version 1.0.0 | Last Updated: 2025-01-12

---

## 📚 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Installation](#installation)
4. [Data Pipeline](#data-pipeline)
5. [Model Training](#model-training)
6. [Model Serving](#model-serving)
7. [API Reference](#api-reference)
8. [Frontend Integration](#frontend-integration)
9. [Monitoring & Logging](#monitoring--logging)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The ML Pipeline provides predictive analytics and optimization features for the Warehouse Management System, including:

- **Order Duration Prediction**: Estimate fulfillment time for orders
- **Demand Forecasting**: Predict SKU demand over time horizons
- **Route Optimization**: Optimize picking routes for efficiency
- **Performance Prediction**: Predict picker performance

### Key Features

✅ **Automated Feature Extraction** - Automatically compute features from database
✅ **Model Training Pipeline** - Train XGBoost, Random Forest, and Gradient Boosting models
✅ **Model Registry** - Version and track trained models
✅ **Real-time Predictions** - FastAPI-based prediction serving
✅ **Feature Store** - Persist and manage feature values
✅ **MLflow Integration** - Track experiments and metrics
✅ **Monitoring** - Prometheus metrics and logging
✅ **Type Safety** - Full TypeScript and Python type hints

---

## 🏗️ Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    WAREHOUSE MANAGEMENT SYSTEM              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────┐  │
│  │  FRONTEND   │    │    BACKEND   │    │  ML SERVICE │  │
│  │  (React)    │◄──►│   (Express)  │◄──►│  (FastAPI)  │  │
│  └─────────────┘    └──────────────┘    └─────────────┘  │
│         │                    │                    │        │
│         └────────────────────┴────────────────────┘        │
│                              │                              │
│                       ┌──────▼───────┐                      │
│                       │  PostgreSQL  │                      │
│                       │  Database    │                      │
│                       └──────────────┘                      │
│                                                               │
└─────────────────────────────────────────────────────────────┘

ML PACKAGE STRUCTURE:
packages/ml/
├── config.py                  # Configuration settings
├── requirements.txt            # Python dependencies
├── package.json               # Node.js dependencies
├── database/
│   └── migrations/
│       └── 001_ml_tables.sql  # ML database schema
├── scripts/
│   ├── data/
│   │   └── extract_features.py    # Feature extraction pipeline
│   └── models/
│       ├── train_duration_model.py # Duration prediction training
│       ├── train_demand_model.py    # Demand forecasting training
│       └── train_routes_model.py    # Route optimization training
├── src/
│   ├── api/
│   │   └── serve.py           # Model serving API
│   └── models/
│       └── __init__.py
└── models/                     # Trained model artifacts
```

---

## 🚀 Installation

### Prerequisites

```bash
# System requirements
- Node.js 20+
- Python 3.10+
- PostgreSQL 15+
- Redis (optional)
- 8GB RAM minimum for training
```

### Step 1: Install Python Dependencies

```bash
cd packages/ml

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Step 2: Install Node.js Dependencies

```bash
npm install
```

### Step 3: Configure Environment

Create `.env` file in `packages/ml/`:

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=wms
DATABASE_USER=wms_user
DATABASE_PASSWORD=wms_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# ML API
ML_API_HOST=0.0.0.0
ML_API_PORT=8001
ML_API_RELOAD=false

# MLflow
MLFLOW_TRACKING_URI=http://localhost:5000
MLFLOW_EXPERIMENT_NAME=wms-ml
```

### Step 4: Run Database Migrations

```bash
# From project root
npm run db:migrate

# Or directly with psql
psql -U wms_user -d wms -f packages/ml/database/migrations/001_ml_tables.sql
```

### Step 5: Start MLflow (Optional)

```bash
mlflow ui --port 5000
```

---

## 📊 Data Pipeline

### Feature Extraction

Extract features from the database for ML training:

```bash
# Extract all features
npm run extract-features

# Extract specific feature types
npm run extract-features -- --feature-type orders
npm run extract-features -- --feature-type demand
npm run extract-features -- --feature-type pickers

# Extract with custom date range
npm run extract-features -- --days-back 180

# Save to database feature store
npm run extract-features -- --save-to-db
```

### Feature Categories

**Order Features:**
- `order_item_count`: Number of items
- `order_total_value`: Total value
- `hour_of_day`: Hour (0-23)
- `day_of_week`: Day (0-6)
- `is_peak_hour`: Peak hours flag
- `is_weekend`: Weekend flag
- `sku_count`: Unique SKUs
- `avg_sku_popularity`: Average pick frequency
- `zone_diversity`: Warehouse zones
- `priority_level`: Order priority

**Demand Features:**
- Lag features (1 day, 7 days)
- Moving averages (7 day)
- Day of week, month
- Historical statistics

**Picker Features:**
- Experience metrics
- Performance history
- Task completion rates

---

## 🎓 Model Training

### Train Duration Prediction Model

```bash
# Basic training
npm run train:duration

# With hyperparameter tuning
npm run train:duration -- --tune

# Custom configuration
npm run train:duration -- --days-back 180 --output-dir models/duration_v2
```

### Training Configuration

Edit `scripts/models/train_duration_model.py`:

```python
# Model hyperparameters
MAX_DEPTH = 6
LEARNING_RATE = 0.1
N_ESTIMATORS = 200
SUBSAMPLE = 0.8
COLSAMPLE_BYTREE = 0.8

# Data configuration
DEFAULT_TRAINING_DAYS = 90
DEFAULT_TEST_SIZE = 0.2
DEFAULT_VAL_SIZE = 0.1
RANDOM_SEED = 42
```

### Training Outputs

Training produces:
- Trained model file (`.pkl`)
- Scaler for preprocessing
- Feature names mapping
- Performance metrics (JSON)
- MLflow run artifacts

### Model Metrics

Models are evaluated on:
- **MAE** (Mean Absolute Error): Average absolute difference
- **RMSE** (Root Mean Squared Error): Penalizes large errors
- **R²** (R-squared): Variance explained (0-1, higher is better)

---

## 🔮 Model Serving

### Start ML API Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm run start

# Custom host/port
ML_API_HOST=0.0.0.0 ML_API_PORT=8001 npm run start
```

### API Endpoints

#### Health Check
```bash
GET /health
```

#### List Models
```bash
GET /models
```

#### Predict Order Duration
```bash
POST /predict/duration
Content-Type: application/json

{
  "order_item_count": 5,
  "order_total_value": 150.00,
  "hour_of_day": 14,
  "day_of_week": 2,
  "is_peak_hour": 1,
  "is_weekend": 0,
  "sku_count": 3,
  "avg_sku_popularity": 50.5,
  "max_sku_popularity": 120.0,
  "zone_diversity": 2,
  "max_distance_zone": 3,
  "priority_level": 3,
  "picker_count": 5
}
```

#### Predict Demand
```bash
POST /predict/demand
Content-Type: application/json

{
  "sku_id": "SKU-12345",
  "forecast_horizon_days": 14
}
```

#### Metrics (Prometheus)
```bash
GET /metrics
```

---

## 📖 API Reference

### Order Duration Prediction

**Endpoint:** `POST /predict/duration`

**Request:**
```typescript
interface OrderDurationRequest {
  order_id?: string
  order_item_count: number      // 1+
  order_total_value: number     // >= 0
  hour_of_day: number           // 0-23
  day_of_week: number           // 0-6 (0=Monday)
  is_peak_hour: number          // 0 or 1
  is_weekend: number            // 0 or 1
  sku_count: number             // 1+
  avg_sku_popularity: number    // >= 0
  max_sku_popularity: number    // >= 0
  zone_diversity: number        // 1+
  max_distance_zone: number     // 1-5
  priority_level: number        // 1-4
  picker_count: number          // >= 0
}
```

**Response:**
```typescript
interface DurationPredictionResponse {
  prediction_id: string
  model_version: string
  prediction: {
    duration_minutes: number
    duration_hours: number
  }
  confidence: number            // 0-1
  metadata: {
    model_type: string
    predicted_at: string
  }
}
```

### Demand Forecasting

**Endpoint:** `POST /predict/demand`

**Request:**
```typescript
interface DemandForecastRequest {
  sku_id: string
  forecast_horizon_days: number // 1-365
}
```

**Response:**
```typescript
interface DemandForecastResponse {
  prediction_id: string
  model_version: string
  prediction: {
    sku_id: string
    forecast_horizon_days: number
    forecasts: Array<{
      day: number
      forecast_date: string
      forecast_quantity: number
    }>
  }
  confidence: number
  metadata: {
    model_type: string
    predicted_at: string
    historical_days: number
  }
}
```

---

## 🎨 Frontend Integration

### React Components

#### Order Duration Prediction

```tsx
import { OrderDurationPrediction } from '@/components/ml/OrderDurationPrediction'

function OrderPage({ order }) {
  return (
    <div>
      <OrderDurationPrediction
        orderId={order.id}
        orderData={{
          item_count: order.items.length,
          total_value: order.total,
          sku_count: order.uniqueSkus,
          zone_diversity: order.zones.length,
          priority: order.priority,
          created_at: order.createdAt
        }}
      />
    </div>
  )
}
```

#### Demand Forecast Chart

```tsx
import { DemandForecastChart } from '@/components/ml/DemandForecastChart'

function SKUPage({ skuId }) {
  return (
    <div>
      <DemandForecastChart
        skuId={skuId}
        forecastHorizonDays={14}
      />
    </div>
  )
}
```

### API Client

```typescript
// src/api/ml.ts
import { api } from './client'

export const mlApi = {
  predictDuration: async (data: OrderDurationRequest) => {
    const response = await api.post('/ml/predict/duration', data)
    return response.data
  },

  predictDemand: async (data: DemandForecastRequest) => {
    const response = await api.post('/ml/predict/demand', data)
    return response.data
  },

  getModels: async () => {
    const response = await api.get('/ml/models')
    return response.data
  }
}
```

---

## 📈 Monitoring & Logging

### Prometheus Metrics

The ML API exposes Prometheus metrics:

- `ml_predictions_total`: Total predictions (by model_type, status)
- `ml_prediction_duration_seconds`: Prediction latency (by model_type)

### MLflow Tracking

All training runs are tracked in MLflow:

```bash
# Start MLflow UI
mlflow ui

# View experiments
mlflow experiments list

# View runs
mlflow runs list --experiment-id 1
```

### Database Logs

Predictions are logged to `ml_predictions` table for:
- Audit trail
- Model performance monitoring
- Feature drift detection
- A/B testing

### Logging Configuration

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)
```

---

## 🔧 Troubleshooting

### Issue: Model fails to load

**Symptoms:** API returns 503 Service Unavailable

**Solutions:**
```bash
# Check if model files exist
ls -la models/duration/

# Check model format
python -c "import joblib; m = joblib.load('models/duration/model_xxx.pkl'); print(m)"

# Verify scaler matches model
ls -la models/duration/scaler_xxx.pkl
```

### Issue: Prediction is slow

**Solutions:**
```bash
# Check if prediction caching is enabled
# Check Redis connection
redis-cli ping

# Monitor prediction latency
curl http://localhost:8001/metrics
```

### Issue: Feature extraction fails

**Solutions:**
```bash
# Check database connection
psql -U wms_user -d wms -c "SELECT COUNT(*) FROM orders"

# Verify feature extraction script
python scripts/data/extract_features.py --help

# Check for missing data
psql -U wms_user -d wms -c "SELECT COUNT(*) FROM orders WHERE created_at < NOW() - INTERVAL '90 days'"
```

### Issue: Training is slow

**Solutions:**
```bash
# Reduce training data size
npm run train:duration -- --days-back 30

# Disable hyperparameter tuning
npm run train:duration -- --no-tune

# Use fewer estimators
# Edit train_duration_model.py and reduce N_ESTIMATORS
```

---

## 🚀 Quick Start Guide

### 1. Setup (First Time)

```bash
# Install dependencies
cd packages/ml
pip install -r requirements.txt
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
psql -U wms_user -d wms -f database/migrations/001_ml_tables.sql
```

### 2. Extract Features

```bash
# Extract features from last 90 days
npm run extract-features

# Or extract specific type
npm run extract-features -- --feature-type orders
```

### 3. Train Model

```bash
# Train duration prediction model
npm run train:duration

# Train with hyperparameter tuning (takes longer)
npm run train:duration -- --tune
```

### 4. Start ML API

```bash
# Start API server
npm run dev

# Verify it's running
curl http://localhost:8001/health
```

### 5. Make Predictions

```bash
curl -X POST http://localhost:8001/predict/duration \
  -H "Content-Type: application/json" \
  -d '{
    "order_item_count": 5,
    "order_total_value": 150.00,
    "hour_of_day": 14,
    "day_of_week": 2,
    "is_peak_hour": 1,
    "is_weekend": 0,
    "sku_count": 3,
    "avg_sku_popularity": 50.5,
    "max_sku_popularity": 120.0,
    "zone_diversity": 2,
    "max_distance_zone": 3,
    "priority_level": 3,
    "picker_count": 5
  }'
```

---

## 📚 Additional Resources

### Documentation
- [MLflow Docs](https://mlflow.org/docs/latest/index.html)
- [XGBoost Docs](https://xgboost.readthedocs.io/)
- [Scikit-learn Docs](https://scikit-learn.org/stable/)
- [FastAPI Docs](https://fastapi.tiangolo.com/)

### Project-Specific
- [Backend API Docs](../../backend/README.md)
- [Database Schema](../../database/README.md)
- [Architecture Overview](../../ARCHITECTURE.md)

---

## 🎯 Best Practices

### Data Quality
- ✅ Regularly update features (daily/weekly)
- ✅ Monitor data drift
- ✅ Validate feature distributions
- ✅ Handle missing values appropriately

### Model Management
- ✅ Version all trained models
- ✅ Document model performance
- ✅ Track training data lineage
- ✅ A/B test new models before deployment

### Production
- ✅ Use model canary deployments
- ✅ Monitor prediction latency
- ✅ Set up alerting for model failures
- ✅ Log all predictions for analysis

---

## 📞 Support

For issues or questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review ML logs in the database
- Check MLflow runs for training details
- Open an issue in the project repository

---

**🚀 Start predicting the future of your warehouse today!**
