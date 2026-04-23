import os
import smtplib
from email.message import EmailMessage
from email.utils import formatdate, make_msgid
from pathlib import Path

from dotenv import load_dotenv
from premailer import transform


load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")


def send_rescue_email(
    user_email: str,
    subject: str,
    html_body: str,
    pdf_bytes: bytes,
    pdf_filename: str,
) -> dict:
    host = os.getenv("SMTP_HOST", "")
    port = int(os.getenv("SMTP_PORT", "587"))
    username = os.getenv("SMTP_USER", "")
    password = os.getenv("SMTP_PASSWORD", "")
    from_addr = os.getenv("SMTP_FROM", username)

    if not all([host, port, username, password, from_addr]):
        return {"status": "error", "message_id": None, "error": "SMTP configuration is incomplete"}

    try:
        inlined_html = transform(html_body, disable_leftover_css=True)
    except Exception as exc:
        return {"status": "error", "message_id": None, "error": f"CSS inline failed: {exc}"}

    message = EmailMessage()
    message["Subject"] = subject or "ALDI Rescue"
    message["From"] = from_addr
    message["To"] = user_email
    message["Date"] = formatdate(localtime=True)
    message["Message-ID"] = make_msgid(domain=from_addr.split("@")[-1])
    message.set_content("Please view this email in an HTML-compatible client.")
    message.add_alternative(inlined_html, subtype="html")
    message.add_attachment(
        pdf_bytes,
        maintype="application",
        subtype="pdf",
        filename=pdf_filename,
    )

    try:
        with smtplib.SMTP(host, port, timeout=30) as server:
            server.starttls()
            server.login(username, password)
            failed = server.send_message(message)
    except Exception as exc:
        return {"status": "error", "message_id": None, "error": str(exc)}

    if failed:
        return {"status": "error", "message_id": None, "error": str(failed)}

    return {
        "status": "sent",
        "message_id": message["Message-ID"],
        "error": None,
    }
