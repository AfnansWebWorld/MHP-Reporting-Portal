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


TRAVEL_ALLOWANCE_RATE = 8


def generate_outstation_expense_pdf(user: models.User, expenses: List[models.OutStationExpense]) -> bytes:
    """Generate a PDF report for TADA expenses"""
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

    # Add title with bold and prominent styling
    c.setFont("Helvetica-Bold", 18)  # Increased font size
    c.setFillColorRGB(0, 0, 0.5)  # Dark blue color for title
    title_text = f"TADA EXPENSES"
    c.drawString(1 * inch, height - 0.7 * inch, title_text)
    
    # Add user name with better styling
    c.setFont("Helvetica-Bold", 14)
    c.setFillColorRGB(0, 0, 0)  # Reset to black
    c.drawString(1 * inch, height - 1.0 * inch, f"{user.full_name or user.email}")
    
    # Add designation if available with improved styling
    if user.designation:
        c.setFont("Helvetica-Bold", 12)
        c.drawString(1 * inch, height - 1.3 * inch, f"Designation: {user.designation}")
        
        # Move date to the right side of the page, but avoid logo (which ends at height - 1.25*inch)
        c.setFont("Helvetica", 12)
        date_text = f"Date: {datetime.now().strftime('%Y-%m-%d')}"
        date_width = c.stringWidth(date_text, "Helvetica", 12)
        c.drawString(width - 2.5 * inch - date_width, height - 1.0 * inch, date_text)
        
        # Add month to the right side if expenses exist
        if expenses and len(expenses) > 0:
            month_text = f"Month: {expenses[0].month}"
            month_width = c.stringWidth(month_text, "Helvetica", 12)
            c.drawString(width - 2.5 * inch - month_width, height - 1.3 * inch, month_text)
    else:
        # Keep date on the right side when no designation, but avoid logo
        c.setFont("Helvetica-Bold", 12)
        date_text = f"Date: {datetime.now().strftime('%Y-%m-%d')}"
        date_width = c.stringWidth(date_text, "Helvetica", 12)
        c.drawString(width - 2.5 * inch - date_width, height - 1.0 * inch, date_text)
        
        # Add month to the right side if expenses exist
        if expenses and len(expenses) > 0:
            month_text = f"Month: {expenses[0].month}"
            month_width = c.stringWidth(month_text, "Helvetica", 12)
            c.drawString(width - 2.5 * inch - month_width, height - 1.3 * inch, month_text)

    # Decorative line removed as requested
    
    # Adjust y position based on whether designation exists
    if user.designation:
        y = height - 1.9 * inch  # Reduced space (was 2.3)
    else:
        y = height - 1.6 * inch  # Reduced space (was 2.0)

    headers = [
        "Date",
        "Station",
        "Travelling",
        "KM Travelled",
        "Total (PKR)",
        "CSR Verified",
        "Summary"
    ]
    col_x = [
        0.25 * inch,
        0.85 * inch,
        2.15 * inch,
        3.35 * inch,
        4.45 * inch,
        5.55 * inch,
        6.65 * inch
    ]
    col_widths = [
        0.6 * inch,
        1.3 * inch,
        1.2 * inch,
        1.1 * inch,
        1.1 * inch,
        1.1 * inch,
        1.55 * inch
    ]

    # Draw header background with improved styling
    header_y = y
    c.setFillColorRGB(0.9, 0.9, 0.95)  # Light blue-gray background for header
    c.rect(0.25*inch, y - 0.10*inch, 7.95*inch, 0.20*inch, fill=1, stroke=0)  # Further reduced height
    c.setFillColorRGB(0, 0, 0)  # Reset to black
    
    # Draw header borders with improved styling - draw borders BEFORE text
    y -= 0.10 * inch  # Adjusted for further reduced height
    c.setLineWidth(1.0)  # Thicker line for header bottom
    c.line(0.25*inch, y, 8.2*inch, y)  # Bottom line of header
    c.line(0.25*inch, header_y + 0.10*inch, 8.2*inch, header_y + 0.10*inch)  # Top line of header
    
    # Draw vertical lines for header borders - proper table structure
    c.line(0.25*inch, header_y + 0.10*inch, 0.25*inch, y)  # Left border
    for i in range(1, len(col_x)):
        c.line(col_x[i], header_y + 0.10*inch, col_x[i], y)  # Column separators
    c.line(8.2*inch, header_y + 0.10*inch, 8.2*inch, y)  # Right border
    
    # Draw header text with better styling (bold and perfectly centered) - AFTER borders
    c.setFont("Helvetica-Bold", 11)  # Increased font size for better readability
    for i, h in enumerate(headers):
        # Center text in each column
        text_width = c.stringWidth(h, "Helvetica-Bold", 11)
        if i < len(col_x) - 1:
            col_center = col_x[i] + (col_x[i+1] - col_x[i]) / 2
        else:
            col_center = col_x[i] + (8.2*inch - col_x[i]) / 2
        text_x = col_center - (text_width / 2)
        # Center text vertically in the header cell with more space from top
        c.drawString(text_x, y + 0.06*inch, h)
    
    # Reset font to regular for data rows
    c.setFont("Helvetica", 10)
    
    # Draw vertical lines for header borders - proper table structure
    c.line(0.25*inch, header_y + 0.10*inch, 0.25*inch, y)  # Left border
    for i in range(1, len(col_x)):
        c.line(col_x[i], header_y + 0.10*inch, col_x[i], y)  # Column separators
    c.line(8.2*inch, header_y + 0.10*inch, 8.2*inch, y)  # Right border
    c.setLineWidth(0.5)  # Reset line width
    
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
            
            # Redraw headers on new page with enhanced styling
            c.setFont("Helvetica-Bold", 11)  # Increased font size for headers
            header_y = y
            for i, h in enumerate(headers):
                text_width = c.stringWidth(h, "Helvetica-Bold", 11)
                if i < len(col_x) - 1:
                    col_center = col_x[i] + (col_x[i+1] - col_x[i]) / 2
                else:
                    col_center = col_x[i] + (8.2*inch - col_x[i]) / 2
                text_x = col_center - (text_width / 2)
                c.drawString(text_x, y - 0.05 * inch, h)
            
            c.setFont("Helvetica", 10)
            y -= 0.25 * inch  # Increased spacing for header bottom
            
            # Draw header borders with improved styling
            c.setLineWidth(1.0)  # Thicker line for header borders
            c.line(0.25*inch, y, 8.2*inch, y)  # Bottom line of header
            c.line(0.25*inch, header_y + 0.15*inch, 8.2*inch, header_y + 0.15*inch)  # Top line of header
            
            # Draw vertical lines for header borders - proper table structure
            c.line(0.25*inch, header_y + 0.15*inch, 0.25*inch, y)  # Left border
            for i in range(1, len(col_x)):
                c.line(col_x[i], header_y + 0.15*inch, col_x[i], y)  # Column separators
            c.line(8.2*inch, header_y + 0.15*inch, 8.2*inch, y)  # Right border
            c.setLineWidth(0.5)  # Reset line width
            
            # Continue table on new page
            
            y -= 0.15 * inch
        
        # Add minimal padding for text positioning
        text_padding = 0.04 * inch
        
        # Apply alternating row colors
        if idx % 2 == 1:  # Odd rows get light gray background
            c.setFillColorRGB(0.95, 0.95, 0.95)  # Light gray
            c.rect(0.25*inch, y - row_height, 7.95*inch, row_height, fill=1, stroke=0)
            c.setFillColorRGB(0, 0, 0)  # Reset to black for text
        
        # Draw row data with proper alignment
        # Add vertical padding to position text properly in cells
        text_y_position = y - 0.12 * inch  # Increased space from the top of the cell
        
        # Date - center align
        date_text = expense.day.strftime('%d-%m')
        date_width = c.stringWidth(date_text, "Helvetica", 10)
        date_x = col_x[0] + ((col_x[1] - col_x[0]) - date_width) / 2
        c.drawString(date_x, text_y_position, date_text)
        
        # Station
        c.drawString(col_x[1] + text_padding, text_y_position, expense.station.value)
        
        # Travelling
        c.drawString(col_x[2] + text_padding, text_y_position, expense.travelling.value)
        
        # KM Travelled - right align
        km_text = str(expense.km_travelled)
        km_width = c.stringWidth(km_text, "Helvetica", 10)
        km_x = col_x[4] - km_width - text_padding
        c.drawString(km_x, text_y_position, km_text)

        # Total amount - right align
        total_amount = (expense.km_travelled or 0) * TRAVEL_ALLOWANCE_RATE
        total_text = format_currency(total_amount)
        total_width = c.stringWidth(total_text, "Helvetica", 10)
        total_x = col_x[5] - total_width - text_padding
        c.drawString(total_x, text_y_position, total_text)

        # CSR Verified column left empty
        c.drawString(col_x[5] + text_padding, text_y_position, "")

        # Summary of Activity - Handle multi-line text with improved wrapping and left alignment
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

        # Calculate row height based on summary lines with adequate space
        max_lines = len(summary_lines)
        row_height = max(0.18 * inch, 0.18 * inch * max_lines)  # Increased row height by 0.1 inch

        # Draw summary text (potentially multi-line) with increased spacing
        for i, line in enumerate(summary_lines):
            summary_y = text_y_position - (i * 0.08 * inch)  # Increased line spacing for multi-line summaries
            c.drawString(col_x[6] + text_padding, summary_y, line.strip())
        
        # Draw cell borders for this row with Excel-like grid (compact size)
        # For Excel-like appearance with smaller cells
        
        # Calculate exact row boundaries with minimal padding
        row_top = y + 0.01 * inch  # Minimal padding at top
        row_bottom = y - row_height - 0.01 * inch  # Minimal padding at bottom
        
        # Draw horizontal lines (top and bottom of row)
        c.setLineWidth(0.5)  # Set consistent line width
        c.line(0.25*inch, row_top, 8.2*inch, row_top)  # Top line of row
        c.line(0.25*inch, row_bottom, 8.2*inch, row_bottom)  # Bottom line of row
        
        # Draw vertical lines for each column with consistent width
        c.line(0.25*inch, row_top, 0.25*inch, row_bottom)  # Left border
        for i in range(1, len(col_x)):
            c.line(col_x[i], row_top, col_x[i], row_bottom)  # Column separators
        c.line(8.2*inch, row_top, 8.2*inch, row_bottom)  # Right border
        
        # Update y position for next row with minimal spacing
        y = row_bottom - 0.01 * inch
        
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
    
   
    
    # Create a table for the count totals (similar to the main expense table)
    count_data = []
    
    # Create a table with headers in the first row
    table_headers = [
        "Station Count Totals:",
        "Travelling Count Totals:",
        "Total KM Travelled:",
        "Total Amount:"
    ]
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
    
    # Calculate totals
    total_km = sum(expense.km_travelled for expense in expenses)
    total_amount = sum((expense.km_travelled or 0) * TRAVEL_ALLOWANCE_RATE for expense in expenses)
    
    # Ensure both columns have the same number of rows
    while len(station_rows) < max_items:
        station_rows.append("")
    while len(travelling_rows) < max_items:
        travelling_rows.append("")
    
    # Add all rows to the table data with totals in the first row of the last columns
    for i in range(max_items):
        if i == 0:
            count_data.append([
                station_rows[i],
                travelling_rows[i],
                f"{total_km:.1f}",
                format_currency(total_amount)
            ])
        else:
            count_data.append([station_rows[i], travelling_rows[i], "", ""])
    
    # Set up the table with better styling
    count_table = Table(count_data, colWidths=[2.1*inch, 2.1*inch, 2.0*inch, 2.0*inch])
    
    # Enhanced styling for the count totals table with reduced padding for compact layout
    count_table_style = TableStyle([
        ('BOX', (0, 0), (-1, -1), 1.5, colors.black),  # Thicker outer border
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),  # Grid lines for all cells
    ('BACKGROUND', (0, 0), (0, 0), colors.lightgrey),  # Header background
    ('BACKGROUND', (1, 0), (1, 0), colors.lightgrey),  # Header background
    ('BACKGROUND', (2, 0), (2, 0), colors.lightgrey),  # Header background for KM
    ('BACKGROUND', (3, 0), (3, 0), colors.lightgrey),  # Header background for amount
    ('BACKGROUND', (2, 1), (2, 1), colors.lavender),  # Highlight background for KM value
    ('BACKGROUND', (3, 1), (3, 1), colors.lavender),  # Highlight background for amount value
    ('BOX', (2, 1), (2, 1), 1.5, colors.black),  # Thicker border for KM value
    ('BOX', (3, 1), (3, 1), 1.5, colors.black),  # Thicker border for amount value
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),  # Bold header
    ('FONTNAME', (2, 1), (2, 1), 'Helvetica-Bold'),  # Bold KM value
    ('FONTNAME', (3, 1), (3, 1), 'Helvetica-Bold'),  # Bold amount value
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),  # Center align headers
        ('ALIGN', (0, 1), (-1, -1), 'LEFT'),  # Left align content
    ('ALIGN', (2, 1), (2, 1), 'CENTER'),  # Center align KM value
    ('ALIGN', (3, 1), (3, 1), 'CENTER'),  # Center align amount value
        ('FONTSIZE', (0, 0), (-1, 0), 10),  # Reduced font size for headers
        ('FONTSIZE', (0, 1), (-1, -1), 9),  # Reduced font size for content
    ('FONTSIZE', (2, 1), (2, 1), 10),  # Reduced font size for KM value
    ('FONTSIZE', (3, 1), (3, 1), 10),  # Reduced font size for amount value
        ('BOTTOMPADDING', (0, 0), (-1, 0), 4),  # Reduced header padding
        ('TOPPADDING', (0, 0), (-1, 0), 4),  # Reduced header padding
        ('BOTTOMPADDING', (0, 1), (-1, -1), 2),  # Reduced cell padding
        ('TOPPADDING', (0, 1), (-1, -1), 2),  # Reduced cell padding
        ('LEFTPADDING', (0, 0), (-1, -1), 8),  # Reduced left padding
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),  # Reduced right padding
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),  # Vertical alignment
    ])
    
    count_table.setStyle(count_table_style)
    
    # Draw the table with better positioning and reduced spacing
    count_table.wrapOn(c, 8.5*inch, 11*inch)
    count_table.drawOn(c, 0.25*inch, y - (0.2*inch * max_items) - 0.3*inch)
    
    # Update y position for any content that follows with reduced spacing
    y -= (0.2*inch * max_items) + 0.5*inch  # Reduced spacing after count totals table
    
    # Add remarks section with smaller font
    c.setFont("Helvetica-Bold", 10)
    c.drawString(0.25*inch, y, "Remarks:")
    
    # Draw remarks box with reduced height
    remarks_box_height = 0.6*inch  # Reduced height for remarks box
    c.setLineWidth(0.5)  # Thinner line
    c.rect(0.25*inch, y - remarks_box_height, 8.0*inch, remarks_box_height)
    
    # Update y position for signature section with reduced spacing
    y -= remarks_box_height + 0.3*inch
    
    # Add signature section with four placeholders without heading - more compact
    signature_labels = ["Person A:", "Person B:", "Person C:", "Person D:"]
    
    # Create all signatures in one line with more compact spacing
    signature_width = 1.6 * inch  # Reduced width for each signature
    spacing = 0.15 * inch  # Reduced spacing between signatures
    
    # Calculate starting position to distribute signatures evenly
    page_width = 8.5 * inch
    total_width = (signature_width * 4) + (spacing * 3)
    start_x = (page_width - total_width) / 2
    
    # Draw all signatures in one line with smaller font
    for i, label in enumerate(signature_labels):
        # Calculate x position for each signature
        x_pos = start_x + (i * (signature_width + spacing))
        
        # Draw label with smaller font
        c.setFont("Helvetica-Bold", 9)
        c.drawString(x_pos, y, label)
        
        # Draw signature line
        c.setLineWidth(0.5)
        c.line(x_pos, y - 0.2*inch, x_pos + signature_width, y - 0.2*inch)
    
    # Add footer (removed generation date as requested)
    c.setFont("Helvetica", 9)
    
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