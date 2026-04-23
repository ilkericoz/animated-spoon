"""
Person B owns this file.

Makes ONE Claude API call per user to generate:
  - subject_line (localised to user's language)
  - intro_line
  - per-product explanation blurbs (all in one batch)

Requires: ANTHROPIC_API_KEY in env.
"""

import os
import json
import anthropic

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

LANGUAGE_NAMES = {
    "de": "German",
    "hu": "Hungarian",
    "fr": "French",
    "pl": "Polish",
    "en": "English",
}

SYSTEM_PROMPT = """You are the copywriter for ALDI Rescue, ALDI's food-waste reduction campaign.
Your tone is friendly, warm, and slightly playful — never pushy or corporate.
You highlight value AND the feel-good impact of rescuing food from going to waste.
Keep every line short and punchy. No filler words."""


def enrich_payload_with_copy(payload: dict) -> dict:
    """
    Takes the payload from generate_email_payload() and fills in:
      payload["subject_line"]
      payload["intro_line"]
      payload[product]["explanation"]  for each product

    Returns the enriched payload.
    """
    language = LANGUAGE_NAMES.get(payload.get("user_language", "en"), "English")
    user_name = payload["user_name"].split()[0]  # first name only
    weather = payload["weather"]
    products_summary = [
        {
            "name": p["name"],
            "category": p.get("category", ""),
            "expiry_days": p.get("expiry_days", "?"),
            "discount_pct": p.get("discount_pct", 0),
            "purchase_count": next(
                (h["count"] for h in payload.get("purchase_history_hint", [])
                 if h["sku"] == p["sku"]),
                0,
            ),
        }
        for p in payload["products"]
    ]

    prompt = f"""Generate personalised email copy for ALDI Rescue in **{language}**.

User first name: {user_name}
City: {payload["user_city"]}
Weekend weather: {weather["description"]}

Products to rescue (JSON list):
{json.dumps(products_summary, ensure_ascii=False, indent=2)}

Return ONLY valid JSON with this exact shape (no markdown, no extra keys):
{{
  "subject_line": "<compelling subject line in {language}, max 60 chars>",
  "intro_line": "<1-2 sentence intro in {language}>",
  "explanations": {{
    "<product name>": "<one line why this product suits this user right now, in {language}>"
  }}
}}"""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=800,
        messages=[{"role": "user", "content": prompt}],
        system=SYSTEM_PROMPT,
    )

    raw = response.content[0].text.strip()

    # Strip markdown code fences if model adds them
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        copy = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"[ai_copy] JSON parse failed: {e}\nRaw: {raw}")
        copy = {
            "subject_line": f"{user_name}, great deals waiting for you!",
            "intro_line": "We found products that match your taste — at a rescue price.",
            "explanations": {},
        }

    payload["subject_line"] = copy.get("subject_line", "")
    payload["intro_line"] = copy.get("intro_line", "")

    explanations = copy.get("explanations", {})
    for product in payload["products"]:
        product["explanation"] = explanations.get(product["name"], "")

    return payload
