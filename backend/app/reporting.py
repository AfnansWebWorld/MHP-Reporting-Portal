from io import BytesIO
from typing import List
from datetime import datetime
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

    # Add current date with day
    current_date = datetime.now()
    date_str = current_date.strftime("%A, %B %d, %Y")
    
    c.setFont("Helvetica-Bold", 16)
    c.drawString(1 * inch, height - 0.7 * inch, f"MHP Reporting - {user.full_name or user.email}")
    
    c.setFont("Helvetica", 12)
    c.drawString(1 * inch, height - 1 * inch, f"Date: {date_str}")

    c.setFont("Helvetica-Bold", 10)
    y = height - 1.5 * inch

    headers = ["S.no", "Client", "Phone", "Address", "Shift", "Payment", "P/S", "Order", "Giveaway"]
    col_x = [0.3*inch, 0.8*inch, 2.2*inch, 3.1*inch, 4.9*inch, 5.5*inch, 6.5*inch, 7.0*inch, 7.5*inch]
    col_widths = [0.5*inch, 1.4*inch, 0.9*inch, 2.1*inch, 0.6*inch, 1.0*inch, 0.5*inch, 0.5*inch, 1.2*inch]

    # Draw header background and text (bold)
    header_y = y
    c.setFont("Helvetica-Bold", 10)
    for i, h in enumerate(headers):
        if i == 8:  # Giveaway column
            c.drawString(col_x[i] + 0.08 * inch + 0.05*inch, y, h)
        else:
            c.drawString(col_x[i] + 0.08 * inch, y, h)
    
    # Reset font to regular for data rows
    c.setFont("Helvetica", 10)
    
    # Draw header borders
    y -= 0.2 * inch
    c.line(0.3*inch, y, 8.7*inch, y)  # Bottom line of header
    c.line(0.3*inch, header_y + 0.15*inch, 8.7*inch, header_y + 0.15*inch)  # Top line of header
    
    # Draw vertical lines for header
    c.line(0.25*inch, header_y + 0.15*inch, 0.25*inch, y)  # Left border of table
    for i in range(1, len(col_x)):
        c.line(col_x[i] + 0.05*inch, header_y + 0.15*inch, col_x[i] + 0.05*inch, y)
    # Right border
    c.line(8.7*inch, header_y + 0.15*inch, 8.7*inch, y)
    
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
        shift_text = r.shift_timing[:8]
        
        # Handle multi-line client names - display full name
        client_lines = []
        max_chars_per_line = 18  # Adjust for column width
        
        if len(client_name) > max_chars_per_line:
            words = client_name.split()
            current_line = ""
            lines = []
            
            for word in words:
                test_line = current_line + (" " if current_line else "") + word
                if len(test_line) <= max_chars_per_line:
                    current_line = test_line
                else:
                    if current_line:
                        lines.append(current_line)
                    current_line = word
            
            if current_line:
                lines.append(current_line)
            
            client_lines = lines
        else:
            client_lines = [client_name]
        
        # Handle multi-line addresses with custom formatting
        address_lines = []
        address_full = r.client.address or ""
        
        # Custom address formatting for specific pattern
        if "LS-35 ST-10/A, Federal B Area Block 16 Gulberg Town, Karachi, 75950" in address_full:
            address_lines = [
                "LS-35 ST-10/A, Federal",
                "B Area Block 16 Gulberg", 
                "Town, Karachi, 75950"
            ]
        elif len(address_full) > 25:  # For other long addresses, use smart wrapping
            words = address_full.split()
            current_line = ""
            lines = []
            max_chars_per_line = 25
            
            for word in words:
                test_line = current_line + (" " if current_line else "") + word
                if len(test_line) <= max_chars_per_line:
                    current_line = test_line
                else:
                    if current_line:
                        lines.append(current_line)
                    current_line = word
            
            if current_line:
                lines.append(current_line)
            
            address_lines = lines[:3]
        else:
            address_lines = [address_full]
        
        # Handle multi-line giveaway information - display full text
        giveaway_lines = []
        if r.giveaway_usages:
            giveaway_usage = r.giveaway_usages[0]  # Get first giveaway usage
            giveaway_name = giveaway_usage.giveaway_assignment.giveaway.name
            quantity = giveaway_usage.quantity_used
            giveaway_text = f"{giveaway_name} ({quantity})"
            
            # Split giveaway text into multiple lines if needed
            max_chars_giveaway = 18  # Adjust for wider column width
            if len(giveaway_text) > max_chars_giveaway:
                words = giveaway_text.split()
                current_line = ""
                lines = []
                
                for word in words:
                    test_line = current_line + (" " if current_line else "") + word
                    if len(test_line) <= max_chars_giveaway:
                        current_line = test_line
                    else:
                        if current_line:
                            lines.append(current_line)
                        current_line = word
                
                if current_line:
                    lines.append(current_line)
                
                giveaway_lines = lines
            else:
                giveaway_lines = [giveaway_text]
        
        # Calculate row height based on maximum lines needed (client name, address, or giveaway)
        max_lines = max(len(client_lines), len(address_lines), len(giveaway_lines))
        # Increase base height and ensure minimum height for multi-line content
        row_height = max(0.25 * inch, 0.22 * inch * max_lines)
        
        # Add minimal left padding for text positioning
        text_padding = 0.08 * inch
        
        # Draw serial number
        c.drawString(col_x[0] + text_padding, y, serial_no)
        
        # Draw client name (potentially multi-line)
        for i, line in enumerate(client_lines):
            c.drawString(col_x[1] + text_padding, y - (i * 0.15 * inch), line)
        
        # Draw address (potentially multi-line)
        for i, line in enumerate(address_lines):
            c.drawString(col_x[3] + text_padding, y - (i * 0.15 * inch), line)
        
        # Draw other fields at the top line position
        c.drawString(col_x[2] + text_padding, y, phone_text)
        c.drawString(col_x[4] + text_padding, y, shift_text)
        
        # Format payment with comma separators
        payment_text = format_currency(r.payment_amount) if r.payment_received and r.payment_amount > 0 else "Rs. 0.00"
        c.drawString(col_x[5] + text_padding, y, payment_text)
        
        c.drawString(col_x[6] + text_padding, y, "Yes" if r.physician_sample else "No")
        c.drawString(col_x[7] + text_padding, y, "Yes" if r.order_received else "No")
        
        # Draw giveaway text (potentially multi-line)
        for i, line in enumerate(giveaway_lines):
            c.drawString(col_x[8] + text_padding + 0.05*inch, y - (i * 0.15 * inch), line)
        
        # Draw cell borders for this row
        row_top = y + 0.15*inch
        row_bottom = y - max(row_height, 0.25 * inch) + 0.15*inch
        
        # Draw horizontal lines (top and bottom of row)
        c.line(0.3*inch, row_bottom, 8.7*inch, row_bottom)
        
        # Draw vertical lines for each column (left border of each column)
        c.line(0.25*inch, row_top, 0.25*inch, row_bottom)  # Left border of table
        for i in range(1, len(col_x)):
            c.line(col_x[i] + 0.05*inch, row_top, col_x[i] + 0.05*inch, row_bottom)
        # Right border
        c.line(8.7*inch, row_top, 8.7*inch, row_bottom)
        
        y -= max(row_height, 0.25 * inch)

    c.showPage()
    c.save()
    pdf = buffer.getvalue()
    buffer.close()
    return pdf