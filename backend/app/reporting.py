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

    headers = ["Date", "Client", "Phone", "Address", "Shift", "Payment"]
    col_x = [1*inch, 2.2*inch, 3.4*inch, 4.6*inch, 6.3*inch, 7.3*inch]

    for i, h in enumerate(headers):
        c.drawString(col_x[i], y, h)
    y -= 0.2 * inch
    c.line(0.8*inch, y, 8*inch, y)
    y -= 0.15 * inch

    for r in reports:
        if y < 1*inch:
            c.showPage()
            y = height - 1*inch
        c.drawString(col_x[0], y, r.created_at.strftime("%Y-%m-%d %H:%M"))
        c.drawString(col_x[1], y, r.client.name)
        c.drawString(col_x[2], y, r.client.phone)
        c.drawString(col_x[3], y, (r.client.address or "")[:35])
        c.drawString(col_x[4], y, r.shift_timing)
        c.drawString(col_x[5], y, "Yes" if r.payment_received else "No")
        y -= 0.18 * inch

    c.showPage()
    c.save()
    pdf = buffer.getvalue()
    buffer.close()
    return pdf