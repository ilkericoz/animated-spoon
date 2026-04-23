"""
Person C owns this file.

Generates a PDF coupon sheet from the email payload.
Each coupon includes:
  - product name + discount
  - Code128 barcode (SKU)
  - ALDI Rescue branding

Dependencies: reportlab, python-barcode, Pillow
"""

import io

import barcode
from barcode.writer import ImageWriter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

# ALDI brand colours
NAVY = colors.HexColor("#00005F")
BLUE = colors.HexColor("#00A0E9")
ORANGE = colors.HexColor("#FF7800")
YELLOW = colors.HexColor("#FFCC00")
WHITE = colors.white

COUPON_W = 88 * mm
COUPON_H = 50 * mm
COLS = 2
MARGIN = 10 * mm
GAP = 5 * mm


def generate_coupon_pdf(payload: dict) -> bytes:
    """
    Returns a PDF byte string containing one coupon per product.
    """
    buf = io.BytesIO()
    page_w, page_h = A4
    pdf = canvas.Canvas(buf, pagesize=A4)

    products = payload["products"]
    user_name = payload.get("user_name", "Customer")
    city = payload.get("user_city", "")
    waste_kg = payload.get("waste_saved_kg", 0)
    co2_kg = payload.get("co2_saved_kg", 0)

    # Header
    pdf.setFillColor(NAVY)
    pdf.rect(0, page_h - 30 * mm, page_w, 30 * mm, fill=1, stroke=0)

    pdf.setFillColor(WHITE)
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(MARGIN, page_h - 18 * mm, "ALDI Rescue")

    pdf.setFont("Helvetica", 10)
    pdf.drawString(MARGIN, page_h - 26 * mm, f"Personalised for {user_name} - {city}")

    sq = 8 * mm
    x0 = page_w - MARGIN - 2 * sq - 2
    y0 = page_h - 26 * mm
    for color, (dx, dy) in zip(
        [BLUE, ORANGE, YELLOW, colors.HexColor("#D20002")],
        [(0, sq + 2), (sq + 2, sq + 2), (0, 0), (sq + 2, 0)],
    ):
        pdf.setFillColor(color)
        pdf.rect(x0 + dx, y0 + dy, sq, sq, fill=1, stroke=0)

    # Coupons
    start_y = page_h - 35 * mm

    for i, product in enumerate(products):
        col = i % COLS
        row = i // COLS
        x = MARGIN + col * (COUPON_W + GAP)
        y = start_y - row * (COUPON_H + GAP) - COUPON_H

        if y < MARGIN + 20 * mm:
            pdf.showPage()
            start_y = page_h - MARGIN
            row = 0
            y = start_y - COUPON_H

        _draw_coupon(pdf, x, y, product)

    # Footer
    footer_y = MARGIN + 5 * mm
    pdf.setFillColor(NAVY)
    pdf.setFont("Helvetica", 8)
    pdf.drawString(
        MARGIN,
        footer_y,
        f"These coupons rescued ~{waste_kg} kg of food and saved ~{co2_kg} kg CO2 from waste.",
    )

    pdf.save()
    return buf.getvalue()


def _draw_coupon(pdf: canvas.Canvas, x: float, y: float, product: dict):
    name = product.get("name", "Product")
    discount = product.get("discount_pct", 0)
    orig = product.get("original_price", 0)
    disc = product.get("discounted_price", orig * (1 - discount / 100))
    sku = product.get("sku", "0000000000000")
    expiry_days = product.get("expiry_days", "?")
    explanation = product.get("explanation", "")

    pdf.setFillColor(colors.HexColor("#F5F5F5"))
    pdf.roundRect(x, y, COUPON_W, COUPON_H, 4 * mm, fill=1, stroke=0)

    urgency_color = [YELLOW, ORANGE, colors.HexColor("#D20002")][min(product.get("urgency", 1) - 1, 2)]
    pdf.setFillColor(urgency_color)
    pdf.rect(x, y, 4 * mm, COUPON_H, fill=1, stroke=0)

    pdf.setFillColor(ORANGE)
    pdf.circle(x + COUPON_W - 12 * mm, y + COUPON_H - 10 * mm, 9 * mm, fill=1, stroke=0)
    pdf.setFillColor(WHITE)
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawCentredString(x + COUPON_W - 12 * mm, y + COUPON_H - 12 * mm, f"-{discount}%")

    pdf.setFillColor(NAVY)
    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(x + 7 * mm, y + COUPON_H - 10 * mm, name[:28])

    pdf.setFillColor(colors.HexColor("#888888"))
    pdf.setFont("Helvetica", 8)
    pdf.drawString(x + 7 * mm, y + COUPON_H - 17 * mm, f"Was {_format_huf(orig)}")
    pdf.setFillColor(colors.HexColor("#D20002"))
    pdf.setFont("Helvetica-Bold", 13)
    pdf.drawString(x + 7 * mm, y + COUPON_H - 25 * mm, f"NOW {_format_huf(disc)}")

    pdf.setFillColor(colors.HexColor("#555555"))
    pdf.setFont("Helvetica-Oblique", 7)
    suffix = "" if expiry_days == 1 else "s"
    pdf.drawString(x + 7 * mm, y + COUPON_H - 31 * mm, f"Expires in {expiry_days} day{suffix}")

    if explanation:
        pdf.setFont("Helvetica", 7)
        pdf.setFillColor(colors.HexColor("#444444"))
        pdf.drawString(x + 7 * mm, y + 14 * mm, explanation[:55])

    barcode_img = _make_barcode(sku)
    if barcode_img:
        pdf.drawImage(barcode_img, x + 7 * mm, y + 2 * mm, width=45 * mm, height=10 * mm)


def _make_barcode(sku: str) -> ImageReader | None:
    try:
        code128 = barcode.get_barcode_class("code128")
        buf = io.BytesIO()
        code128(sku, writer=ImageWriter()).write(buf, options={"write_text": False, "quiet_zone": 1})
        buf.seek(0)
        return ImageReader(buf)
    except Exception as exc:
        print(f"[pdf] barcode error for {sku}: {exc}")
        return None


def _format_huf(value: float | int) -> str:
    return f"{int(round(value))} Ft"
