"""
Person A owns this file.

Core logic: ranks products by urgency, finds bundles, and assembles the
full payload dict that every other module consumes.

Exposes one public function:
    generate_email_payload(user_id: str) -> dict
"""

from backend.nagya_client import get_near_expiry_products, get_user_history
from backend.weather import get_weekend_forecast

# ── Constants ────────────────────────────────────────────────────────────────

URGENCY_MAP = {1: 1, 2: 2, 3: 3}   # expiry_days -> urgency score (1=low, 3=critical)

# Categories that pair well together for bundles
BUNDLE_PAIRS = [
    {"meat", "beverages"},
    {"meat", "condiments"},
    {"meat", "deli"},
    {"dairy", "bakery"},
    {"bakery", "deli"},
]

CO2_PER_KG_FOOD_WASTE = 2.5   # kg CO2 saved per kg food rescued (WRAP estimate)
AVG_PRODUCT_WEIGHT_KG = 0.4   # rough average weight per product unit


# ── Main entry point ─────────────────────────────────────────────────────────

def generate_email_payload(user_id: str) -> dict:
    """
    Assembles everything the email needs for one user.

    Returns a dict matching the shape of data/fixture.json.
    """
    user = get_user_history(user_id)
    products = get_near_expiry_products()
    weather = get_weekend_forecast(user.get("city", "Berlin"))

    ranked = _rank_products(products, user, weather)
    top = ranked[:10]
    bundles = _find_bundles(top)

    waste_kg = round(len(top) * AVG_PRODUCT_WEIGHT_KG, 2)
    co2_kg = round(waste_kg * CO2_PER_KG_FOOD_WASTE, 2)

    return {
        "user_id": user_id,
        "user_name": user.get("name", "Customer"),
        "user_city": user.get("city", ""),
        "user_country": user.get("country", ""),
        "user_language": user.get("language", "en"),
        "weather": weather,
        "products": top,
        "bundles": bundles,
        # subject_line and intro_line are filled in by ai_copy.py
        "subject_line": "",
        "intro_line": "",
        "waste_saved_kg": waste_kg,
        "co2_saved_kg": co2_kg,
        "send_time": _optimal_send_time(weather),
    }


# ── Ranking ──────────────────────────────────────────────────────────────────

def _urgency(expiry_days: int) -> int:
    if expiry_days <= 1:
        return 3
    if expiry_days <= 3:
        return 2
    return 1


def _purchase_affinity(product: dict, user: dict) -> float:
    """Boost score if user has bought this category/sku before."""
    history = {h["sku"]: h["count"] for h in user.get("purchase_history", [])}
    sku = product.get("sku", "")
    if sku in history:
        return min(history[sku] / 3.0, 1.5)   # cap at 1.5x boost
    return 1.0


def _weather_affinity(product: dict, weather: dict) -> float:
    """Boost grill/bbq products on sunny/hot days."""
    if weather.get("forecast") == "sunny" and weather.get("temp_max", 0) >= 22:
        if product.get("category") in ("meat", "beverages"):
            return 1.3
    if weather.get("forecast") == "rainy":
        if product.get("category") in ("bakery", "dairy", "deli"):
            return 1.2
    return 1.0


def _rank_products(products: list[dict], user: dict, weather: dict) -> list[dict]:
    scored = []
    for p in products:
        urgency = _urgency(p.get("expiry_days", 99))
        score = (
            urgency * 10
            + p.get("discount_pct", 0) * 0.3
        ) * _purchase_affinity(p, user) * _weather_affinity(p, weather)

        scored.append({
            **p,
            "urgency": urgency,
            "discounted_price": round(
                p.get("original_price", 0) * (1 - p.get("discount_pct", 0) / 100), 2
            ),
            "explanation": "",   # filled by ai_copy.py
            "bundle_sku": None,
            "_score": score,
        })

    return sorted(scored, key=lambda x: x["_score"], reverse=True)


# ── Bundle detection ─────────────────────────────────────────────────────────

def _find_bundles(products: list[dict]) -> list[dict]:
    """
    Find complementary pairs that are both expiring soon and suggest a bundle.
    """
    bundles = []
    used = set()

    for i, a in enumerate(products):
        if a["sku"] in used:
            continue
        for j, b in enumerate(products):
            if i == j or b["sku"] in used:
                continue
            pair = {a.get("category", ""), b.get("category", "")}
            if pair in BUNDLE_PAIRS and a["urgency"] >= 2 and b["urgency"] >= 2:
                bundle_price = round((a["discounted_price"] + b["discounted_price"]) * 0.85, 2)
                orig_total = a["original_price"] + b["original_price"]
                bundles.append({
                    "name": f"{a['name']} + {b['name']} Bundle",
                    "skus": [a["sku"], b["sku"]],
                    "original_total": round(orig_total, 2),
                    "bundle_price": bundle_price,
                    "bundle_discount_pct": round((1 - bundle_price / orig_total) * 100),
                })
                # mark both SKUs in top products as bundled
                for p in products:
                    if p["sku"] == b["sku"]:
                        a["bundle_sku"] = b["sku"]
                used.update([a["sku"], b["sku"]])
                break

    return bundles[:3]   # surface at most 3 bundles


# ── Send time ────────────────────────────────────────────────────────────────

def _optimal_send_time(weather: dict) -> str:
    if weather.get("forecast") in ("sunny", "cloudy"):
        return "Saturday 09:00"
    return "Friday 18:00"
