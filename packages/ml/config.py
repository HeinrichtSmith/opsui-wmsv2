"""
Configuration settings for ML Pipeline
Loads from environment variables with defaults
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings"""

    # Database
    database_host: str = "localhost"
    database_port: int = 5432
    database_name: str = "wms"
    database_user: str = "wms_user"
    database_password: str = "wms_password"

    @property
    def database_url(self) -> str:
        """Construct database URL"""
        return f"postgresql://{self.database_user}:{self.database_password}@{self.database_host}:{self.database_port}/{self.database_name}"

    # Redis
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: Optional[str] = None
    redis_db: int = 0

    @property
    def redis_url(self) -> str:
        """Construct Redis URL"""
        if self.redis_password:
            return f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}/{self.redis_db}"
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"

    # ML API
    ml_api_host: str = "0.0.0.0"
    ml_api_port: int = 8001
    ml_api_reload: bool = False

    # MLflow
    mlflow_tracking_uri: str = "http://localhost:5000"
    mlflow_experiment_name: str = "wms-ml"

    # Model paths
    models_dir: str = "models"
    data_dir: str = "data"

    # Feature store
    feature_store_update_interval: int = 3600  # seconds
    max_feature_history_days: int = 365

    # Training
    default_training_days: int = 90
    default_test_size: float = 0.2
    default_val_size: float = 0.1
    random_seed: int = 42

    # Prediction
    default_prediction_cache_ttl: int = 300  # seconds
    max_prediction_batch_size: int = 100

    # Logging
    log_level: str = "INFO"
    log_format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    # Monitoring
    enable_prometheus: bool = True
    prometheus_port: int = 9090

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


# Export settings instance
settings = get_settings()
