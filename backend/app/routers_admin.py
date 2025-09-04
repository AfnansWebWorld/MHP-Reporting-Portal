from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract, cast, Date
from typing import Optional, List
from datetime import datetime, date, timedelta
from . import models, schemas
from .auth import require_admin
from .database import get_db

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/users", response_model=list[schemas.UserOut])
def list_users(db: Session = Depends(get_db), admin=Depends(require_admin)):
    return db.query(models.User).all()

@router.get("/users/list")
def get_users_list(db: Session = Depends(get_db), admin=Depends(require_admin)):
    """Get a simplified list of users for dropdown menus"""
    users = db.query(models.User.id, models.User.full_name).order_by(models.User.full_name).all()
    return [{"id": user.id, "name": user.full_name} for user in users]

@router.get("/users/{user_id}/reports", response_model=list[schemas.ReportOut])
def list_user_reports(user_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    return (
        db.query(models.Report)
        .filter(models.Report.user_id == user_id)
        .order_by(models.Report.created_at.desc())
        .all()
    )

@router.get("/stats")
def stats(db: Session = Depends(get_db), admin=Depends(require_admin)):
    data = db.query(models.User).all()
    
    # Get active clients count for each user
    user_client_counts = {}
    for user in data:
        client_count = db.query(models.Client).filter(
            models.Client.user_id == user.id
        ).count()
        user_client_counts[user.id] = client_count
    
    return {
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "count": u.submissions_count if hasattr(u, 'submissions_count') else len(u.reports),
                "active_clients_count": user_client_counts.get(u.id, 0)
            } for u in data
        ]
    }

@router.get("/reports", response_model=list[schemas.ReportOut])
def list_all_reports(db: Session = Depends(get_db), admin=Depends(require_admin)):
    """Get all reports for admin interface"""
    return (
        db.query(models.Report)
        .order_by(models.Report.created_at.desc())
        .all()
    )

@router.get("/monthly-report")
def get_monthly_report(
    start_date: Optional[str] = Query(None, description="Start date in YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="End date in YYYY-MM-DD format"),
    user_id: Optional[int] = Query(None, description="Filter by specific user ID"),
    db: Session = Depends(get_db), 
    admin=Depends(require_admin)
):
    """Get monthly report data for admin dashboard"""
    print(f"Monthly report request - start_date: {start_date}, end_date: {end_date}, user_id: {user_id} (type: {type(user_id)})")
    # Default to current month if no dates provided
    if not start_date:
        today = date.today()
        start_date = date(today.year, today.month, 1)
    else:
        start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
    
    if not end_date:
        # End of current month
        next_month = date(start_date.year + (start_date.month // 12), 
                         ((start_date.month % 12) + 1) or 12, 1)
        end_date = next_month - timedelta(days=1)
    else:
        end_date = datetime.strptime(end_date, "%Y-%m-%d").date()
    
    # Query daily visit counts - aggregate by date when filtering by user
    if user_id is not None:
        # When filtering by specific user, aggregate by date only
        visit_query = db.query(
            cast(models.Visit.visit_date, Date).label('date'),
            func.count(models.Visit.id).label('count')
        )
    else:
        # When showing all users, include username information for export
        visit_query = db.query(
            cast(models.Visit.visit_date, Date).label('date'),
            func.count(models.Visit.id).label('count'),
            models.User.full_name.label('username'),
            models.User.id.label('user_id')
        ).join(
            models.User, models.Visit.user_id == models.User.id
        )
    
    # Apply filters
    filters = [
        models.Visit.visit_date >= start_date,
        models.Visit.visit_date <= end_date,
        models.Visit.is_deleted == False
    ]
    
    # Add user filter if specified
    if user_id is not None:
        filters.append(models.Visit.user_id == user_id)
    
    if user_id is not None:
        daily_visits = visit_query.filter(
            and_(*filters)
        ).group_by(cast(models.Visit.visit_date, Date)).all()
    else:
        daily_visits = visit_query.filter(
            and_(*filters)
        ).group_by(cast(models.Visit.visit_date, Date), models.User.id, models.User.full_name).all()
    
    # Calculate daily recovery (payment amounts from both active reports and submitted PDFs)
    daily_recovery = []
    
    # Get recovery from active reports
    recovery_query = (
        db.query(
            models.Report.created_at,
            models.Report.payment_amount
        )
        .filter(
            models.Report.user_id == user_id if user_id else True,
            models.Report.payment_received == True,
            models.Report.created_at >= start_date,
            models.Report.created_at < end_date
        )
        .all()
    )
    
    # Get recovery from submitted PDF reports
    pdf_recovery_query = (
        db.query(
            models.PDFReport.created_at,
            models.PDFReport.total_payment_amount
        )
        .filter(
            models.PDFReport.user_id == user_id if user_id else True,
            models.PDFReport.created_at >= start_date,
            models.PDFReport.created_at < end_date,
            models.PDFReport.total_payment_amount > 0
        )
        .all()
    )
    
    # Group recovery by date from both sources
    recovery_by_date = {}
    
    # Add active reports recovery
    for created_at, amount in recovery_query:
        date_key = created_at.date()
        if date_key not in recovery_by_date:
            recovery_by_date[date_key] = 0
        recovery_by_date[date_key] += amount
    
    # Add PDF reports recovery
    for created_at, amount in pdf_recovery_query:
        date_key = created_at.date()
        if date_key not in recovery_by_date:
            recovery_by_date[date_key] = 0
        recovery_by_date[date_key] += amount
    
    # Convert to list format with day names
    for date_obj, amount in recovery_by_date.items():
        daily_recovery.append({
            "date": date_obj.strftime("%Y-%m-%d"),
            "day": date_obj.strftime("%A"),
            "amount": amount
        })
    
    # Sort by date
    daily_recovery.sort(key=lambda x: x["date"])
    
    # Format the results
    visit_data = [
        {
            "date": visit.date.strftime("%Y-%m-%d"),
            "day": visit.date.strftime("%A"),
            "count": visit.count
        } for visit in daily_visits
    ]
    
    recovery_data = daily_recovery
    
    # Calculate monthly totals
    total_visits = sum(item["count"] for item in visit_data) if visit_data else 0
    total_recovery = sum(item["amount"] for item in recovery_data) if recovery_data else 0
    
    return {
        "daily_visits": visit_data,
        "daily_recovery": recovery_data,
        "monthly_totals": {
            "total_visits": total_visits,
            "total_recovery": total_recovery
        },
        "date_range": {
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d")
        }
    }

@router.get("/monthly-report/export")
def export_monthly_report(
    start_date: Optional[str] = Query(None, description="Start date in YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="End date in YYYY-MM-DD format"),
    user_id: Optional[int] = Query(None, description="Filter by specific user ID"),
    format: str = Query("csv", description="Export format: csv or pdf"),
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    """Export monthly report data as CSV or PDF"""
    from fastapi.responses import StreamingResponse, JSONResponse
    import io
    import csv
    import traceback
    from datetime import datetime
    
    try:
        # Get report data using the existing endpoint logic
        report_data = get_monthly_report(start_date, end_date, user_id, db, admin)
        
        # Validate that we have data to export
        if not report_data['daily_visits'] and not report_data['daily_recovery']:
            return JSONResponse(
                status_code=404,
                content={"detail": "No data available for the selected date range. Please select a different period."}
            )
        
        # Format timestamp for filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        period = f"{report_data['date_range']['start_date']}_to_{report_data['date_range']['end_date']}"
        
        if format.lower() == "csv":
            # Create CSV file in memory
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Write headers with metadata
            writer.writerow(["Monthly Activity Report"])
            writer.writerow(["Report Period", f"{report_data['date_range']['start_date']} to {report_data['date_range']['end_date']}"])
            writer.writerow(["Generated On", datetime.now().strftime("%Y-%m-%d %H:%M:%S")])
            writer.writerow([])
            
            # Write monthly totals
            writer.writerow(["Monthly Totals"])
            writer.writerow(["Total Visits", report_data['monthly_totals']['total_visits']])
            writer.writerow(["Total Recovery Amount", f"Rs. {report_data['monthly_totals']['total_recovery']:.2f}"])
            writer.writerow([])
            
            # Write daily visits with username
            writer.writerow(["Daily Visits"])
            writer.writerow(["Date", "Day", "Username", "Visit Count"])
            for visit in report_data['daily_visits']:
                writer.writerow([visit['date'], visit['day'], visit['username'], visit['count']])
            writer.writerow([])
            
            # Write daily recovery with username
            writer.writerow(["Daily Recovery Amounts"])
            writer.writerow(["Date", "Day", "Username", "Amount"])
            for recovery in report_data['daily_recovery']:
                writer.writerow([recovery['date'], recovery['day'], recovery['username'], f"Rs. {recovery['amount']:.2f}"])
            
            # Prepare the response
            output.seek(0)
            filename = f"monthly_report_{period}_{timestamp}.csv"
            
            return StreamingResponse(
                io.StringIO(output.getvalue()),
                media_type="text/csv",
                headers={
                    "Content-Disposition": f"attachment; filename={filename}",
                    "Content-Type": "text/csv; charset=utf-8",
                    "Cache-Control": "no-cache"
                }
            )
        
        elif format.lower() == "pdf":
            try:
                # Import here to handle potential import errors gracefully
                from fpdf import FPDF
                
                pdf = FPDF()
                pdf.add_page()
                
                # Set font
                pdf.set_font("Arial", size=12)
                
                # Title
                pdf.cell(200, 10, txt="Monthly Activity Report", ln=True, align="C")
                pdf.cell(200, 10, txt=f"Period: {report_data['date_range']['start_date']} to {report_data['date_range']['end_date']}", ln=True, align="C")
                pdf.cell(200, 10, txt=f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", ln=True, align="C")
                pdf.ln(10)
                
                # Monthly totals section
                pdf.set_font("Arial", "B", 14)
                pdf.cell(200, 10, txt="Monthly Totals", ln=True)
                pdf.set_font("Arial", size=12)
                pdf.cell(100, 10, txt=f"Total Visits: {report_data['monthly_totals']['total_visits']}", ln=True)
                pdf.cell(100, 10, txt=f"Total Recovery Amount: Rs. {report_data['monthly_totals']['total_recovery']:.2f}", ln=True)
                pdf.ln(10)
                
                # Daily visits section with improved table formatting
                pdf.set_font("Arial", "B", 14)
                pdf.cell(200, 10, txt="Daily Visits", ln=True)
                pdf.set_font("Arial", "B", 12)
                
                # Table header with background color - improved alignment with username column
                pdf.set_fill_color(230, 230, 230)
                pdf.cell(40, 10, txt="Date", border=1, fill=True)
                pdf.cell(40, 10, txt="Day", border=1, fill=True)
                pdf.cell(70, 10, txt="Username", border=1, fill=True)
                pdf.cell(40, 10, txt="Visit Count", border=1, fill=True, ln=True)
                
                # Table data with alternating row colors
                pdf.set_font("Arial", size=12)
                for i, visit in enumerate(report_data['daily_visits']):
                    fill = i % 2 == 0
                    if fill:
                        pdf.set_fill_color(245, 245, 245)
                    pdf.cell(40, 10, txt=visit['date'], border=1, fill=fill)
                    pdf.cell(40, 10, txt=visit['day'], border=1, fill=fill)
                    pdf.cell(70, 10, txt=visit['username'], border=1, fill=fill)
                    pdf.cell(40, 10, txt=str(visit['count']), border=1, fill=fill, ln=True)
                
                pdf.ln(10)
                
                # Daily recovery section with improved table formatting
                pdf.set_font("Arial", "B", 14)
                pdf.cell(200, 10, txt="Daily Recovery Amounts", ln=True)
                pdf.set_font("Arial", "B", 12)
                
                # Table header with background color - improved alignment with username column
                pdf.set_fill_color(230, 230, 230)
                pdf.cell(40, 10, txt="Date", border=1, fill=True)
                pdf.cell(40, 10, txt="Day", border=1, fill=True)
                pdf.cell(70, 10, txt="Username", border=1, fill=True)
                pdf.cell(40, 10, txt="Amount", border=1, fill=True, ln=True)
                
                # Table data with alternating row colors
                pdf.set_font("Arial", size=12)
                for i, recovery in enumerate(report_data['daily_recovery']):
                    fill = i % 2 == 0
                    if fill:
                        pdf.set_fill_color(245, 245, 245)
                    pdf.cell(40, 10, txt=recovery['date'], border=1, fill=fill)
                    pdf.cell(40, 10, txt=recovery['day'], border=1, fill=fill)
                    pdf.cell(70, 10, txt=recovery['username'], border=1, fill=fill)
                    pdf.cell(40, 10, txt=f"Rs. {recovery['amount']:.2f}", border=1, fill=fill, ln=True)
                
                # Add footer with page number
                pdf.ln(10)
                pdf.set_font("Arial", "I", 8)
                pdf.cell(0, 10, f"Generated by MHP Reporting Portal - Page 1/{pdf.page_no()}", 0, 0, "C")
                
                # Output PDF
                filename = f"monthly_report_{period}_{timestamp}.pdf"
                
                # Get PDF as string
                pdf_content = pdf.output(dest='S').encode('latin1')
                
                return StreamingResponse(
                    io.BytesIO(pdf_content),
                    media_type="application/pdf",
                    headers={
                        "Content-Disposition": f"attachment; filename={filename}",
                        "Content-Type": "application/pdf",
                        "Cache-Control": "no-cache"
                    }
                )
            except ImportError:
                return JSONResponse(
                    status_code=500,
                    content={"detail": "PDF generation library not available. Please contact system administrator."}
                )
            except Exception as e:
                return JSONResponse(
                    status_code=500,
                    content={"detail": f"Error generating PDF: {str(e)}"}
                )
        
        else:
            return JSONResponse(
                status_code=400, 
                content={"detail": f"Unsupported format: {format}. Use 'csv' or 'pdf'."}
            )
            
    except Exception as e:
        # Log the full exception for debugging
        traceback_str = traceback.format_exc()
        print(f"Export error: {str(e)}\n{traceback_str}")
        
        # Return user-friendly error message
        return JSONResponse(
            status_code=500,
            content={"detail": "An error occurred while generating the export. Please try again or contact support."}
        )