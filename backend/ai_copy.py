"""
Person B owns this file.

Makes ONE Claude API call per user to generate:
  - subject_line
  - intro_line
  - per-product explanation blurbs (all in one batch)

This module is intentionally compatibility-first so it can work with both the
older payload shape and the newer nested contract during integration.
"""

import json
import os

import anthropic

DEFAULT_OUTPUT_LANGUAGE = os.getenv("AI_COPY_LANGUAGE", "English")

SYSTEM_PROMPT = """You are the copywriter for ALDI Rescue, ALDI's food-waste reduction campaign.
Write concise marketing copy grounded only in the provided facts.
Use a friendly, warm, helpful tone. Never invent purchase history, preferences, or product facts.
Keep every line short and natural. No markdown. No bullet points."""


def enrich_payload_with_copy(payload: dict) -> dict:
    """
    Takes the payload from generate_email_payload() and fills in:
      payload["subject_line"] / payload["ai_copy"]["subject_line"]
      payload["intro_line"] / payload["ai_copy"]["intro_line"]
      payload[product]["explanation"] / payload[product]["ai_explanation"]

    Returns the enriched payload.
    """
    context = _normalize_copy_context(payload)
    copy = _generate_copy(context)
    _apply_copy_to_payload(payload, context, copy)
    payload.pop("purchase_history_hint", None)
    return payload


def _normalize_copy_context(payload: dict) -> dict:
    user = payload.get("user", {}) if isinstance(payload.get("user"), dict) else {}
    weather = payload.get("weather", {}) if isinstance(payload.get("weather"), dict) else {}

    full_name = _first_non_empty(
        user.get("name"),
        payload.get("user_name"),
        "Customer",
    )
    products = []
    for index, product in enumerate(payload.get("products", []), start=1):
        title = _first_non_empty(product.get("title"), product.get("name"), f"Product {index}")
        key = _first_non_empty(product.get("sku"), product.get("id"), title)
        products.append(
            {
                "key": str(key),
                "title": title,
                "category": _first_non_empty(product.get("category"), "General"),
                "discount_pct": _coerce_int(
                    _first_non_empty(product.get("chosen_discount_pct"), product.get("discount_pct"), 0)
                ),
                "reasoning": _first_non_empty(
                    product.get("economic_reasoning"),
                    product.get("reasoning"),
                    "",
                ),
            }
        )

    return {
        "user_name": full_name,
        "user_first_name": full_name.split()[0],
        "favorite_category": _first_non_empty(
            user.get("favorite_category"),
            payload.get("favorite_category"),
            "",
        ),
        "least_purchased_category": _first_non_empty(
            user.get("least_purchased_category"),
            payload.get("least_purchased_category"),
            "",
        ),
        "city": _first_non_empty(
            weather.get("city"),
            payload.get("user_city"),
            "Budapest",
        ),
        "weather_condition": _first_non_empty(
            weather.get("condition"),
            weather.get("forecast"),
            weather.get("description"),
            "mild",
        ),
        "weather_temp_c": _first_non_empty(
            weather.get("temp_c"),
            weather.get("temp_max"),
            "",
        ),
        "weather_description": _first_non_empty(
            weather.get("description"),
            "",
        ),
        "products": products,
        "language": DEFAULT_OUTPUT_LANGUAGE,
    }


def _generate_copy(context: dict) -> dict:
    client = _get_client()
    if client is None:
        return _fallback_copy(context)

    system_prompt, user_prompt = _build_prompts(context)
    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=800,
            messages=[{"role": "user", "content": user_prompt}],
            system=system_prompt,
        )
        raw = _strip_code_fences(response.content[0].text.strip())
        copy = json.loads(raw)
    except Exception as exc:
        print(f"[ai_copy] Falling back after Claude/parsing failure: {exc}")
        return _fallback_copy(context)

    explanations = copy.get("explanations", {})
    if not isinstance(explanations, dict):
        explanations = {}

    subject_line = _limit_text(copy.get("subject_line", ""), 60)
    intro_line = _limit_text(copy.get("intro_line", ""), 160)

    if not subject_line or context["user_first_name"].lower() not in subject_line.lower():
        subject_line = _fallback_copy(context)["subject_line"]
    if not intro_line:
        intro_line = _fallback_copy(context)["intro_line"]

    normalized_explanations = {}
    for product in context["products"]:
        text = explanations.get(product["key"], "")
        if not text:
            text = _fallback_explanation(product, context)
        normalized_explanations[product["key"]] = _limit_words(text, 20)

    return {
        "subject_line": subject_line,
        "intro_line": intro_line,
        "explanations": normalized_explanations,
    }


def _build_prompts(context: dict) -> tuple[str, str]:
    products_json = json.dumps(context["products"], ensure_ascii=False, indent=2)
    weather_summary = context["weather_description"]
    if not weather_summary:
        temp = f"{context['weather_temp_c']}°C" if context["weather_temp_c"] != "" else "unknown temperature"
        weather_summary = f"{context['weather_condition']} in {context['city']} at {temp}"

    system_prompt = f"""{SYSTEM_PROMPT}
Output language: {context['language']}.
Return valid JSON only.
Required JSON shape:
{{
  "subject_line": "string",
  "intro_line": "string",
  "explanations": {{
    "<product key>": "string"
  }}
}}
Rules:
- Subject line must be under 60 characters and include the user's first name.
- Intro line must be 1-2 short sentences and mention the weather.
- Each product explanation must stay under 20 words.
- Each product explanation must reference either category fit or weather, not both.
- Do not mention purchase history because it is not available.
- Do not invent discounts, prices, or product facts beyond the input."""

    user_prompt = f"""Create ALDI Rescue email copy using only the facts below.

User first name: {context['user_first_name']}
Favorite category: {context['favorite_category'] or 'unknown'}
Least purchased category: {context['least_purchased_category'] or 'unknown'}
City: {context['city']}
Weather: {weather_summary}

Chosen products:
{products_json}

Return explanations keyed by each product's "key" value."""

    return system_prompt, user_prompt


def _apply_copy_to_payload(payload: dict, context: dict, copy: dict) -> None:
    payload["subject_line"] = copy["subject_line"]
    payload["intro_line"] = copy["intro_line"]
    payload.setdefault("ai_copy", {})
    payload["ai_copy"]["subject_line"] = copy["subject_line"]
    payload["ai_copy"]["intro_line"] = copy["intro_line"]

    explanations = copy.get("explanations", {})
    for product in payload.get("products", []):
        key = str(_first_non_empty(product.get("sku"), product.get("id"), product.get("title"), product.get("name"), ""))
        title = _first_non_empty(product.get("title"), product.get("name"), "this pick")
        text = explanations.get(key, "")
        if not text:
            text = _fallback_explanation(
                {
                    "title": title,
                    "category": _first_non_empty(product.get("category"), "General"),
                    "discount_pct": _coerce_int(
                        _first_non_empty(product.get("chosen_discount_pct"), product.get("discount_pct"), 0)
                    ),
                },
                context,
            )
        product["explanation"] = text
        product["ai_explanation"] = text


def _fallback_copy(context: dict) -> dict:
    first_name = context["user_first_name"]
    weather_phrase = _weather_phrase(context)
    return {
        "subject_line": _limit_text(f"{first_name}, your rescue picks are here", 60),
        "intro_line": f"{weather_phrase} We picked a few timely offers for you this weekend.",
        "explanations": {
            product["key"]: _fallback_explanation(product, context)
            for product in context["products"]
        },
    }


def _fallback_explanation(product: dict, context: dict) -> str:
    if (
        context["favorite_category"]
        and str(product.get("category", "")).lower() == str(context["favorite_category"]).lower()
    ):
        return _limit_words("Matches your favorite category.", 20)
    if product.get("discount_pct"):
        return _limit_words(f"A timely pick with {product['discount_pct']}% off.", 20)
    return _limit_words("A timely rescue pick for the weekend.", 20)


def _weather_phrase(context: dict) -> str:
    temp = context["weather_temp_c"]
    condition = context["weather_condition"]
    if temp != "":
        return f"Weekend weather looks {condition} at {temp}°C."
    return f"Weekend weather looks {condition}."


def _get_client():
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        print("[ai_copy] ANTHROPIC_API_KEY is missing, using fallback copy.")
        return None
    return anthropic.Anthropic(api_key=api_key)


def _strip_code_fences(raw: str) -> str:
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return raw.strip()


def _first_non_empty(*values):
    for value in values:
        if value is None:
            continue
        if isinstance(value, str) and not value.strip():
            continue
        return value
    return ""


def _coerce_int(value) -> int:
    try:
        return int(round(float(value)))
    except (TypeError, ValueError):
        return 0


def _limit_text(text: str, max_chars: int) -> str:
    text = " ".join(str(text).split())
    if len(text) <= max_chars:
        return text
    trimmed = text[: max_chars - 1].rstrip(" ,.-")
    return f"{trimmed}…"


def _limit_words(text: str, max_words: int) -> str:
    words = str(text).split()
    if len(words) <= max_words:
        return " ".join(words)
    return " ".join(words[:max_words]).rstrip(" ,.-") + "…"
