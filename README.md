# ALDI Rescue — AIIS Hackathon

Personalised food-rescue emails for ALDI customers. Combines near-expiry product data, live weather, and AI copy to send the right deal to the right person at the right moment.

## Quick start

Two processes — the FastAPI backend and the Vite dev server for the dashboard.

```bash
# 1. Backend: Python deps + env + run API
pip install -r requirements.txt
cp .env.example .env           # add ANTHROPIC_API_KEY
uvicorn backend.api:app --reload
# → http://localhost:8000

# 2. Dashboard (in a second terminal): React + shadcn/ui
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

The dashboard points at `http://localhost:8000` by default. Override with
`frontend/.env.local`:

```env
VITE_API_BASE=http://localhost:8000
```

For a production build of the dashboard: `npm run build` → `frontend/dist/`.

## Who owns what

| Person | File(s) | Task |
|--------|---------|------|
| A | `backend/nagya_client.py`, `backend/email_payload.py` | Data, ranking, bundle logic |
| B | `backend/weather.py`, `backend/ai_copy.py` | Weather + LLM copy generation |
| C | `backend/pdf_generator.py`, `templates/email.html` | Email HTML + PDF coupon sheet |
| D | `frontend/` (React + shadcn), `backend/api.py` | Dashboard + integration glue |

## Data contract — `generate_email_payload(user_id)` returns:

```json
{
  "user_id": "U001",
  "user_name": "Anna Schmidt",
  "user_city": "Munich",
  "user_country": "DE",
  "user_language": "de",
  "weather": { "forecast": "sunny", "temp_max": 28, "description": "..." },
  "products": [
    {
      "sku": "...", "name": "...", "category": "...",
      "expiry_days": 2, "urgency": 3,
      "original_price": 3.99, "discount_pct": 40, "discounted_price": 2.39,
      "explanation": "...",
      "bundle_sku": null
    }
  ],
  "bundles": [{ "name": "...", "skus": [...], "bundle_price": 2.19, "bundle_discount_pct": 50 }],
  "subject_line": "...",
  "intro_line": "...",
  "waste_saved_kg": 1.2,
  "co2_saved_kg": 3.6,
  "send_time": "Saturday 09:00"
}
```

See `data/fixture.json` for a full example — use it as a dev fixture so no one is blocked waiting for others.

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users` | List all users (from `api.nagya.app/users`) |
| POST | `/generate/{user_id}?use_ai=true` | Full payload JSON |
| GET | `/email/{user_id}` | Rendered HTML email preview |
| GET | `/pdf/{user_id}` | Downloadable PDF coupon sheet |
| GET | `/stats` | Aggregate waste/CO₂ across all users |

## Nagya API

- `GET api.nagya.app/products` — near-expiry products
- `GET api.nagya.app/users` — user list

Both endpoints fall back to local fixture data if unavailable.
