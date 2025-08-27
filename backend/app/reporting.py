from io import BytesIO
from typing import List
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from . import models


def format_currency(amount: float) -> str:
    """Format currency with comma separators"""
    return f"Rs. {amount:,.2f}"


def generate_reports_pdf(user: models.User, reports: List[models.Report]) -> bytes:
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    c.setFont("Helvetica-Bold", 16)
    c.drawString(1 * inch, height - 1 * inch, f"MHP Reporting - {user.full_name or user.email}")

    c.setFont("Helvetica", 10)
    y = height - 1.5 * inch

    headers = ["S.no", "Client", "Phone", "Address", "Shift", "Payment", "P/S", "Order", "Giveaway"]
    col_x = [0.3*inch, 0.8*inch, 2.2*inch, 3.1*inch, 4.2*inch, 4.9*inch, 6.0*inch, 6.5*inch, 7.0*inch]
    col_widths = [0.5*inch, 1.4*inch, 0.9*inch, 1.1*inch, 0.7*inch, 1.1*inch, 0.5*inch, 0.5*inch, 0.8*inch]

    for i, h in enumerate(headers):
        c.drawString(col_x[i], y, h)
    y -= 0.2 * inch
    c.line(0.3*inch, y, 7.8*inch, y)
    y -= 0.15 * inch

    for idx, r in enumerate(reports, 1):
        # Check if we need a new page (accounting for potential multi-line client names)
        if y < 1.2*inch:
            c.showPage()
            y = height - 1*inch
        
        # Prepare text data
        serial_no = str(idx)
        client_name = r.client.name
        phone_text = r.client.phone[:12] if r.client.phone else ""
        address_text = (r.client.address or "")[:18] + "..." if len(r.client.address or "") > 18 else (r.client.address or "")
        shift_text = r.shift_timing[:8]
        
        # Handle multi-line client names
        client_lines = []
        if len(client_name) > 20:  # If name is long, split it
            words = client_name.split()
            line1 = ""
            line2 = ""
            
            for word in words:
                if len(line1 + " " + word) <= 20 and not line2:
                    line1 = (line1 + " " + word).strip()
                else:
                    line2 = (line2 + " " + word).strip()
            
            client_lines = [line1, line2] if line2 else [line1]
        else:
            client_lines = [client_name]
        
        # Calculate row height based on client name lines
        row_height = 0.18 * inch * len(client_lines)
        
        # Draw serial number
        c.drawString(col_x[0], y, serial_no)
        
        # Draw client name (potentially multi-line)
        for i, line in enumerate(client_lines):
            c.drawString(col_x[1], y - (i * 0.12 * inch), line)
        
        # Draw other fields at the top line position
        c.drawString(col_x[2], y, phone_text)
        c.drawString(col_x[3], y, address_text)
        c.drawString(col_x[4], y, shift_text)
        
        # Format payment with comma separators
        payment_text = format_currency(r.payment_amount) if r.payment_received and r.payment_amount > 0 else "Rs. 0.00"
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
        giveaway_display = giveaway_text[:12] + "..." if len(giveaway_text) > 12 else giveaway_text
        c.drawString(col_x[8], y, giveaway_display)
        
        y -= max(row_height, 0.18 * inch)

    c.showPage()
    c.save()
    pdf = buffer.getvalue()
    buffer.close()
    return pdf