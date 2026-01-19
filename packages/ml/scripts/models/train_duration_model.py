"""
Order Duration Prediction Model Training
Trains ML models to predict order fulfillment duration
"""

import os
import sys
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Tuple, Optional
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import Ridge, Lasso
import xgboost as xgb
import mlflow
import mlflow.sklearn
import mlflow.xgboost
from mlflow.models import infer_signature
import click
import joblib
from tqdm import tqdm

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from scripts.data.extract_features import FeatureExtractor
from config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class OrderDurationTrainer:
    """Train and evaluate order duration prediction models"""

    def __init__(self, db_url: str):
        self.db_url = db_url
        self.extractor = FeatureExtractor(db_url)
        self.scaler = StandardScaler()
        self.models = {}
        self.best_model = None
        self.feature_names = None

    def load_data(
        self,
        days_back: int = 90,
        use_cache: bool = True
    ) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Load and prepare training data

        Returns:
            X: Feature DataFrame
            y: Target Series (duration in minutes)
        """
        cache_file = f"data/cache/duration_data_{days_back}days.pkl"

        if use_cache and os.path.exists(cache_file):
            logger.info("Loading cached data...")
            data = joblib.load(cache_file)
            return data['X'], data['y']

        logger.info("Extracting features and targets...")
        features_df = self.extractor.extract_order_features(days_back=days_back)
        targets_df = self.extractor.extract_order_targets(days_back=days_back)

        # Merge features and targets
        logger.info("Merging features with targets...")
        df = pd.merge(
            features_df,
            targets_df[['order_id', 'duration_minutes']],
            on='order_id',
            how='inner'
        )

        # Filter completed orders only
        df = df[df['status'] == 'completed'].copy()

        # Remove outliers (duration > 99th percentile or < 1 minute)
        duration_99 = df['duration_minutes'].quantile(0.99)
        df = df[
            (df['duration_minutes'] >= 1) &
            (df['duration_minutes'] <= duration_99)
        ].copy()

        # Drop non-feature columns
        drop_cols = ['order_id', 'status', 'created_at', 'duration_minutes']
        feature_cols = [c for c in df.columns if c not in drop_cols]

        X = df[feature_cols].copy()
        y = df['duration_minutes'].copy()

        # Fill missing values
        X.fillna(0, inplace=True)

        self.feature_names = X.columns.tolist()

        logger.info(f"Loaded {len(X)} samples with {len(feature_cols)} features")
        logger.info(f"Target range: {y.min():.2f} - {y.max():.2f} minutes")
        logger.info(f"Target mean: {y.mean():.2f} ± {y.std():.2f} minutes")

        # Cache the data
        os.makedirs(os.path.dirname(cache_file), exist_ok=True)
        joblib.dump({'X': X, 'y': y}, cache_file)

        return X, y

    def preprocess_data(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        test_size: float = 0.2,
        val_size: float = 0.1
    ) -> Dict[str, Any]:
        """
        Preprocess and split data into train/val/test sets

        Returns:
            Dictionary with train/val/test splits and fitted scaler
        """
        # Train/val/test split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42
        )

        # Further split training into train/validation
        X_train, X_val, y_train, y_val = train_test_split(
            X_train, y_train, test_size=val_size / (1 - test_size), random_state=42
        )

        # Fit scaler on training data only
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_val_scaled = self.scaler.transform(X_val)
        X_test_scaled = self.scaler.transform(X_test)

        return {
            'X_train': X_train_scaled,
            'X_val': X_val_scaled,
            'X_test': X_test_scaled,
            'y_train': y_train,
            'y_val': y_val,
            'y_test': y_test,
            'X_train_raw': X_train,
            'X_val_raw': X_val,
            'X_test_raw': X_test
        }

    def train_xgboost(
        self,
        data: Dict[str, Any],
        tune_hyperparameters: bool = True
    ) -> xgb.XGBRegressor:
        """Train XGBoost model for duration prediction"""

        logger.info("Training XGBoost model...")

        if tune_hyperparameters:
            logger.info("Tuning hyperparameters with GridSearchCV...")
            param_grid = {
                'max_depth': [4, 6, 8],
                'learning_rate': [0.01, 0.1, 0.3],
                'n_estimators': [100, 200, 300],
                'subsample': [0.8, 1.0],
                'colsample_bytree': [0.8, 1.0]
            }

            model = xgb.XGBRegressor(
                random_state=42,
                n_jobs=-1,
                tree_method='hist'
            )

            grid_search = GridSearchCV(
                model,
                param_grid,
                cv=3,
                scoring='neg_mean_absolute_error',
                n_jobs=-1,
                verbose=1
            )

            grid_search.fit(
                data['X_train'],
                data['y_train'],
                eval_set=[(data['X_val'], data['y_val'])],
                verbose=False
            )

            model = grid_search.best_estimator_
            logger.info(f"Best parameters: {grid_search.best_params_}")
        else:
            model = xgb.XGBRegressor(
                max_depth=6,
                learning_rate=0.1,
                n_estimators=200,
                subsample=0.8,
                colsample_bytree=0.8,
                random_state=42,
                n_jobs=-1,
                tree_method='hist'
            )

            model.fit(
                data['X_train'],
                data['y_train'],
                eval_set=[(data['X_val'], data['y_val'])],
                verbose=False
            )

        return model

    def train_random_forest(
        self,
        data: Dict[str, Any]
    ) -> RandomForestRegressor:
        """Train Random Forest model"""

        logger.info("Training Random Forest model...")

        model = RandomForestRegressor(
            n_estimators=200,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            n_jobs=-1,
            random_state=42
        )

        model.fit(data['X_train'], data['y_train'])

        return model

    def train_gradient_boosting(
        self,
        data: Dict[str, Any]
    ) -> GradientBoostingRegressor:
        """Train Gradient Boosting model"""

        logger.info("Training Gradient Boosting model...")

        model = GradientBoostingRegressor(
            n_estimators=200,
            learning_rate=0.1,
            max_depth=6,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42
        )

        model.fit(data['X_train'], data['y_train'])

        return model

    def evaluate_model(
        self,
        model: Any,
        data: Dict[str, Any],
        model_name: str
    ) -> Dict[str, float]:
        """Evaluate model performance"""

        # Predictions
        y_train_pred = model.predict(data['X_train'])
        y_val_pred = model.predict(data['X_val'])
        y_test_pred = model.predict(data['X_test'])

        # Calculate metrics
        metrics = {
            'train_mae': mean_absolute_error(data['y_train'], y_train_pred),
            'train_rmse': np.sqrt(mean_squared_error(data['y_train'], y_train_pred)),
            'train_r2': r2_score(data['y_train'], y_train_pred),
            'val_mae': mean_absolute_error(data['y_val'], y_val_pred),
            'val_rmse': np.sqrt(mean_squared_error(data['y_val'], y_val_pred)),
            'val_r2': r2_score(data['y_val'], y_val_pred),
            'test_mae': mean_absolute_error(data['y_test'], y_test_pred),
            'test_rmse': np.sqrt(mean_squared_error(data['y_test'], y_test_pred)),
            'test_r2': r2_score(data['y_test'], y_test_pred)
        }

        # Log metrics
        logger.info(f"\n{model_name} Performance:")
        logger.info(f"  Training:")
        logger.info(f"    MAE:  {metrics['train_mae']:.2f} minutes")
        logger.info(f"    RMSE: {metrics['train_rmse']:.2f} minutes")
        logger.info(f"    R²:   {metrics['train_r2']:.4f}")
        logger.info(f"  Validation:")
        logger.info(f"    MAE:  {metrics['val_mae']:.2f} minutes")
        logger.info(f"    RMSE: {metrics['val_rmse']:.2f} minutes")
        logger.info(f"    R²:   {metrics['val_r2']:.4f}")
        logger.info(f"  Test:")
        logger.info(f"    MAE:  {metrics['test_mae']:.2f} minutes")
        logger.info(f"    RMSE: {metrics['test_rmse']:.2f} minutes")
        logger.info(f"    R²:   {metrics['test_r2']:.4f}")

        return metrics

    def train_all_models(
        self,
        data: Dict[str, Any],
        tune_xgb: bool = False
    ) -> Dict[str, Any]:
        """Train multiple models and select the best"""

        results = {}

        # Train XGBoost
        logger.info("\n" + "=" * 80)
        logger.info("TRAINING XGBOOST MODEL")
        logger.info("=" * 80)
        xgb_model = self.train_xgboost(data, tune_hyperparameters=tune_xgb)
        xgb_metrics = self.evaluate_model(xgb_model, data, "XGBoost")
        results['xgboost'] = {'model': xgb_model, 'metrics': xgb_metrics}

        # Train Random Forest
        logger.info("\n" + "=" * 80)
        logger.info("TRAINING RANDOM FOREST MODEL")
        logger.info("=" * 80)
        rf_model = self.train_random_forest(data)
        rf_metrics = self.evaluate_model(rf_model, data, "Random Forest")
        results['random_forest'] = {'model': rf_model, 'metrics': rf_metrics}

        # Train Gradient Boosting
        logger.info("\n" + "=" * 80)
        logger.info("TRAINING GRADIENT BOOSTING MODEL")
        logger.info("=" * 80)
        gb_model = self.train_gradient_boosting(data)
        gb_metrics = self.evaluate_model(gb_model, data, "Gradient Boosting")
        results['gradient_boosting'] = {'model': gb_model, 'metrics': gb_metrics}

        # Select best model based on validation MAE
        best_model_name = min(
            results.keys(),
            key=lambda k: results[k]['metrics']['val_mae']
        )
        self.best_model = results[best_model_name]['model']
        self.models = results

        logger.info("\n" + "=" * 80)
        logger.info(f"BEST MODEL: {best_model_name}")
        logger.info(f"Validation MAE: {results[best_model_name]['metrics']['val_mae']:.2f} minutes")
        logger.info("=" * 80)

        return results

    def save_model(
        self,
        output_dir: str = 'models/duration'
    ) -> Dict[str, str]:
        """Save trained models and artifacts"""

        os.makedirs(output_dir, exist_ok=True)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

        saved_paths = {}

        # Save best model
        model_path = f"{output_dir}/model_{timestamp}.pkl"
        joblib.dump(self.best_model, model_path)
        saved_paths['model'] = model_path

        # Save scaler
        scaler_path = f"{output_dir}/scaler_{timestamp}.pkl"
        joblib.dump(self.scaler, scaler_path)
        saved_paths['scaler'] = scaler_path

        # Save feature names
        feature_names_path = f"{output_dir}/feature_names_{timestamp}.json"
        with open(feature_names_path, 'w') as f:
            json.dump(self.feature_names, f)
        saved_paths['feature_names'] = feature_names_path

        # Save metrics
        metrics = {
            name: info['metrics']
            for name, info in self.models.items()
        }
        metrics_path = f"{output_dir}/metrics_{timestamp}.json"
        with open(metrics_path, 'w') as f:
            json.dump(metrics, f, indent=2)
        saved_paths['metrics'] = metrics_path

        logger.info(f"Model artifacts saved to {output_dir}")

        return saved_paths

    def log_to_mlflow(
        self,
        model_name: str,
        metrics: Dict[str, float],
        artifact_paths: Dict[str, str],
        data: Dict[str, Any]
    ):
        """Log training run to MLflow"""

        mlflow.set_experiment("wms-order-duration-prediction")

        with mlflow.start_run():
            # Log parameters
            mlflow.log_params({
                'model_type': type(self.best_model).__name__,
                'n_features': len(self.feature_names),
                'n_train_samples': len(data['y_train']),
                'n_val_samples': len(data['y_val']),
                'n_test_samples': len(data['y_test'])
            })

            # Log metrics
            mlflow.log_metrics(metrics)

            # Log model
            signature = infer_signature(data['X_train'], data['y_train'])

            if isinstance(self.best_model, xgb.XGBRegressor):
                mlflow.xgboost.log_model(
                    self.best_model,
                    "model",
                    signature=signature
                )
            else:
                mlflow.sklearn.log_model(
                    self.best_model,
                    "model",
                    signature=signature
                )

            # Log artifacts
            for name, path in artifact_paths.items():
                mlflow.log_artifact(path)

        logger.info("Training run logged to MLflow")


@click.command()
@click.option('--days-back', type=int, default=90, help='Days of data to use for training')
@click.option('--tune', is_flag=True, help='Perform hyperparameter tuning')
@click.option('--output-dir', type=str, default='models/duration', help='Output directory for models')
@click.option('--use-cache', is_flag=True, help='Use cached data if available')
@click.option('--no-mlflow', is_flag=True, help='Skip MLflow logging')
def main(days_back: int, tune: bool, output_dir: str, use_cache: bool, no_mlflow: bool):
    """Train order duration prediction model"""

    logger.info("=" * 80)
    logger.info("ORDER DURATION PREDICTION MODEL TRAINING")
    logger.info("=" * 80)
    logger.info(f"Configuration:")
    logger.info(f"  Days back: {days_back}")
    logger.info(f"  Hyperparameter tuning: {tune}")
    logger.info(f"  Output directory: {output_dir}")
    logger.info(f"  Use cache: {use_cache}")
    logger.info(f"  MLflow logging: {not no_mlflow}")
    logger.info("=" * 80)

    # Initialize trainer
    trainer = OrderDurationTrainer(settings.database_url)

    # Load data
    X, y = trainer.load_data(days_back=days_back, use_cache=use_cache)

    # Preprocess data
    data = trainer.preprocess_data(X, y)

    # Train models
    results = trainer.train_all_models(data, tune_xgb=tune)

    # Save models
    artifact_paths = trainer.save_model(output_dir)

    # Log to MLflow
    if not no_mlflow:
        best_metrics = results['xgboost']['metrics']
        trainer.log_to_mlflow(
            'order_duration',
            best_metrics,
            artifact_paths,
            data
        )

    logger.info("\n" + "=" * 80)
    logger.info("TRAINING COMPLETE")
    logger.info("=" * 80)


if __name__ == '__main__':
    main()
