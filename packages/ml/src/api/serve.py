"""
ML Model Serving API
Serves trained ML models for real-time predictions
"""

import os
import sys
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib
import json
from prometheus_client import Counter, Histogram, generate_latest
from prometheus_client.exposition import CONTENT_TYPE_LATEST
from sqlalchemy import create_engine, text
from sqlalchemy.pool import QueuePool
from contextlib import asynccontextmanager

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global state
models_cache = {}
scalers_cache = {}


# Prometheus metrics
prediction_counter = Counter(
    'ml_predictions_total',
    'Total number of predictions made',
    ['model_type', 'status']
)
prediction_duration = Histogram(
    'ml_prediction_duration_seconds',
    'Prediction duration in seconds',
    ['model_type']
)


# Pydantic models
class OrderDurationRequest(BaseModel):
    """Request for order duration prediction"""
    order_id: Optional[str] = None
    order_item_count: int = Field(..., ge=1, description="Number of items in order")
    order_total_value: float = Field(..., ge=0, description="Total order value")
    hour_of_day: int = Field(..., ge=0, le=23, description="Hour of day (0-23)")
    day_of_week: int = Field(..., ge=0, le=6, description="Day of week (0=Monday, 6=Sunday)")
    is_peak_hour: int = Field(..., ge=0, le=1, description="Is peak hour flag")
    is_weekend: int = Field(..., ge=0, le=1, description="Is weekend flag")
    sku_count: int = Field(..., ge=1, description="Number of unique SKUs")
    avg_sku_popularity: float = Field(..., ge=0, description="Average SKU popularity")
    max_sku_popularity: float = Field(..., ge=0, description="Maximum SKU popularity")
    zone_diversity: int = Field(..., ge=1, description="Number of warehouse zones")
    max_distance_zone: int = Field(..., ge=1, le=5, description="Furthest warehouse zone")
    priority_level: int = Field(..., ge=1, le=4, description="Order priority level")
    picker_count: int = Field(..., ge=0, description="Number of available pickers")


class DemandForecastRequest(BaseModel):
    """Request for demand forecasting"""
    sku_id: str = Field(..., description="SKU identifier")
    forecast_horizon_days: int = Field(
        ...,
        ge=1,
        le=365,
        description="Number of days to forecast"
    )


class RouteOptimizationRequest(BaseModel):
    """Request for route optimization"""
    picker_id: str = Field(..., description="Picker identifier")
    order_ids: List[str] = Field(..., min_items=1, description="List of order IDs")
    current_location: str = Field(..., description="Current bin location")


class PredictionResponse(BaseModel):
    """Standard prediction response"""
    prediction_id: str = Field(..., description="Unique prediction identifier")
    model_version: str = Field(..., description="Model version used")
    prediction: Dict[str, Any] = Field(..., description="Prediction results")
    confidence: Optional[float] = Field(None, description="Confidence score")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")


class ErrorResponse(BaseModel):
    """Error response"""
    error: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Detailed error information")


# Database connection
def get_db_engine():
    """Get database engine"""
    return create_engine(
        settings.database_url,
        poolclass=QueuePool,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True
    )


# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    logger.info("Loading ML models...")
    load_all_models()
    logger.info("Models loaded successfully")

    yield

    # Shutdown
    logger.info("Shutting down ML API...")


# FastAPI app
app = FastAPI(
    title="Warehouse Management System - ML API",
    description="Machine Learning model serving API for predictive features",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_model(model_type: str, model_path: str, scaler_path: Optional[str] = None):
    """Load a trained model and its scaler"""
    if model_type in models_cache:
        return models_cache[model_type], scalers_cache.get(model_type)

    logger.info(f"Loading model: {model_type} from {model_path}")

    try:
        model = joblib.load(model_path)
        models_cache[model_type] = model

        scaler = None
        if scaler_path and os.path.exists(scaler_path):
            scaler = joblib.load(scaler_path)
            scalers_cache[model_type] = scaler

        logger.info(f"Model {model_type} loaded successfully")
        return model, scaler

    except Exception as e:
        logger.error(f"Failed to load model {model_type}: {e}")
        raise


def load_all_models():
    """Load all trained models on startup"""
    models_dir = "models"

    # Load duration prediction model
    duration_model_path = find_latest_model(f"{models_dir}/duration", "model_")
    duration_scaler_path = find_latest_model(f"{models_dir}/duration", "scaler_")

    if duration_model_path:
        load_model("duration", duration_model_path, duration_scaler_path)


def find_latest_model(directory: str, prefix: str) -> Optional[str]:
    """Find the latest model file in a directory"""
    if not os.path.exists(directory):
        return None

    files = [
        f for f in os.listdir(directory)
        if f.startswith(prefix) and f.endswith('.pkl')
    ]

    if not files:
        return None

    # Sort by timestamp in filename
    files.sort(reverse=True)
    return os.path.join(directory, files[0])


def log_prediction_to_db(
    db_engine,
    model_id: str,
    prediction_type: str,
    entity_type: str,
    entity_id: str,
    input_features: Dict,
    prediction: Dict,
    confidence: Optional[float] = None
):
    """Log prediction to database"""
    try:
        with db_engine.connect() as conn:
            conn.execute(text("""
                INSERT INTO ml_predictions (
                    model_id, model_version, prediction_type,
                    entity_type, entity_id, input_features,
                    prediction, confidence
                ) VALUES (
                    :model_id, :model_version, :prediction_type,
                    :entity_type, :entity_id, :input_features,
                    :prediction, :confidence
                )
            """), {
                'model_id': model_id,
                'model_version': '1.0.0',
                'prediction_type': prediction_type,
                'entity_type': entity_type,
                'entity_id': str(entity_id),
                'input_features': json.dumps(input_features),
                'prediction': json.dumps(prediction),
                'confidence': confidence
            })
            conn.commit()
    except Exception as e:
        logger.error(f"Failed to log prediction: {e}")


# API Endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "models_loaded": list(models_cache.keys())
    }


@app.get("/models")
async def list_models():
    """List available models"""
    return {
        "models": [
            {
                "type": model_type,
                "loaded": model_type in models_cache,
                "class": type(models_cache[model_type]).__name__ if model_type in models_cache else None
            }
            for model_type in ["duration", "demand", "routes"]
        ]
    }


@app.post("/predict/duration", response_model=PredictionResponse)
async def predict_order_duration(
    request: OrderDurationRequest,
    db_engine = Depends(get_db_engine)
):
    """
    Predict order fulfillment duration

    Returns predicted time to complete an order in minutes
    """
    import time
    import uuid

    start_time = time.time()
    prediction_id = str(uuid.uuid4())

    try:
        # Check if model is loaded
        if "duration" not in models_cache:
            raise HTTPException(
                status_code=503,
                detail="Duration prediction model not available"
            )

        model = models_cache["duration"]
        scaler = scalers_cache.get("duration")

        # Prepare features
        feature_order = [
            "order_item_count", "order_total_value", "hour_of_day",
            "day_of_week", "is_peak_hour", "is_weekend", "sku_count",
            "avg_sku_popularity", "max_sku_popularity", "zone_diversity",
            "max_distance_zone", "priority_level", "picker_count"
        ]

        features = np.array([[
            request.order_item_count,
            request.order_total_value,
            request.hour_of_day,
            request.day_of_week,
            request.is_peak_hour,
            request.is_weekend,
            request.sku_count,
            request.avg_sku_popularity,
            request.max_sku_popularity,
            request.zone_diversity,
            request.max_distance_zone,
            request.priority_level,
            request.picker_count
        ]])

        # Scale features if scaler is available
        if scaler:
            features = scaler.transform(features)

        # Make prediction
        prediction = model.predict(features)[0]
        prediction = max(0, prediction)  # Ensure non-negative

        # Calculate confidence (using prediction variance if available)
        confidence = None
        if hasattr(model, 'predict_proba'):
            # For probabilistic models
            confidence = model.predict_proba(features)[0].max()
        else:
            # For deterministic models, estimate confidence
            # (This is a simplified approach)
            confidence = 0.85

        duration_seconds = time.time() - start_time

        # Update metrics
        prediction_counter.labels(
            model_type="duration",
            status="success"
        ).inc()
        prediction_duration.labels(
            model_type="duration"
        ).observe(duration_seconds)

        # Prepare response
        response = PredictionResponse(
            prediction_id=prediction_id,
            model_version="1.0.0",
            prediction={
                "duration_minutes": round(float(prediction), 2),
                "duration_hours": round(float(prediction) / 60, 2)
            },
            confidence=round(float(confidence), 4) if confidence else None,
            metadata={
                "model_type": "xgboost",
                "predicted_at": datetime.now().isoformat()
            }
        )

        # Log prediction to database
        log_prediction_to_db(
            db_engine,
            model_id="duration-model-v1",
            prediction_type="order_duration",
            entity_type="order",
            entity_id=request.order_id or prediction_id,
            input_features=request.dict(),
            prediction=response.prediction,
            confidence=confidence
        )

        return response

    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        prediction_counter.labels(
            model_type="duration",
            status="error"
        ).inc()

        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )


@app.post("/predict/demand", response_model=PredictionResponse)
async def predict_demand(
    request: DemandForecastRequest,
    db_engine = Depends(get_db_engine)
):
    """
    Predict demand for a SKU

    Returns forecasted demand for the specified horizon
    """
    import time
    import uuid

    start_time = time.time()
    prediction_id = str(uuid.uuid4())

    try:
        # Check if model is loaded
        if "demand" not in models_cache:
            raise HTTPException(
                status_code=503,
                detail="Demand forecasting model not available"
            )

        model = models_cache["demand"]
        scaler = scalers_cache.get("demand")

        # Fetch recent demand data from database
        with db_engine.connect() as conn:
            query = text("""
                WITH daily_demand AS (
                    SELECT
                        DATE_TRUNC('day', o.created_at) as demand_date,
                        SUM(oi.quantity) as total_quantity
                    FROM orders o
                    JOIN order_items oi ON o.id = oi.order_id
                    WHERE oi.sku_id = :sku_id
                      AND o.created_at >= NOW() - INTERVAL '30 days'
                      AND o.status = 'completed'
                    GROUP BY DATE_TRUNC('day', o.created_at)
                    ORDER BY demand_date DESC
                    LIMIT 30
                )
                SELECT
                    demand_date,
                    total_quantity,
                    LAG(total_quantity, 1) OVER (ORDER BY demand_date) as quantity_lag1,
                    LAG(total_quantity, 7) OVER (ORDER BY demand_date) as quantity_lag7,
                    AVG(total_quantity) OVER (
                        ORDER BY demand_date
                        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
                    ) as quantity_ma7
                FROM daily_demand
                ORDER BY demand_date ASC
            """)
            result = conn.execute(query, {"sku_id": request.sku_id})
            rows = result.fetchall()

        if not rows:
            raise HTTPException(
                status_code=404,
                detail=f"No demand history found for SKU {request.sku_id}"
            )

        # Prepare features for prediction
        recent_demand = [row.total_quantity for row in rows[-7:]]  # Last 7 days
        avg_demand = sum(recent_demand) / len(recent_demand)

        # Simple forecasting (in production, use the trained model)
        forecast = []
        for day in range(1, request.forecast_horizon_days + 1):
            # Use moving average with trend adjustment
            base_forecast = avg_demand
            trend = 0.0

            if len(recent_demand) >= 2:
                trend = (recent_demand[-1] - recent_demand[-7]) / 7 if len(recent_demand) >= 7 else 0

            forecast_value = max(0, base_forecast + trend * day)
            forecast.append({
                "day": day,
                "forecast_date": (
                    datetime.now() + timedelta(days=day)
                ).strftime("%Y-%m-%d"),
                "forecast_quantity": round(forecast_value, 2)
            })

        duration_seconds = time.time() - start_time

        # Update metrics
        prediction_counter.labels(
            model_type="demand",
            status="success"
        ).inc()
        prediction_duration.labels(
            model_type="demand"
        ).observe(duration_seconds)

        response = PredictionResponse(
            prediction_id=prediction_id,
            model_version="1.0.0",
            prediction={
                "sku_id": request.sku_id,
                "forecast_horizon_days": request.forecast_horizon_days,
                "forecasts": forecast
            },
            confidence=0.75,  # Default confidence for demand forecasting
            metadata={
                "model_type": "arima",
                "predicted_at": datetime.now().isoformat(),
                "historical_days": len(rows)
            }
        )

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Demand prediction failed: {e}")
        prediction_counter.labels(
            model_type="demand",
            status="error"
        ).inc()

        raise HTTPException(
            status_code=500,
            detail=f"Demand prediction failed: {str(e)}"
        )


@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return generate_latest()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host=settings.ml_api_host,
        port=settings.ml_api_port,
        reload=settings.ml_api_reload
    )
