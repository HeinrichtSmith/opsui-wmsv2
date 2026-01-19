"""
Feature Extraction Pipeline for Warehouse Management System
Extracts and computes features from the database for ML training
"""

import os
import sys
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
from sqlalchemy.pool import QueuePool
from sqlalchemy.orm import sessionmaker
from tqdm import tqdm
import click
import joblib

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class FeatureExtractor:
    """Extract and compute features from the warehouse database"""

    def __init__(self, db_url: str):
        """Initialize the feature extractor with database connection"""
        self.engine = create_engine(
            db_url,
            poolclass=QueuePool,
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
            echo=False
        )
        self.Session = sessionmaker(bind=self.engine)

    def extract_order_features(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> pd.DataFrame:
        """
        Extract features for order duration prediction

        Returns DataFrame with features:
        - order_item_count: Number of items in order
        - order_total_value: Total value of order items
        - hour_of_day: Hour when order was created (0-23)
        - day_of_week: Day of week (0-6, 0=Monday)
        - is_peak_hour: Binary flag for peak hours (8-10, 14-16)
        - is_weekend: Binary flag for weekend
        - sku_count: Number of unique SKUs in order
        - avg_sku_popularity: Average historical pick frequency of SKUs
        - max_distance_zone: Furthest warehouse zone in order
        - zone_diversity: Number of different warehouse zones
        - priority_level: Order priority (numeric encoding)
        - picker_count: Number of available pickers at order time
        """
        query = """
        WITH order_base AS (
            SELECT
                o.id as order_id,
                o.created_at,
                o.status,
                o.priority,
                COUNT(oi.id) as item_count,
                COUNT(DISTINCT oi.sku_id) as sku_count,
                COALESCE(SUM(oi.quantity), 0) as total_quantity
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.created_at >= :start_date
              AND o.created_at < :end_date
              AND o.status IN ('completed', 'cancelled')
            GROUP BY o.id
        ),
        order_value AS (
            SELECT
                ob.order_id,
                COALESCE(SUM(oi.quantity * s.cost_price), 0) as order_value
            FROM order_base ob
            LEFT JOIN order_items oi ON ob.order_id = oi.order_id
            LEFT JOIN skus s ON oi.sku_id = s.id
            GROUP BY ob.order_id
        ),
        sku_popularity AS (
            SELECT
                sku_id,
                COUNT(*) as pick_count,
                COUNT(DISTINCT DATE_TRUNC('day', created_at)) as days_picked
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE o.created_at >= NOW() - INTERVAL '30 days'
              AND o.status = 'completed'
            GROUP BY sku_id
        ),
        order_sku_features AS (
            SELECT
                ob.order_id,
                COALESCE(AVG(sp.pick_count), 0) as avg_sku_popularity,
                COALESCE(MAX(sp.pick_count), 0) as max_sku_popularity
            FROM order_base ob
            LEFT JOIN order_items oi ON ob.order_id = oi.order_id
            LEFT JOIN sku_popularity sp ON oi.sku_id = sp.sku_id
            GROUP BY ob.order_id
        ),
        zone_features AS (
            SELECT
                ob.order_id,
                COUNT(DISTINCT bl.zone) as zone_diversity,
                COALESCE(MAX(
                    CASE bl.zone
                        WHEN 'A' THEN 1
                        WHEN 'B' THEN 2
                        WHEN 'C' THEN 3
                        WHEN 'D' THEN 4
                        ELSE 5
                    END
                ), 0) as max_distance_zone
            FROM order_base ob
            LEFT JOIN order_items oi ON ob.order_id = oi.order_id
            LEFT JOIN inventory_units iu ON oi.sku_id = iu.sku_id
            LEFT JOIN bin_locations bl ON iu.bin_location_id = bl.id
            GROUP BY ob.order_id
        ),
        picker_availability AS (
            SELECT
                DATE_TRUNC('hour', o.created_at) as hour_slot,
                COUNT(DISTINCT CASE WHEN u.role = 'PICKER' THEN u.id END) as picker_count
            FROM orders o
            CROSS JOIN users u
            WHERE u.is_active = true
              AND u.role = 'PICKER'
            GROUP BY hour_slot
        )
        SELECT
            ob.order_id,
            ob.item_count as order_item_count,
            ov.order_value as order_total_value,
            EXTRACT(HOUR FROM ob.created_at) as hour_of_day,
            EXTRACT(DOW FROM ob.created_at) as day_of_week,
            CASE WHEN EXTRACT(HOUR FROM ob.created_at) IN (8, 9, 10, 14, 15, 16)
                THEN 1 ELSE 0
            END as is_peak_hour,
            CASE WHEN EXTRACT(DOW FROM ob.created_at) IN (0, 6)
                THEN 1 ELSE 0
            END as is_weekend,
            ob.sku_count,
            osf.avg_sku_popularity,
            osf.max_sku_popularity,
            zf.zone_diversity,
            zf.max_distance_zone,
            CASE ob.priority
                WHEN 'URGENT' THEN 4
                WHEN 'HIGH' THEN 3
                WHEN 'NORMAL' THEN 2
                WHEN 'LOW' THEN 1
                ELSE 2
            END as priority_level,
            COALESCE(pa.picker_count, 0) as picker_count,
            ob.status,
            ob.created_at
        FROM order_base ob
        LEFT JOIN order_value ov ON ob.order_id = ov.order_id
        LEFT JOIN order_sku_features osf ON ob.order_id = osf.order_id
        LEFT JOIN zone_features zf ON ob.order_id = zf.order_id
        LEFT JOIN picker_availability pa ON DATE_TRUNC('hour', ob.created_at) = pa.hour_slot
        ORDER BY ob.created_at
        """

        if start_date is None:
            start_date = datetime.now() - timedelta(days=90)
        if end_date is None:
            end_date = datetime.now()

        logger.info(f"Extracting order features from {start_date} to {end_date}")

        with self.engine.connect() as conn:
            df = pd.read_sql(
                text(query),
                conn,
                params={'start_date': start_date, 'end_date': end_date}
            )

        logger.info(f"Extracted {len(df)} order features")
        return df

    def extract_order_targets(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> pd.DataFrame:
        """
        Extract target variables for supervised learning

        Returns DataFrame with targets:
        - duration_minutes: Time from order creation to completion
        - pick_time_minutes: Time spent picking
        - pack_time_minutes: Time spent packing
        """
        query = """
        SELECT
            o.id as order_id,
            EXTRACT(EPOCH FROM (
                COALESCE(osc.completed_at, o.updated_at) - o.created_at
            )) / 60 as duration_minutes,
            EXTRACT(EPOCH FROM (
                COALESCE(pt.completed_at, o.updated_at) - o.created_at
            )) / 60 as pick_time_minutes
        FROM orders o
        LEFT JOIN order_state_changes osc ON o.id = osc.order_id
            AND osc.new_status = 'completed'
        LEFT JOIN pick_tasks pt ON o.id = pt.order_id
        WHERE o.created_at >= :start_date
          AND o.created_at < :end_date
          AND o.status = 'completed'
        """

        if start_date is None:
            start_date = datetime.now() - timedelta(days=90)
        if end_date is None:
            end_date = datetime.now()

        logger.info(f"Extracting order targets from {start_date} to {end_date}")

        with self.engine.connect() as conn:
            df = pd.read_sql(
                text(query),
                conn,
                params={'start_date': start_date, 'end_date': end_date}
            )

        logger.info(f"Extracted {len(df)} order targets")
        return df

    def extract_demand_features(
        self,
        sku_id: Optional[str] = None,
        days_back: int = 90
    ) -> pd.DataFrame:
        """
        Extract features for demand forecasting

        Returns DataFrame with daily demand features per SKU
        """
        query = """
        WITH daily_demand AS (
            SELECT
                DATE_TRUNC('day', o.created_at) as demand_date,
                oi.sku_id,
                COUNT(DISTINCT o.id) as order_count,
                SUM(oi.quantity) as total_quantity,
                COUNT(DISTINCT CASE WHEN o.status = 'completed' THEN o.id END) as completed_orders
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            WHERE o.created_at >= NOW() - INTERVAL ':days_back days'
              AND (:sku_id IS NULL OR oi.sku_id = :sku_id)
            GROUP BY DATE_TRUNC('day', o.created_at), oi.sku_id
        ),
        lag_features AS (
            SELECT
                demand_date,
                sku_id,
                order_count,
                total_quantity,
                completed_orders,
                LAG(order_count, 1) OVER (PARTITION BY sku_id ORDER BY demand_date) as order_count_lag1,
                LAG(order_count, 7) OVER (PARTITION BY sku_id ORDER BY demand_date) as order_count_lag7,
                LAG(total_quantity, 1) OVER (PARTITION BY sku_id ORDER BY demand_date) as quantity_lag1,
                LAG(total_quantity, 7) OVER (PARTITION BY sku_id ORDER BY demand_date) as quantity_lag7,
                AVG(order_count) OVER (
                    PARTITION BY sku_id
                    ORDER BY demand_date
                    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
                ) as order_count_ma7,
                AVG(total_quantity) OVER (
                    PARTITION BY sku_id
                    ORDER BY demand_date
                    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
                ) as quantity_ma7
            FROM daily_demand
        ),
        sku_stats AS (
            SELECT
                sku_id,
                AVG(order_count) as avg_daily_orders,
                STDDEV(order_count) as std_daily_orders,
                AVG(total_quantity) as avg_daily_quantity,
                STDDEV(total_quantity) as std_daily_quantity
            FROM daily_demand
            GROUP BY sku_id
        )
        SELECT
            lf.demand_date,
            lf.sku_id,
            EXTRACT(DOW FROM lf.demand_date) as day_of_week,
            EXTRACT(DAY FROM lf.demand_date) as day_of_month,
            EXTRACT(MONTH FROM lf.demand_date) as month,
            lf.order_count,
            lf.total_quantity,
            lf.completed_orders,
            lf.order_count_lag1,
            lf.order_count_lag7,
            lf.quantity_lag1,
            lf.quantity_lag7,
            lf.order_count_ma7,
            lf.quantity_ma7,
            ss.avg_daily_orders,
            ss.std_daily_orders,
            ss.avg_daily_quantity,
            ss.std_daily_quantity
        FROM lag_features lf
        LEFT JOIN sku_stats ss ON lf.sku_id = ss.sku_id
        ORDER BY lf.demand_date, lf.sku_id
        """

        logger.info(f"Extracting demand features for {days_back} days")

        with self.engine.connect() as conn:
            df = pd.read_sql(
                text(query),
                conn,
                params={'sku_id': sku_id, 'days_back': days_back}
            )

        logger.info(f"Extracted {len(df)} demand features")
        return df

    def extract_picker_performance_features(
        self,
        days_back: int = 30
    ) -> pd.DataFrame:
        """
        Extract features for picker performance prediction

        Returns DataFrame with picker performance features
        """
        query = """
        WITH picker_stats AS (
            SELECT
                pt.picker_id,
                DATE_TRUNC('day', pt.created_at) as work_date,
                COUNT(DISTINCT pt.order_id) as orders_picked,
                SUM(pt.items_picked) as items_picked,
                EXTRACT(EPOCH FROM (MAX(pt.completed_at) - MIN(pt.created_at))) / 3600.0 as hours_worked,
                COUNT(DISTINCT pt.id) FILTER (WHERE pt.status = 'completed') as completed_tasks,
                COUNT(DISTINCT pt.id) FILTER (WHERE pt.status = 'cancelled') as cancelled_tasks
            FROM pick_tasks pt
            WHERE pt.created_at >= NOW() - INTERVAL ':days_back days'
            GROUP BY pt.picker_id, DATE_TRUNC('day', pt.created_at)
        ),
        picker_lag_features AS (
            SELECT
                picker_id,
                work_date,
                orders_picked,
                items_picked,
                hours_worked,
                completed_tasks,
                cancelled_tasks,
                LAG(orders_picked, 1) OVER (PARTITION BY picker_id ORDER BY work_date) as orders_lag1,
                LAG(items_picked, 1) OVER (PARTITION BY picker_id ORDER BY work_date) as items_lag1,
                AVG(orders_picked) OVER (
                    PARTITION BY picker_id
                    ORDER BY work_date
                    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
                ) as orders_ma7,
                AVG(items_picked) OVER (
                    PARTITION BY picker_id
                    ORDER BY work_date
                    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
                ) as items_ma7
            FROM picker_stats
        ),
        picker_experience AS (
            SELECT
                picker_id,
                DATEDIFF('day', MIN(created_at), CURRENT_DATE) as experience_days,
                COUNT(DISTINCT id) as total_tasks_completed
            FROM pick_tasks
            WHERE status = 'completed'
            GROUP BY picker_id
        )
        SELECT
            ps.picker_id,
            ps.work_date,
            EXTRACT(DOW FROM ps.work_date) as day_of_week,
            EXTRACT(HOUR FROM ps.work_date) as hour_of_day,
            ps.orders_picked,
            ps.items_picked,
            ps.hours_worked,
            CASE WHEN ps.hours_worked > 0 THEN ps.orders_picked / ps.hours_worked ELSE 0 END as orders_per_hour,
            CASE WHEN ps.hours_worked > 0 THEN ps.items_picked / ps.hours_worked ELSE 0 END as items_per_hour,
            CASE WHEN ps.completed_tasks > 0
                THEN CAST(ps.cancelled_tasks AS FLOAT) / NULLIF(ps.completed_tasks, 0)
                ELSE 0
            END as cancellation_rate,
            ps.orders_lag1,
            ps.items_lag1,
            ps.orders_ma7,
            ps.items_ma7,
            pe.experience_days,
            pe.total_tasks_completed
        FROM picker_lag_features ps
        LEFT JOIN picker_experience pe ON ps.picker_id = pe.picker_id
        ORDER BY ps.work_date, ps.picker_id
        """

        logger.info(f"Extracting picker performance features for {days_back} days")

        with self.engine.connect() as conn:
            df = pd.read_sql(text(query), conn)

        logger.info(f"Extracted {len(df)} picker performance features")
        return df

    def save_features(
        self,
        df: pd.DataFrame,
        table_name: str,
        if_exists: str = 'append'
    ) -> None:
        """
        Save extracted features to the feature store tables
        """
        logger.info(f"Saving {len(df)} features to {table_name}")

        df.to_sql(
            table_name,
            self.engine,
            if_exists=if_exists,
            index=False,
            method='multi',
            chunksize=1000
        )

        logger.info(f"Successfully saved features to {table_name}")

    def extract_and_save_all(
        self,
        days_back: int = 90
    ) -> Dict[str, pd.DataFrame]:
        """
        Extract all feature types and save them

        Returns dictionary of DataFrames
        """
        start_date = datetime.now() - timedelta(days=days_back)
        end_date = datetime.now()

        results = {}

        # Extract order features
        logger.info("=" * 80)
        logger.info("EXTRACTING ORDER FEATURES")
        logger.info("=" * 80)
        results['order_features'] = self.extract_order_features(start_date, end_date)

        # Extract order targets
        logger.info("=" * 80)
        logger.info("EXTRACTING ORDER TARGETS")
        logger.info("=" * 80)
        results['order_targets'] = self.extract_order_targets(start_date, end_date)

        # Extract demand features
        logger.info("=" * 80)
        logger.info("EXTRACTING DEMAND FEATURES")
        logger.info("=" * 80)
        results['demand_features'] = self.extract_demand_features(days_back=days_back)

        # Extract picker performance features
        logger.info("=" * 80)
        logger.info("EXTRACTING PICKER PERFORMANCE FEATURES")
        logger.info("=" * 80)
        results['picker_features'] = self.extract_picker_performance_features(days_back)

        return results


@click.command()
@click.option('--feature-type', type=click.Choice(['all', 'orders', 'demand', 'pickers']), default='all', help='Type of features to extract')
@click.option('--days-back', type=int, default=90, help='Number of days to look back')
@click.option('--output-dir', type=str, default='data/features', help='Output directory for features')
@click.option('--save-to-db', is_flag=True, help='Save features to database feature store')
def main(feature_type: str, days_back: int, output_dir: str, save_to_db: bool):
    """Extract features from the database"""
    from config import settings

    extractor = FeatureExtractor(settings.database_url)

    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

    if feature_type in ['all', 'orders']:
        logger.info("Extracting order features...")
        df = extractor.extract_order_features(days_back=days_back)

        output_path = f"{output_dir}/order_features_{timestamp}.parquet"
        df.to_parquet(output_path)
        logger.info(f"Saved to {output_path}")

        if save_to_db:
            extractor.save_features(df, 'ml_feature_values_order')

    if feature_type in ['all', 'demand']:
        logger.info("Extracting demand features...")
        df = extractor.extract_demand_features(days_back=days_back)

        output_path = f"{output_dir}/demand_features_{timestamp}.parquet"
        df.to_parquet(output_path)
        logger.info(f"Saved to {output_path}")

        if save_to_db:
            extractor.save_features(df, 'ml_feature_values_demand')

    if feature_type in ['all', 'pickers']:
        logger.info("Extracting picker features...")
        df = extractor.extract_picker_performance_features(days_back=days_back)

        output_path = f"{output_dir}/picker_features_{timestamp}.parquet"
        df.to_parquet(output_path)
        logger.info(f"Saved to {output_path}")

        if save_to_db:
            extractor.save_features(df, 'ml_feature_values_picker')

    logger.info("Feature extraction complete!")


if __name__ == '__main__':
    main()
