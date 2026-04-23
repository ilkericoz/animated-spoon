"""
FastAPI backend — the integration point.

Endpoints:
  GET  /users                         → list all users
  POST /generate/{user_id}            → generate email payload (JSON)
  GET  /email/{user_id}               → render HTML email preview
  GET  /pdf/{user_id}                 → download PDF coupon sheet
  GET  /stats                         → aggregate waste/CO2 stats across all users
"""

import json
import pathlib
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from backend.email_payload import generate_email_payload
from backend.ai_copy import enrich_payload_with_copy
from backend.pdf_generator import generate_coupon_pdf
from backend.nagya_client import get_all_users

app = FastAPI(title="ALDI Rescue", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

USERS_FILE = pathlib.Path(__file__).parent.parent / "data" / "users.json"
TEMPLATE_FILE = pathlib.Path(__file__).parent.parent / "templates" / "email.html"


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/users")
def list_users():
    """Proxies GET api.nagya.app/users, falls back to local fixture."""
    return get_all_users()


@app.post("/generate/{user_id}")
def generate(user_id: str, use_ai: bool = True):
    """
    Generate the full email payload for a user.
    Set use_ai=false to skip LLM call (faster, uses placeholder copy).
    """
    payload = generate_email_payload(user_id)
    if use_ai:
        payload = enrich_payload_with_copy(payload)
    # Remove internal scoring key before returning
    for p in payload.get("products", []):
        p.pop("_score", None)
    return payload


@app.get("/email/{user_id}", response_class=HTMLResponse)
def preview_email(user_id: str, use_ai: bool = True):
    """Returns rendered HTML email for browser preview."""
    payload = generate(user_id, use_ai=use_ai)
    html = _render_email(payload)
    return HTMLResponse(content=html)


@app.get("/pdf/{user_id}")
def download_pdf(user_id: str, use_ai: bool = True):
    """Returns PDF coupon sheet as a downloadable file."""
    payload = generate(user_id, use_ai=use_ai)
    pdf_bytes = generate_coupon_pdf(payload)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=aldi_rescue_{user_id}.pdf"},
    )


@app.get("/stats")
def aggregate_stats():
    """Aggregate waste/CO2 stats across all users — for the dashboard hero numbers."""
    users = get_all_users()
    total_waste = 0.0
    total_co2 = 0.0
    for user in users:
        payload = generate_email_payload(user["user_id"])
        total_waste += payload["waste_saved_kg"]
        total_co2 += payload["co2_saved_kg"]
    return {
        "total_users": len(users),
        "total_waste_saved_kg": round(total_waste, 2),
        "total_co2_saved_kg": round(total_co2, 2),
    }


# ── Email renderer ────────────────────────────────────────────────────────────

def _render_email(payload: dict) -> str:
    template = TEMPLATE_FILE.read_text()

    products_html = ""
    for p in payload["products"]:
        urgency_label = ["", "Expiring soon", "Expiring in 2-3 days", "Last chance!"][p.get("urgency", 1)]
        urgency_color = ["", "#FFCC00", "#FF7800", "#D20002"][p.get("urgency", 1)]
        products_html += f"""
        <tr>
          <td style="padding:12px 16px; border-bottom:1px solid #eee;">
            <span style="background:{urgency_color};color:#00005F;font-size:10px;font-weight:700;
                         padding:2px 6px;border-radius:3px;">{urgency_label}</span>
            <strong style="display:block;font-size:15px;color:#00005F;margin-top:4px;">{p['name']}</strong>
            <span style="color:#888;text-decoration:line-through;font-size:12px;">€{p['original_price']:.2f}</span>
            <span style="color:#D20002;font-weight:700;font-size:16px;margin-left:6px;">€{p.get('discounted_price', 0):.2f}</span>
            <span style="background:#FF7800;color:white;font-size:11px;font-weight:700;
                         padding:1px 5px;border-radius:3px;margin-left:4px;">-{p.get('discount_pct',0)}%</span>
            <p style="color:#555;font-size:12px;margin:4px 0 0;">{p.get('explanation','')}</p>
          </td>
        </tr>"""

    bundles_html = ""
    for b in payload.get("bundles", []):
        bundles_html += f"""
        <div style="background:#FFF3E0;border-left:4px solid #FF7800;padding:10px 14px;margin:8px 0;border-radius:4px;">
          <strong style="color:#00005F;">{b['name']}</strong><br>
          <span style="color:#888;font-size:12px;text-decoration:line-through;">€{b.get('original_total',0):.2f}</span>
          <span style="color:#D20002;font-weight:700;font-size:15px;margin-left:6px;">€{b['bundle_price']:.2f}</span>
          <span style="background:#D20002;color:white;font-size:11px;padding:1px 5px;border-radius:3px;margin-left:4px;">
            -{b.get('bundle_discount_pct',0)}% BUNDLE
          </span>
        </div>"""

    return (template
            .replace("{{user_name}}", payload.get("user_name", "Customer"))
            .replace("{{subject_line}}", payload.get("subject_line", "Your ALDI Rescue deals"))
            .replace("{{intro_line}}", payload.get("intro_line", ""))
            .replace("{{weather_description}}", payload.get("weather", {}).get("description", ""))
            .replace("{{products_html}}", products_html)
            .replace("{{bundles_html}}", bundles_html)
            .replace("{{waste_saved_kg}}", str(payload.get("waste_saved_kg", 0)))
            .replace("{{co2_saved_kg}}", str(payload.get("co2_saved_kg", 0)))
            .replace("{{send_time}}", payload.get("send_time", "Saturday 09:00"))
            )
