# ALDI Rescue — Agent Work Split (Base Build)

**Goal of this phase:** get the base pipeline working end-to-end and correctly. No dramatics, no polish, no new features beyond what's listed here. We need a solid foundation before anyone adds extras.

**Definition of done for this phase:** a judge could click "Generate" for any of the 5 real API users, see a correct email preview with real products, correct discounts, and correct math, and actually receive that email in the shared Gmail inbox with a working PDF coupon attached.

---

## Shared ground rules

1. Use **real API users only** (the 5 from `api.nagya.app/users`). Ignore `data/users.json` for now. Everyone is in Budapest. Everything is in Hungarian.
2. **Do not touch files outside your ownership.** If you need a field from another agent's output, message the channel and we agree on the contract before anyone codes.
3. The payload schema below is **frozen for this phase.** Any change needs agreement from all four before merging.
4. Commit small and often. Push to your own branch. No force-pushes to main.
5. If the real API is down, fall back to fixtures silently — never crash the demo.

---

## Frozen payload contract (v1)

Every agent must read from or write to this shape. Agent A owns producing it.

```json
{
  "user": {
    "id": 2,
    "name": "Grillmester Gábor",
    "email": "aiishackaton+2@gmail.com",
    "favorite_category": "Grillezős food",
    "least_purchased_category": "Pékáru"
  },
  "weather": {
    "city": "Budapest",
    "condition": "sunny",
    "temp_c": 24,
    "weekend_day": "Saturday"
  },
  "products": [
    {
      "sku": "GF-001",
      "title": "Csirkeszárny marinált 1 kg",
      "category": "Grillezős food",
      "expiration_date": "2026-04-26",
      "days_until_expiry": 3,
      "price_huf": 2199,
      "cost_price_huf": 1490,
      "stock": 43,
      "last_7_day_sold": 32,
      "chosen_discount_pct": 25,
      "discounted_price_huf": 1649,
      "units_at_risk": 11,
      "projected_units_rescued": 9,
      "projected_profit_huf": 1431,
      "economic_reasoning": "At 25% off, price stays above cost. Projected to move 9 of 11 at-risk units. Going to 50% would move all 11 but lose margin — 25% chosen.",
      "ai_explanation": "Hétvégén 24°C, ideális grillidő. Ez a kedvenc kategóriád."
    }
  ],
  "bundles": [
    {
      "name": "Grillezős hétvége",
      "skus": ["GF-001", "GNF-001", "SZE-001"],
      "bundle_discount_pct": 15
    }
  ],
  "totals": {
    "projected_profit_huf": 4820,
    "projected_waste_saved_kg": 3.2,
    "projected_waste_value_huf": 2100,
    "projected_co2_saved_kg": 8.0
  },
  "ai_copy": {
    "subject_line": "Gábor, hétvégi grill 25% kedvezménnyel",
    "intro_line": "Szombaton 24°C lesz. Összeállítottunk neked egy grillcsomagot."
  }
}
```

**Fields with `projected_` prefix are estimates** from Agent A's economics model. They are not ground truth, just the agent's best guess. That is fine for the demo.

---

## Agent A — Economics engine

**Files you own:** `backend/email_payload.py`, `backend/economics.py` (new). Do not edit anything else.

**What to do:**
1. Create `backend/economics.py` with one function: `pick_optimal_discount(product) -> (discount_pct, reasoning_string, projections_dict)`. It should try discounts of 15, 25, 40, and 50 percent. For each, project units rescued using stock, last_7_day_sold, and days_until_expiry. Compute net margin: `(discounted_price - cost_price) * projected_units_rescued`. Pick the discount with highest net margin. Never return a discount that sends price below cost_price.
2. Update `email_payload.py` to call `pick_optimal_discount` instead of the static 20/50/50 ladder. Populate the new fields: `chosen_discount_pct`, `discounted_price_huf`, `units_at_risk`, `projected_units_rescued`, `projected_profit_huf`, `economic_reasoning`.
3. Compute top-level `totals` object exactly as in the contract above.
4. Keep the existing bundle logic, just update bundle pricing to use the new discounts.
5. Purchase history does not exist for real API users. Use `favorite_category` (boost affinity 1.5x) and `least_purchased_category` (set affinity to 0, never recommend). Do not fabricate history.

**Do not:** change the `/generate` endpoint signature, rename any existing payload fields that other agents depend on, touch `api.py`.

**Done when:** `POST /generate/2?use_ai=false` returns a payload matching the contract, and the numbers make sense when you eyeball them.

---

## Agent B — Email sending

**Files you own:** `backend/email_sender.py` (new), and you are allowed to add new endpoints to `backend/api.py` (but not modify existing ones).

**What to do:**
1. Set up Gmail SMTP using an app password. Use the shared team Gmail account. Store credentials in `.env`, not in code. Confirm 2FA is enabled on the account first.
2. Create `email_sender.py` with `send_rescue_email(user_email, subject, html_body, pdf_bytes, pdf_filename) -> {status, message_id, error}`.
3. Inline all CSS in the HTML before sending (use the `premailer` package, `pip install premailer`). Gmail strips `<style>` blocks.
4. Add endpoint `POST /send/{user_id}` to `api.py`. It should call the existing email payload generator, render the HTML, generate the PDF, inline the CSS, and send. Return `{status, message_id, sent_at, user_email}`.
5. Add endpoint `GET /sent` returning a list of what has been sent this session. In-memory list is fine, no database.
6. Add a small delay between sends if called in a loop (1 second) to avoid Gmail rate limits.

**Do not:** modify `/generate`, `/email`, `/pdf`, or `/stats`. Do not edit the email template. Do not edit frontend.

**Done when:** `curl -X POST http://localhost:8000/send/2` actually lands an email with a working PDF attachment in the shared inbox, and the inlined CSS renders correctly in Gmail web.

---

## Agent C — Dashboard

**Files you own:** `frontend/index.html` only.

**What to do:**
1. Keep the existing layout. Add a second row of stat cards next to the existing ones, showing: "Projected profit today (HUF)", "Waste value avoided (HUF)", "Emails sent". Pull numbers from payload `totals` and from `GET /sent`.
2. In the user list, add a "Send" button next to each user's "Generate" button. It calls `POST /send/{user_id}` and updates a status badge ("Sent ✓" or "Failed").
3. Add a "Send to all 5" button at the top of the user list that sends sequentially and shows progress.
4. In the preview pane, under the existing Email Preview tab, add a small box showing the product list with chosen discount and economic_reasoning for each. Plain text, no fancy styling.
5. All API calls go to `http://localhost:8000`.

**Do not:** touch any backend file, redesign the UI from scratch, add charting libraries, add authentication. The existing dashboard works — extend it, do not rewrite it.

**Done when:** you can click through all 5 users, hit Send on each, and see the sent status update, with profit numbers visible in the stat cards.

---

## Agent D — AI copy accuracy

**Files you own:** `backend/ai_copy.py` only.

**What to do:**
1. Fix the `purchase_history_hint` bug. Remove that field entirely. The context Claude gets should be: user's name, favorite_category, least_purchased_category, weather condition and temperature, and the list of chosen products with their discount and reasoning.
2. Change the system prompt to output **Hungarian only** (ignore the `de/hu/fr/pl/en` branching for now). All 5 real users are Hungarian.
3. The prompt must produce: a subject line under 60 characters using the user's first name, an intro line of 1-2 sentences referencing the weather, and one per-product explanation under 20 words each that references either the category fit or the weather, not both.
4. Keep the JSON output format and the markdown fence stripping. Keep the fallback for parse errors.
5. Use `claude-sonnet-4-6` for now, do not change the model.

**Do not:** touch email_payload.py, the email template, the PDF generator, or the frontend. Do not add new dependencies.

**Done when:** `POST /generate/2?use_ai=true` returns copy in Hungarian that references Gábor's favorite grill category and the actual weather, and each product has a short relevant blurb.

---

## Integration checkpoints

- **Checkpoint 1 (30 min in):** Agent A's new payload fields are live. Everyone else pulls main and confirms their code still runs against the new shape.
- **Checkpoint 2 (60 min in):** Agent B can send a real email end-to-end using the current template. Agent C can read `/sent`.
- **Checkpoint 3 (90 min in):** All 4 pieces merged. One person (whoever finishes first) runs `POST /send/all` and we verify all 5 emails arrive correctly in the shared inbox.

If any checkpoint slips, we cut scope from that agent before moving on. No agent blocks the others.

---

## What we are explicitly **not** doing in this phase

- Multilingual support
- Weather personalization per user (everyone is Budapest)
- Campaign approval flow / human-in-the-loop UI
- Reasoning traces / audit log
- Sustainability storytelling
- Brand polish, animations, charts
- Auto-discovered bundles (keep the hardcoded ones)

These come later, only if base is solid. Do not sneak them in.
```