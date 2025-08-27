from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_
from . import models
from .database import SessionLocal
import logging

logger = logging.getLogger(__name__)

def reset_daily_visits():
    """Reset daily visit counters - this is handled automatically by date filtering"""
    # Daily visits are automatically "reset" because we filter by current date
    # No actual reset needed as we query by visit_date
    logger.info("Daily visits reset completed (automatic via date filtering)")

def reset_monthly_visits():
    """Reset monthly visit counters - this is handled automatically by month filtering"""
    # Monthly visits are automatically "reset" because we filter by current month
    # No actual reset needed as we query by visit_month
    logger.info("Monthly visits reset completed (automatic via month filtering)")

def cleanup_old_visits(days_to_keep: int = 365):
    """Clean up old visit records (optional maintenance task)"""
    db: Session = SessionLocal()
    try:
        cutoff_date = date.today() - timedelta(days=days_to_keep)
        
        # Soft delete old visits
        old_visits = db.query(models.Visit).filter(
            and_(
                models.Visit.visit_date < cutoff_date,
                models.Visit.is_deleted == False
            )
        ).all()
        
        for visit in old_visits:
            visit.is_deleted = True
            visit.deleted_at = datetime.utcnow()
        
        db.commit()
        logger.info(f"Cleaned up {len(old_visits)} old visit records")
        
    except Exception as e:
        logger.error(f"Error cleaning up old visits: {e}")
        db.rollback()
    finally:
        db.close()

def get_visit_statistics():
    """Get current visit statistics for monitoring"""
    db: Session = SessionLocal()
    try:
        today = date.today()
        current_month = today.strftime("%Y-%m")
        
        daily_count = db.query(models.Visit).filter(
            and_(
                models.Visit.visit_date == today,
                models.Visit.is_deleted == False
            )
        ).count()
        
        monthly_count = db.query(models.Visit).filter(
            and_(
                models.Visit.visit_month == current_month,
                models.Visit.is_deleted == False
            )
        ).count()
        
        total_count = db.query(models.Visit).filter(
            models.Visit.is_deleted == False
        ).count()
        
        return {
            "daily_visits": daily_count,
            "monthly_visits": monthly_count,
            "total_visits": total_count,
            "date": today.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting visit statistics: {e}")
        return None
    finally:
        db.close()

# Note: For production, you would typically use a task scheduler like:
# - Celery with Redis/RabbitMQ
# - APScheduler
# - Cron jobs
# - Cloud-based schedulers (AWS EventBridge, Google Cloud Scheduler, etc.)

# Example with APScheduler (uncomment if needed):
# from apscheduler.schedulers.background import BackgroundScheduler
# import atexit

# scheduler = BackgroundScheduler()
# scheduler.add_job(func=cleanup_old_visits, trigger="cron", hour=2, minute=0)  # Run daily at 2 AM
# scheduler.start()
# atexit.register(lambda: scheduler.shutdown())