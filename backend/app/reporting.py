from io import BytesIO
from typing import List
from datetime import datetime, date
import os
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from . import models


def format_currency(amount: float) -> str:
    """Format currency with comma separators"""
    if amount == int(amount):
        return f"Rs. {int(amount):,}"
    else:
        return f"Rs. {amount:,.2f}"


def generate_outstation_expense_pdf(user: models.User, expenses: List[models.OutStationExpense]) -> bytes:
    """Generate a PDF report for Out Station Expenses"""
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    # Add logo at the top
    logo_path = os.path.join(os.path.dirname(__file__), "static", "logo2.png")
    print(f"Reports PDF Logo path: {logo_path}")
    print(f"Logo exists: {os.path.exists(logo_path)}")
    if os.path.exists(logo_path):
        # Position the logo at the top right
        logo_width = 1.5 * inch
        logo_height = 0.75 * inch
        try:
            c.drawImage(logo_path, width - logo_width - 0.5*inch, height - logo_height - 0.5*inch, width=logo_width, height=logo_height, preserveAspectRatio=True)
            print("Logo added successfully")
        except Exception as e:
            print(f"Error adding logo: {e}")

    # Add title and date
    c.setFont("Helvetica-Bold", 16)
    c.drawString(1 * inch, height - 0.7 * inch, f"Out Station Expenses - {user.full_name or user.email}")
    
    # Add designation if available
    if user.designation:
        c.setFont("Helvetica", 12)
        c.drawString(1 * inch, height - 1.0 * inch, f"Designation: {user.designation}")
        # Move date down when designation is present
        c.drawString(1 * inch, height - 1.3 * inch, f"Date: {datetime.now().strftime('%Y-%m-%d')}")
        
        # Add month if expenses exist with improved styling
        if expenses and len(expenses) > 0:
            c.drawString(1 * inch, height - 1.6 * inch, f"Month: {expenses[0].month}")
    else:
        # Keep date in original position when no designation
        c.setFont("Helvetica", 12)
        c.drawString(1 * inch, height - 1.0 * inch, f"Date: {datetime.now().strftime('%Y-%m-%d')}")
        
        # Add month if expenses exist with improved styling
        if expenses and len(expenses) > 0:
            c.drawString(1 * inch, height - 1.3 * inch, f"Month: {expenses[0].month}")

    # Add a decorative line under the header
    c.setStrokeColorRGB(0.8, 0.8, 0.8)
    c.setLineWidth(1)
    if user.designation:
        c.line(1 * inch, height - 1.8 * inch, 7.5 * inch, height - 1.8 * inch)  # Lower position when designation exists
    else:
        c.line(1 * inch, height - 1.5 * inch, 7.5 * inch, height - 1.5 * inch)  # Original position
    c.setStrokeColorRGB(0, 0, 0)  # Reset to black
    c.setLineWidth(0.5)  # Reset line width
    
    c.setFont("Helvetica-Bold", 10)
    y = height - 1.8 * inch

    headers = ["Day", "Station", "Travelling", "KM Travelled", "CSR Verified", "Summary"]
    col_x = [0.25*inch, 0.75*inch, 2.0*inch, 3.2*inch, 4.4*inch, 5.6*inch]
    col_widths = [0.5*inch, 1.25*inch, 1.2*inch, 1.2*inch, 1.2*inch, 2.6*inch]

    # Draw header background and text (bold)
    header_y = y
    c.setFont("Helvetica-Bold", 10)
    for i, h in enumerate(headers):
        c.drawString(col_x[i] + 0.08 * inch, y, h)
    
    # Reset font to regular for data rows
    c.setFont("Helvetica", 10)
    
    # Draw header borders with improved styling
    y -= 0.2 * inch
    c.setLineWidth(0.8)  # Thicker line for header bottom
    c.line(0.25*inch, y, 8.2*inch, y)  # Bottom line of header
    c.line(0.25*inch, header_y + 0.15*inch, 8.2*inch, header_y + 0.15*inch)  # Top line of header
    c.setLineWidth(0.5)  # Reset line width
    
    # Draw vertical lines for header borders - proper table structure
    c.line(0.25*inch, header_y + 0.15*inch, 0.25*inch, y)  # Left border
    for i in range(1, len(col_x)):
        c.line(col_x[i], header_y + 0.15*inch, col_x[i], y)  # Column separators
    c.line(8.2*inch, header_y + 0.15*inch, 8.2*inch, y)  # Right border
    
    # Store initial position for table continuity
    table_start_y = y
    
    y -= 0.15 * inch

    # Sort expenses by day_of_month
    sorted_expenses = sorted(expenses, key=lambda x: x.day_of_month)

    for idx, expense in enumerate(sorted_expenses):
        # Check if we need a new page
        if y < 1.2*inch:
            # Before starting a new page, draw vertical lines to the bottom of the current page
            bottom_of_page = 1*inch
            c.line(0.25*inch, y + 0.15*inch, 0.25*inch, bottom_of_page)  # Left border
            for i in range(1, len(col_x)):
                c.line(col_x[i], y + 0.15*inch, col_x[i], bottom_of_page)
            c.line(8.2*inch, y + 0.15*inch, 8.2*inch, bottom_of_page)  # Right border
            
            c.showPage()
            y = height - 1*inch
            
            # Add a small page indicator
            c.setFont("Helvetica", 8)
            c.drawString(7.5 * inch, height - 0.5 * inch, f"Page {c.getPageNumber()}")
            
            # Redraw headers on new page with improved styling
            c.setFont("Helvetica-Bold", 10)
            header_y = y
            for i, h in enumerate(headers):
                c.drawString(col_x[i] + 0.08 * inch, y, h)
            
            c.setFont("Helvetica", 10)
            y -= 0.2 * inch
            
            # Draw header borders with improved styling
            c.setLineWidth(0.8)  # Thicker line for header bottom
            c.line(0.25*inch, y, 8.2*inch, y)  # Bottom line of header
            c.line(0.25*inch, header_y + 0.15*inch, 8.2*inch, header_y + 0.15*inch)  # Top line of header
            c.setLineWidth(0.5)  # Reset line width
            
            # Draw vertical lines for header borders - proper table structure
            c.line(0.25*inch, header_y + 0.15*inch, 0.25*inch, y)  # Left border
            for i in range(1, len(col_x)):
                c.line(col_x[i], header_y + 0.15*inch, col_x[i], y)  # Column separators
            c.line(8.2*inch, header_y + 0.15*inch, 8.2*inch, y)  # Right border
            
            # Continue table on new page
            
            y -= 0.15 * inch
        
        # Add minimal left padding for text positioning
        text_padding = 0.08 * inch
        
        # Draw row data with proper alignment
        # Day - center align
        day_text = str(expense.day_of_month)
        day_width = c.stringWidth(day_text, "Helvetica", 10)
        day_x = col_x[0] + ((col_x[1] - col_x[0]) - day_width) / 2
        c.drawString(day_x, y, day_text)
        
        # Station
        c.drawString(col_x[1] + text_padding, y, expense.station.value)
        
        # Travelling
        c.drawString(col_x[2] + text_padding, y, expense.travelling.value)
        
        # KM Travelled - right align
        km_text = str(expense.km_travelled)
        km_width = c.stringWidth(km_text, "Helvetica", 10)
        km_x = col_x[4] - km_width - text_padding
        c.drawString(km_x, y, km_text)
        
        # CSR Verified - center align
        csr_text = expense.csr_verified
        csr_width = c.stringWidth(csr_text, "Helvetica", 10)
        csr_x = col_x[4] + ((col_x[5] - col_x[4]) - csr_width) / 2
        c.drawString(csr_x, y, csr_text)
        
        # Summary of Activity - Handle multi-line text with improved wrapping
        summary_text = expense.summary_of_activity
        max_chars_per_line = 25  # Adjusted for better fit in column width
        
        summary_lines = []
        if len(summary_text) > max_chars_per_line:
            words = summary_text.split()
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
            
            summary_lines = lines
        else:
            summary_lines = [summary_text]
        
        # Calculate row height based on summary lines (similar to generate_reports_pdf)
        max_lines = len(summary_lines)
        row_height = max(0.25 * inch, 0.22 * inch * max_lines)
        
        # Draw summary text (potentially multi-line) with proper alignment
        for i, line in enumerate(summary_lines):
            c.drawString(col_x[5] + text_padding, y - (i * 0.15 * inch), line.strip())
        
        # Draw cell borders for this row with proper alignment
        row_top = y + 0.15*inch
        row_bottom = y - max(row_height, 0.25 * inch) + 0.15*inch
        
        # Draw horizontal lines (bottom of row)
        c.line(0.25*inch, row_bottom, 8.2*inch, row_bottom)
        
        # Draw vertical lines for each column with consistent width
        c.line(0.25*inch, row_top, 0.25*inch, row_bottom)  # Left border
        for i in range(1, len(col_x)):
            c.line(col_x[i], row_top, col_x[i], row_bottom)  # Column separators
        c.line(8.2*inch, row_top, 8.2*inch, row_bottom)  # Right border
        
        # Update y position
        y -= max(row_height, 0.35 * inch)
        
        # Check if we need a new page for the next row
        if y <= 1.2*inch and idx < len(sorted_expenses) - 1:
            # Draw vertical lines to bottom of page for table continuity
            bottom_of_page = 1*inch
            c.line(0.25*inch, y + 0.15*inch, 0.25*inch, bottom_of_page)  # Left border
            for i in range(1, len(col_x)):
                c.line(col_x[i], y + 0.15*inch, col_x[i], bottom_of_page)
            c.line(8.2*inch, y + 0.15*inch, 8.2*inch, bottom_of_page)  # Right border

    # Count occurrences of each station type and travelling type
    station_counts = {}
    travelling_counts = {}
    for expense in expenses:
        # Count station types
        station_type = expense.station.value
        if station_type in station_counts:
            station_counts[station_type] += 1
        else:
            station_counts[station_type] = 1
            
        # Count travelling types
        travelling_type = expense.travelling.value
        if travelling_type in travelling_counts:
            travelling_counts[travelling_type] += 1
        else:
            travelling_counts[travelling_type] = 1
    
    # Add total KM travelled with improved styling
    total_km = sum(expense.km_travelled for expense in expenses)
    y -= 0.5 * inch  # Increased top margin
    
    # Draw a box for the total KM that aligns with the table
    c.setFillColorRGB(0.95, 0.95, 0.95)  # Light gray background
    c.rect(0.25*inch, y - 0.15*inch, 8.0*inch, 0.25*inch, fill=1)
    c.setFillColorRGB(0, 0, 0)  # Reset to black
    
    # Add total KM text with improved styling and right alignment
    c.setFont("Helvetica-Bold", 11)
    total_text = f"Total KM Travelled: {total_km}"
    # Right align the total under the KM Travelled column
    c.drawString(col_x[3] + text_padding, y, total_text)
    
    # Add station and travelling count totals - increased spacing
    y -= 0.8 * inch
    
    # Create a table for the count totals (similar to the main expense table)
    count_data = []
    
    # Create a table with headers in the first row
    table_headers = ["Station Count Totals:", "Travelling Count Totals:"]
    count_data.append(table_headers)
    
    # Prepare data rows
    max_items = max(len(station_counts), len(travelling_counts))
    
    # Add station counts
    station_rows = []
    for station, count in station_counts.items():
        station_rows.append(f"{station}: {count}")
    
    # Add travelling counts
    travelling_rows = []
    for travelling, count in travelling_counts.items():
        travelling_rows.append(f"{travelling}: {count}")
    
    # Ensure both columns have the same number of rows
    while len(station_rows) < max_items:
        station_rows.append("")
    while len(travelling_rows) < max_items:
        travelling_rows.append("")
    
    # Add all rows to the table data
    for i in range(max_items):
        count_data.append([station_rows[i], travelling_rows[i]])
    
    # Set up the table with better styling
    count_table = Table(count_data, colWidths=[4.0*inch, 4.0*inch])
    
    # Enhanced styling for the count totals table
    count_table_style = TableStyle([
        ('BOX', (0, 0), (-1, -1), 1.5, colors.black),  # Thicker outer border
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),  # Grid lines for all cells
        ('BACKGROUND', (0, 0), (0, 0), colors.lightgrey),  # Header background
        ('BACKGROUND', (1, 0), (1, 0), colors.lightgrey),  # Header background
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),  # Bold header
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),  # Center align headers
        ('ALIGN', (0, 1), (-1, -1), 'LEFT'),  # Left align content
        ('FONTSIZE', (0, 0), (-1, 0), 11),  # Larger font for headers
        ('FONTSIZE', (0, 1), (-1, -1), 10),  # Normal font for content
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),  # More header padding
        ('TOPPADDING', (0, 0), (-1, 0), 8),  # More header padding
        ('BOTTOMPADDING', (0, 1), (-1, -1), 4),  # More cell padding
        ('TOPPADDING', (0, 1), (-1, -1), 4),  # More cell padding
        ('LEFTPADDING', (0, 0), (-1, -1), 12),  # More left padding
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),  # Add right padding
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),  # Vertical alignment
    ])
    
    count_table.setStyle(count_table_style)
    
    # Draw the table with better positioning
    count_table.wrapOn(c, 8.5*inch, 11*inch)
    count_table.drawOn(c, 0.25*inch, y - (0.3*inch * max_items) - 0.5*inch)
    
    # Update y position for any content that follows
    y -= (0.25*inch * max_items) - 0.5*inch
    
    # Add footer with date generated
    c.setFont("Helvetica", 8)
    footer_text = f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    c.drawString(0.25*inch, 0.5*inch, footer_text)
    
    # Add page number on last page too
    c.drawString(7.5 * inch, 0.5 * inch, f"Page {c.getPageNumber()}")

    c.showPage()
    c.save()
    pdf_data = buffer.getvalue()
    buffer.close()
    return pdf_data


def generate_reports_pdf(user: models.User, reports: List[models.Report], custom_date: date = None) -> bytes:
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    # Add logo at the top
    logo_path = os.path.join(os.path.dirname(__file__), "static", "logo2.png")
    if os.path.exists(logo_path):
        # Position the logo at the top right
        logo_width = 1.5 * inch
        logo_height = 0.75 * inch
        c.drawImage(logo_path, width - logo_width - 0.5*inch, height - logo_height - 0.5*inch, width=logo_width, height=logo_height, preserveAspectRatio=True)

    # Use custom date if provided, otherwise use current date
    if custom_date:
        report_date = custom_date
    else:
        report_date = datetime.now().date()
    
    # Format the date with day
    date_str = report_date.strftime("%A, %B %d, %Y")
    
    c.setFont("Helvetica-Bold", 16)
    user_name = f"{user.full_name or user.email}"
    c.drawString(1 * inch, height - 0.7 * inch, f"MHP Reporting - {user_name}")
    
    # Add designation on separate line if available
    if user.designation:
        c.setFont("Helvetica", 12)
        c.drawString(1 * inch, height - 1.0 * inch, f"Designation: {user.designation}")
        # Move date down when designation is present
        c.drawString(1 * inch, height - 1.3 * inch, f"Date: {date_str}")
    else:
        # Keep date in original position when no designation
        c.setFont("Helvetica", 12)
        c.drawString(1 * inch, height - 1.0 * inch, f"Date: {date_str}")

    c.setFont("Helvetica-Bold", 10)
    # Adjust y position based on whether designation exists
    if user.designation:
        y = height - 1.8 * inch  # Move down when designation is present
    else:
        y = height - 1.5 * inch  # Keep original position when no designation

    headers = ["S.no", "Client", "Phone", "Address", "Shift", "Payment", "P/S", "Order", "Giveaway"]
    col_x = [0.25*inch, 0.75*inch, 2.0*inch, 3.0*inch, 4.6*inch, 5.2*inch, 6.2*inch, 6.7*inch, 7.2*inch]
    col_widths = [0.5*inch, 1.25*inch, 1.0*inch, 1.6*inch, 0.6*inch, 1.0*inch, 0.5*inch, 0.5*inch, 1.0*inch]

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
    c.line(0.25*inch, y, 8.2*inch, y)  # Bottom line of header
    c.line(0.25*inch, header_y + 0.15*inch, 8.2*inch, header_y + 0.15*inch)  # Top line of header
    
    # Draw vertical lines for header
    c.line(0.25*inch, header_y + 0.15*inch, 0.25*inch, y)  # Left border of table
    for i in range(1, len(col_x)):
        c.line(col_x[i], header_y + 0.15*inch, col_x[i], y)
    # Right border
    c.line(8.2*inch, header_y + 0.15*inch, 8.2*inch, y)
    
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
        row_height = max(0.35 * inch, 0.28 * inch * max_lines)
        
        # Add minimal left padding for text positioning
        text_padding = 0.08 * inch
        
        # Draw serial number
        c.drawString(col_x[0] + text_padding, y, serial_no)
        
        # Draw client name (potentially multi-line)
        for i, line in enumerate(client_lines):
            c.drawString(col_x[1] + text_padding, y - (i * 0.20 * inch), line)
        
        # Draw address (potentially multi-line)
        for i, line in enumerate(address_lines):
            c.drawString(col_x[3] + text_padding, y - (i * 0.20 * inch), line)
        
        # Draw other fields at the top line position
        c.drawString(col_x[2] + text_padding, y, phone_text)
        c.drawString(col_x[4] + text_padding, y, shift_text)
        
        # Format payment with comma separators
        payment_text = format_currency(r.payment_amount) if r.payment_received and r.payment_amount > 0 else "Rs. 0.00"
        c.drawString(col_x[5] + text_padding + 0.05*inch, y, payment_text)
        
        c.drawString(col_x[6] + text_padding, y, "Yes" if r.physician_sample else "No")
        c.drawString(col_x[7] + text_padding + 0.05*inch, y, "Yes" if r.order_received else "No")
        
        # Draw giveaway text (potentially multi-line)
        for i, line in enumerate(giveaway_lines):
            c.drawString(col_x[8] + text_padding + 0.05*inch, y - (i * 0.20 * inch), line)
        
        # Draw cell borders for this row
        row_top = y + 0.15*inch
        row_bottom = y - max(row_height, 0.35 * inch) + 0.15*inch
        
        # Draw horizontal lines (top and bottom of row)
        c.line(0.25*inch, row_bottom, 8.2*inch, row_bottom)
        
        # Draw vertical lines for each column (left border of each column)
        c.line(0.25*inch, row_top, 0.25*inch, row_bottom)  # Left border of table
        for i in range(1, len(col_x)):
            c.line(col_x[i], row_top, col_x[i], row_bottom)
        # Right border
        c.line(8.2*inch, row_top, 8.2*inch, row_bottom)
        
        y -= max(row_height, 0.25 * inch)

    # Calculate and display total payment amount
    total_payment = sum(r.payment_amount for r in reports if r.payment_received and r.payment_amount > 0)
    
    # Count the number of "Yes" values in the Order column
    order_yes_count = sum(1 for r in reports if r.order_received)
    
    # Check if we need space for the total (need at least 1 inch)
    if y < 1.8 * inch:  # Increased space needed for both totals
        c.showPage()
        y = height - 1 * inch
    
    # Add some space before the total
    y -= 0.3 * inch
    
    # Draw a line above the total
    c.line(5.2 * inch, y + 0.1 * inch, 8.2 * inch, y + 0.1 * inch)
    
    # Draw the total payment
    c.setFont("Helvetica-Bold", 12)
    c.drawString(5.2 * inch + 0.08 * inch, y - 0.2 * inch, "Total Payment:")
    c.drawString(6.8 * inch + 0.08 * inch, y - 0.2 * inch, format_currency(total_payment))
    
    # Draw the order count below the total payment
    y -= 0.4 * inch
    c.drawString(5.2 * inch + 0.08 * inch, y - 0.2 * inch, "Total Orders:")
    c.drawString(6.8 * inch + 0.08 * inch, y - 0.2 * inch, str(order_yes_count))
    
    # Draw a line below both totals
    c.line(5.2 * inch, y - 0.4 * inch, 8.2 * inch, y - 0.4 * inch)

    c.showPage()
    c.save()
    pdf = buffer.getvalue()
    buffer.close()
    return pdf