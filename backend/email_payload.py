"""
Person A owns this file.

Core logic: ranks products by urgency, finds bundles, and assembles the
full payload dict that every other module consumes.

Exposes one public function:
    generate_email_payload(user_id: str) -> dict
"""

import re
from datetime import date

from backend.nagya_client import get_near_expiry_products, get_user_history
from backend.weather import get_weekend_forecast

# ── Constants ────────────────────────────────────────────────────────────────

DISCOUNT_BY_EXPIRY_DAYS = {3: 0, 2: 20, 1: 50}
URGENCY_BY_EXPIRY_DAYS = {3: 1, 2: 2, 1: 3}
RESCUE_RATE_BY_DISCOUNT = {0: 0.25, 20: 0.55, 50: 0.85}
CO2_PER_KG_FOOD_WASTE = 2.5
AVG_PRODUCT_WEIGHT_KG = 0.4

BUNDLE_RULES = [
    {"name": "Weekend Grill Bundle", "pair": frozenset({"grilling food", "grilling non-food"})},
    {"name": "Weekend Grill Bundle", "pair": frozenset({"grilling food", "soft drinks"})},
    {"name": "Weekend Grill Bundle", "pair": frozenset({"grilling food", "bottled drinks"})},
    {"name": "Weekend Grill Bundle", "pair": frozenset({"grilling food", "alcoholic beverages"})},
    {"name": "BBQ Burger Bundle", "pair": frozenset({"grilling food", "bakery"})},
    {"name": "Breakfast Rescue Bundle", "pair": frozenset({"bakery", "dairy"})},
    {"name": "Fresh Table Bundle", "pair": frozenset({"vegetables", "dairy"})},
    {"name": "Fresh Table Bundle", "pair": frozenset({"vegetables", "bakery"})},
    {"name": "Weekend Grill Bundle", "pair": frozenset({"meat", "beverages"})},
    {"name": "Weekend Grill Bundle", "pair": frozenset({"meat", "condiments"})},
    {"name": "Weekend Grill Bundle", "pair": frozenset({"meat", "non-food"})},
    {"name": "Breakfast Rescue Bundle", "pair": frozenset({"bakery", "dairy"})},
]

ADD_ON_BUNDLE_DISCOUNT_PCT = 10
ADD_ON_COMPANION_CATEGORIES = {
    "grilling food": {"grilling non-food", "soft drinks", "bottled drinks", "bakery", "vegetables"},
    "vegetables": {"dairy", "bakery", "soft drinks"},
    "bakery": {"dairy", "sweets", "soft drinks"},
    "dairy": {"bakery", "vegetables", "sweets"},
    "sweets": {"soft drinks", "bottled drinks", "bakery"},
}

SUNNY_WEATHER_CATEGORIES = {
    "grilling food",
    "grilling non-food",
    "soft drinks",
    "bottled drinks",
    "alcoholic beverages",
    "meat",
    "beverages",
    "non-food",
}
COOL_WEATHER_CATEGORIES = {
    "bakery",
    "dairy",
    "sweets",
    "pasta & grains",
    "vegetables",
    "deli",
}


# ── Main entry point ─────────────────────────────────────────────────────────

def generate_email_payload(user_id: str) -> dict:
    """
    Assembles everything the email needs for one user.

    Returns a dict matching the shape of data/fixture.json.
    """
    user = get_user_history(user_id)
    weather = get_weekend_forecast(user.get("city", "Budapest"))
    catalog = get_near_expiry_products()
    candidates = _prepare_products(catalog)
    ranked = _rank_products(candidates, user, weather)
    top = ranked[:10]
    bundles = _find_bundles(top, catalog, user, weather)
    totals = _calculate_totals(top)

    return {
        "user_id": user.get("user_id", str(user_id)),
        "user_name": user.get("name", "Customer"),
        "user_email": user.get("email", ""),
        "user_city": user.get("city", ""),
        "user_country": user.get("country", ""),
        "user_language": user.get("language", "hu"),
        "favorite_category": user.get("favorite_category", ""),
        "least_purchased_category": user.get("least_purchased_category", ""),
        "weather": weather,
        "products": top,
        "bundles": bundles,
        # subject_line and intro_line are filled in by ai_copy.py
        "subject_line": "",
        "intro_line": "",
        "waste_saved_kg": totals["projected_waste_saved_kg"],
        "co2_saved_kg": totals["projected_co2_saved_kg"],
        "totals": totals,
        "send_time": _optimal_send_time(weather),
    }


def _prepare_products(products: list[dict]) -> list[dict]:
    prepared = []

    for product in products:
        days_until_expiry = _days_until_expiry(product.get("expiration_date"))
        if days_until_expiry not in DISCOUNT_BY_EXPIRY_DAYS:
            continue

        discount_pct = DISCOUNT_BY_EXPIRY_DAYS[days_until_expiry]
        original_price = int(product.get("original_price", 0) or 0)
        cost_price = int(product.get("cost_price", 0) or 0)
        stock_current = int(product.get("stock_current", 0) or 0)
        last_7_day_sold = int(product.get("last_7_day_sold", 0) or 0)
        discounted_price = int(round(original_price * (1 - discount_pct / 100)))
        units_at_risk = _estimate_units_at_risk(stock_current, last_7_day_sold, days_until_expiry)

        if units_at_risk <= 0:
            continue

        projected_units_rescued = _estimate_units_rescued(units_at_risk, discount_pct)
        projected_profit_huf = (discounted_price - cost_price) * projected_units_rescued

        prepared.append(
            {
                "id": product.get("id"),
                "sku": product.get("sku", ""),
                "name": product.get("name") or product.get("title") or "Product",
                "title": product.get("title") or product.get("name") or "Product",
                "category": product.get("category", ""),
                "expiration_date": product.get("expiration_date"),
                "expiry_days": days_until_expiry,
                "days_until_expiry": days_until_expiry,
                "highlight": days_until_expiry == 3,
                "urgency": URGENCY_BY_EXPIRY_DAYS[days_until_expiry],
                "original_price": original_price,
                "price_huf": original_price,
                "cost_price": cost_price,
                "cost_price_huf": cost_price,
                "discount_pct": discount_pct,
                "chosen_discount_pct": discount_pct,
                "discounted_price": discounted_price,
                "discounted_price_huf": discounted_price,
                "stock": stock_current,
                "stock_current": stock_current,
                "last_7_day_sold": last_7_day_sold,
                "units_at_risk": units_at_risk,
                "projected_units_rescued": projected_units_rescued,
                "projected_profit_huf": projected_profit_huf,
                "economic_reasoning": "",
                "explanation": "",
                "ai_explanation": "",
                "bundle_sku": None,
                "_score": 0.0,
            }
        )

    return prepared


# ── Ranking ──────────────────────────────────────────────────────────────────

def _days_until_expiry(expiration_date: str | None) -> int | None:
    if not expiration_date:
        return None

    try:
        expiry = date.fromisoformat(expiration_date)
    except ValueError:
        return None

    return (expiry - date.today()).days


def _category_key(value: str | None) -> str:
    return (value or "").strip().lower()


def _category_affinity(product: dict, user: dict) -> float:
    score = 0.0
    product_category = _category_key(product.get("category"))

    if product_category and product_category == _category_key(user.get("favorite_category")):
        score += 4.0
    if product_category and product_category == _category_key(user.get("least_purchased_category")):
        score -= 4.0

    return score


def _weather_affinity(product: dict, weather: dict) -> float:
    category = _category_key(product.get("category"))
    forecast = weather.get("forecast")
    temp_max = weather.get("temp_max", 0)

    if forecast == "sunny" and temp_max >= 22 and category in SUNNY_WEATHER_CATEGORIES:
        return 2.0
    if forecast in {"rainy", "cold"} and category in COOL_WEATHER_CATEGORIES:
        return 2.0
    if forecast == "cloudy" and category in {"bakery", "dairy", "vegetables"}:
        return 1.0
    return 0.0


def _tie_break_score(product: dict, user: dict, weather: dict) -> float:
    stock_pressure = min(product.get("units_at_risk", 0), 30) / 5
    sales_signal = min(product.get("last_7_day_sold", 0), 70) / 20
    return round(_category_affinity(product, user) + _weather_affinity(product, weather) + stock_pressure + sales_signal, 2)


def _rank_products(products: list[dict], user: dict, weather: dict) -> list[dict]:
    scored = []
    for product in products:
        score = _tie_break_score(product, user, weather)
        product["_score"] = score
        product["economic_reasoning"] = _economic_reasoning(product)
        scored.append(product)

    return sorted(
        scored,
        key=lambda product: (
            product.get("days_until_expiry", 99),
            -product.get("_score", 0),
            -product.get("units_at_risk", 0),
            -product.get("stock", 0),
            product.get("name", ""),
        ),
    )


# ── Bundle detection ─────────────────────────────────────────────────────────

def _find_bundles(products: list[dict], catalog: list[dict], user: dict, weather: dict) -> list[dict]:
    """
    Prefer rescue + companion add-on bundles, then fall back to rescue-only pairs.
    """
    bundles = _find_add_on_bundles(products, catalog, user, weather)
    if bundles:
        return bundles[:3]

    bundles = []
    used = set()

    for i, a in enumerate(products):
        if a["sku"] in used:
            continue
        for j, b in enumerate(products):
            if i == j or b["sku"] in used:
                continue
            pair = frozenset({_category_key(a.get("category")), _category_key(b.get("category"))})
            rule = next((rule for rule in BUNDLE_RULES if rule["pair"] == pair), None)
            if rule:
                bundle_price = int(round((a["discounted_price"] + b["discounted_price"]) * 0.85))
                orig_total = a["original_price"] + b["original_price"]
                bundles.append({
                    "name": rule["name"],
                    "skus": [a["sku"], b["sku"]],
                    "original_total": orig_total,
                    "bundle_price": bundle_price,
                    "bundle_discount_pct": round((1 - bundle_price / orig_total) * 100),
                })
                a["bundle_sku"] = b["sku"]
                b["bundle_sku"] = a["sku"]
                used.update([a["sku"], b["sku"]])
                break

    return bundles[:3]   # surface at most 3 bundles


def _find_add_on_bundles(products: list[dict], catalog: list[dict], user: dict, weather: dict) -> list[dict]:
    bundles = []
    used_rescue_skus = set()
    used_companion_skus = set()
    rescue_skus = {product["sku"] for product in products}

    for rescue_product in products:
        if rescue_product["sku"] in used_rescue_skus:
            continue

        companion = _pick_best_companion(rescue_product, catalog, user, weather, rescue_skus, used_companion_skus)
        if not companion:
            continue

        companion_discounted_price = int(round(companion["original_price"] * (1 - ADD_ON_BUNDLE_DISCOUNT_PCT / 100)))
        original_total = rescue_product["original_price"] + companion["original_price"]
        bundle_price = rescue_product["discounted_price"] + companion_discounted_price

        bundles.append(
            {
                "name": f"{rescue_product['name']} + {companion['name']} Bundle",
                "skus": [rescue_product["sku"], companion["sku"]],
                "original_total": original_total,
                "bundle_price": bundle_price,
                "bundle_discount_pct": round((1 - bundle_price / original_total) * 100),
            }
        )
        rescue_product["bundle_sku"] = companion["sku"]
        used_rescue_skus.add(rescue_product["sku"])
        used_companion_skus.add(companion["sku"])

        if len(bundles) == 3:
            break

    return bundles


def _pick_best_companion(
    rescue_product: dict,
    catalog: list[dict],
    user: dict,
    weather: dict,
    rescue_skus: set[str],
    used_companion_skus: set[str],
) -> dict | None:
    scored_candidates = []

    for candidate in catalog:
        sku = candidate.get("sku", "")
        if not sku or sku in rescue_skus or sku in used_companion_skus:
            continue

        days_until_expiry = _days_until_expiry(candidate.get("expiration_date"))
        if days_until_expiry is not None and days_until_expiry <= 3:
            continue

        stock_current = int(candidate.get("stock_current", 0) or 0)
        if stock_current < 10:
            continue

        original_price = int(candidate.get("original_price", 0) or 0)
        cost_price = int(candidate.get("cost_price", 0) or 0)
        discounted_price = int(round(original_price * (1 - ADD_ON_BUNDLE_DISCOUNT_PCT / 100)))
        if discounted_price < cost_price:
            continue

        score = _companion_score(rescue_product, candidate, user, weather, stock_current)
        if score <= 0:
            continue

        scored_candidates.append((score, candidate))

    if not scored_candidates:
        return None

    scored_candidates.sort(
        key=lambda item: (
            -item[0],
            -int(item[1].get("stock_current", 0) or 0),
            item[1].get("name") or item[1].get("title") or "",
        )
    )
    return scored_candidates[0][1]


def _companion_score(rescue_product: dict, candidate: dict, user: dict, weather: dict, stock_current: int) -> float:
    rescue_category = _category_key(rescue_product.get("category"))
    candidate_category = _category_key(candidate.get("category"))
    favorite_category = _category_key(user.get("favorite_category"))
    least_category = _category_key(user.get("least_purchased_category"))
    allowed_categories = ADD_ON_COMPANION_CATEGORIES.get(rescue_category, set())

    score = 0.0

    if candidate_category in allowed_categories:
        score += 4.0
    if candidate_category == favorite_category:
        score += 3.0
    if candidate_category == least_category:
        score -= 4.0

    if weather.get("forecast") == "sunny" and candidate_category in {"grilling non-food", "soft drinks", "bottled drinks"}:
        score += 2.0
    if weather.get("forecast") in {"cloudy", "rainy", "cold"} and candidate_category in {"bakery", "dairy", "sweets"}:
        score += 1.5

    score += min(stock_current, 80) / 20
    return round(score, 2)


def _estimate_units_at_risk(stock_current: int, last_7_day_sold: int, days_until_expiry: int) -> int:
    projected_base_sales = round((last_7_day_sold / 7) * days_until_expiry)
    return max(stock_current - projected_base_sales, 0)


def _estimate_units_rescued(units_at_risk: int, discount_pct: int) -> int:
    if units_at_risk <= 0:
        return 0

    rescue_rate = RESCUE_RATE_BY_DISCOUNT[discount_pct]
    return max(1, round(units_at_risk * rescue_rate))


def _estimate_unit_weight_kg(product: dict) -> float:
    title = product.get("title") or product.get("name") or ""
    patterns = [
        (r"(\d+(?:[.,]\d+)?)\s*kg\b", 1.0),
        (r"(\d+(?:[.,]\d+)?)\s*g\b", 0.001),
        (r"(\d+(?:[.,]\d+)?)\s*ml\b", 0.001),
        (r"(\d+(?:[.,]\d+)?)\s*(?:l|litre|liter)\b", 1.0),
    ]

    for pattern, multiplier in patterns:
        match = re.search(pattern, title, re.IGNORECASE)
        if match:
            return round(float(match.group(1).replace(",", ".")) * multiplier, 3)

    return AVG_PRODUCT_WEIGHT_KG


def _economic_reasoning(product: dict) -> str:
    margin_per_unit = product["discounted_price"] - product["cost_price"]
    margin_label = "above" if margin_per_unit >= 0 else "below"
    return (
        f"Expires in {product['days_until_expiry']} day(s), so the fixed tier is "
        f"{product['discount_pct']}%. About {product['units_at_risk']} units are at risk; "
        f"this offer is projected to rescue {product['projected_units_rescued']}. "
        f"Margin per rescued unit stays {margin_label} cost by {abs(margin_per_unit)} HUF."
    )


def _calculate_totals(products: list[dict]) -> dict:
    projected_profit_huf = sum(product.get("projected_profit_huf", 0) for product in products)
    projected_waste_saved_kg = round(
        sum(_estimate_unit_weight_kg(product) * product.get("projected_units_rescued", 0) for product in products),
        2,
    )
    projected_waste_value_huf = sum(
        product.get("cost_price_huf", 0) * product.get("projected_units_rescued", 0)
        for product in products
    )
    projected_co2_saved_kg = round(projected_waste_saved_kg * CO2_PER_KG_FOOD_WASTE, 2)

    return {
        "projected_profit_huf": projected_profit_huf,
        "projected_waste_saved_kg": projected_waste_saved_kg,
        "projected_waste_value_huf": projected_waste_value_huf,
        "projected_co2_saved_kg": projected_co2_saved_kg,
    }


# ── Send time ────────────────────────────────────────────────────────────────

def _optimal_send_time(weather: dict) -> str:
    if weather.get("forecast") in ("sunny", "cloudy"):
        return "Saturday 09:00"
    return "Friday 18:00"
