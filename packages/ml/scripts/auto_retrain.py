#!/usr/bin/env python3
"""
Automated ML Model Retraining Pipeline
Trains and deploys ML models on a schedule or when triggered
"""

import os
import sys
import json
import logging
import schedule
import time
from datetime import datetime, timedelta
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(project_root / 'logs' / 'ml_retraining.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Model configurations
MODELS_TO_TRAIN = [
    {
        'name': 'duration',
        'script': 'scripts/models/train_duration_model.py',
        'schedule': 'weekly',  # Train every week
        'priority': 1,
        'min_data_days': 90
    },
    {
        'name': 'demand',
        'script': 'scripts/models/train_demand_model.py',
        'schedule': 'daily',  # Train daily
        'priority': 2,
        'min_data_days': 30
    },
    {
        'name': 'routes',
        'script': 'scripts/models/train_route_optimization.py',
        'schedule': 'weekly',  # Train every week
        'priority': 3,
        'min_data_days': 60
    }
]

def check_data_availability(min_days: int) -> bool:
    """Check if enough data is available for training"""
    # This would query the database to check data availability
    # For now, return True (placeholder)
    return True

def train_model(model_config: dict) -> dict:
    """Train a single model"""
    model_name = model_config['name']
    script_path = model_config['script']

    logger.info(f"Starting training for {model_name} model")

    # Check data availability
    if not check_data_availability(model_config['min_data_days']):
        logger.warning(f"Insufficient data for {model_name} model")
        return {
            'model': model_name,
            'status': 'skipped',
            'reason': 'insufficient_data'
        }

    try:
        import subprocess
        ml_dir = Path(__file__).parent.parent

        result = subprocess.run(
            [sys.executable, script_path],
            cwd=ml_dir,
            capture_output=True,
            text=True,
            timeout=3600  # 1 hour timeout
        )

        if result.returncode == 0:
            logger.info(f"Successfully trained {model_name} model")
            return {
                'model': model_name,
                'status': 'success',
                'output': result.stdout
            }
        else:
            logger.error(f"Failed to train {model_name} model: {result.stderr}")
            return {
                'model': model_name,
                'status': 'failed',
                'error': result.stderr
            }

    except subprocess.TimeoutExpired:
        logger.error(f"Training {model_name} model timed out")
        return {
            'model': model_name,
            'status': 'failed',
            'error': 'timeout'
        }
    except Exception as e:
        logger.error(f"Error training {model_name} model: {e}")
        return {
            'model': model_name,
            'status': 'failed',
            'error': str(e)
        }

def train_all_models() -> list:
    """Train all models based on their schedules"""
    results = []

    # Sort by priority
    models = sorted(MODELS_TO_TRAIN, key=lambda x: x['priority'])

    for model_config in models:
        result = train_model(model_config)
        results.append(result)

    return results

def scheduled_training():
    """Run scheduled training"""
    logger.info("=" * 60)
    logger.info("Starting scheduled ML model training")
    logger.info("=" * 60)

    results = train_all_models()

    # Summary
    success_count = sum(1 for r in results if r['status'] == 'success')
    failed_count = sum(1 for r in results if r['status'] == 'failed')
    skipped_count = sum(1 for r in results if r['status'] == 'skipped')

    logger.info("=" * 60)
    logger.info("Training Summary:")
    logger.info(f"  Success: {success_count}")
    logger.info(f"  Failed: {failed_count}")
    logger.info(f"  Skipped: {skipped_count}")
    logger.info("=" * 60)

    # Save results
    results_dir = Path(__file__).parent.parent / 'training_results'
    results_dir.mkdir(exist_ok=True)

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    results_file = results_dir / f'training_{timestamp}.json'

    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2)

    logger.info(f"Results saved to {results_file}")

def main():
    """Main entry point"""
    logger.info("ML Retraining Pipeline started")

    # Schedule training
    schedule.every().day.at('02:00').do(scheduled_training)  # Daily at 2 AM
    schedule.every().sunday.at('03:00').do(scheduled_training)  # Sunday at 3 AM

    # Run on startup if requested
    if '--train-now' in sys.argv:
        logger.info("Running immediate training")
        scheduled_training()

    # Keep running if in daemon mode
    if '--daemon' in sys.argv:
        logger.info("Running in daemon mode")
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
    else:
        logger.info("Single run mode - exiting")

if __name__ == '__main__':
    main()
