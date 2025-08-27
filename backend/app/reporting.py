from io import BytesIO
from typing import List
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from . import models


def generate_reports_pdf(user: models.User, reports: List[models.Report]) -> bytes:
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    c.setFont("Helvetica-Bold", 16)
    c.drawString(1 * inch, height - 1 * inch, f"MHP Reporting - {user.full_name or user.email}")

    c.setFont("Helvetica", 10)
    y = height - 1.5 * inch

    headers = ["Date", "Client", "Phone", "Address", "Shift", "Payment", "P/S", "Order", "Giveaway"]
    col_x = [0.3*inch, 1.5*inch, 2.3*inch, 3.2*inch, 4.3*inch, 5.0*inch, 6.0*inch, 6.5*inch, 7.0*inch]

    for i, h in enumerate(headers):
        c.drawString(col_x[i], y, h)
    y -= 0.2 * inch
    c.line(0.3*inch, y, 7.8*inch, y)
    y -= 0.15 * inch

    for r in reports:
        if y < 1*inch:
            c.showPage()
            y = height - 1*inch
        c.drawString(col_x[0], y, r.created_at.strftime("%Y-%m-%d %H:%M"))
        c.drawString(col_x[1], y, r.client.name)
        c.drawString(col_x[2], y, r.client.phone)
        c.drawString(col_x[3], y, (r.client.address or "")[:25])
        c.drawString(col_x[4], y, r.shift_timing)
        payment_text = f"Rs. {r.payment_amount:.2f}" if r.payment_received and r.payment_amount > 0 else "Rs. 0.00"
        c.drawString(col_x[5], y, payment_text)
        c.drawString(col_x[6], y, "Yes" if r.physician_sample else "No")
        c.drawString(col_x[7], y, "Yes" if r.order_received else "No")
        
        # Add giveaway information
        giveaway_text = ""
        if r.giveaway_usages:
            giveaway_usage = r.giveaway_usages[0]  # Get first giveaway usage
            giveaway_name = giveaway_usage.giveaway_assignment.giveaway.name
            quantity = giveaway_usage.quantity_used
            giveaway_text = f"{giveaway_name} ({quantity})"
        c.drawString(col_x[8], y, giveaway_text[:15])  # Truncate to fit
        
        y -= 0.18 * inch

    c.showPage()
    c.save()
    pdf = buffer.getvalue()
    buffer.close()
    return pdf