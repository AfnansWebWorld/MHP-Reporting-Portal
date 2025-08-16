import os
from emails import Message
from emails.backend.smtp import SMTPBackend

def send_pdf(to_email: str, subject: str, text: str, pdf_bytes: bytes, filename: str = "report.pdf"):
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")

    if not smtp_user or not smtp_password:
        raise RuntimeError("SMTP credentials not configured. Please set SMTP_USER and SMTP_PASSWORD in .env file. For Gmail, use an App Password instead of your regular password.")

    message = Message(
        subject=subject,
        text=text,
        mail_from=(os.getenv("MAIL_FROM_NAME", "MHP Portal"), smtp_user),
    )

    message.attach(data=pdf_bytes, filename=filename, content_type="application/pdf")

    backend = SMTPBackend(host=smtp_host, port=smtp_port, tls=True, user=smtp_user, password=smtp_password)
    r = message.send(to=to_email, smtp=backend)
    return r