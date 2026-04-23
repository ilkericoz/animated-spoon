"""
Person A owns this file.

Wraps the two nagya.app API endpoints and normalizes their payloads into shapes
the rest of the app can consume consistently.
"""

import json
import os
import pathlib
from typing import Any

import httpx

BASE_URL = os.getenv("NAGYA_BASE_URL", "https://api.nagya.app")
API_KEY = os.getenv("NAGYA_API_KEY", "")
DEFAULT_CITY = "Budapest"
DEFAULT_COUNTRY = "HU"
DEFAULT_LANGUAGE = "hu"


def _headers() -> dict:
    h = {"Content-Type": "application/json"}
    if API_KEY:
        h["Authorization"] = f"Bearer {API_KEY}"
    return h


def get_near_expiry_products() -> list[dict]:
    """
    GET api.nagya.app/products
    Returns normalized product dicts sorted by expiry. Falls back to fixture data
    if the API is down.
    """
    try:
        r = httpx.get(
            f"{BASE_URL}/products",
            params={"sort": "expiry"},
            headers=_headers(),
            timeout=5,
        )
        r.raise_for_status()
        return [_normalize_product(product) for product in _unwrap_data(r.json())]
    except Exception as e:
        print(f"[nagya] GET /products failed ({e}), using fixture")
        return [_normalize_product(product) for product in _fixture_products()]


def get_all_users() -> list[dict]:
    """
    GET api.nagya.app/users
    Returns normalized user dicts. Falls back to local users.json if API is down.
    """
    try:
        r = httpx.get(f"{BASE_URL}/users", headers=_headers(), timeout=5)
        r.raise_for_status()
        return [_normalize_user(user) for user in _unwrap_data(r.json())]
    except Exception as e:
        print(f"[nagya] GET /users failed ({e}), using fixture")
        return _fixture_all_users()


def get_user_history(user_id: str) -> dict:
    """
    Returns a single user dict from the /users list.
    Falls back to fixture data if API is down.
    """
    users = get_all_users()
    for u in users:
        if str(u.get("user_id") or u.get("id", "")) == str(user_id):
            return u
    return users[0] if users else _fixture_user(user_id)


def _unwrap_data(payload: Any) -> Any:
    if isinstance(payload, dict) and "data" in payload:
        return payload["data"]
    return payload


def _normalize_product(product: dict) -> dict:
    price = product.get("price") or {}
    stock = product.get("stock") or {}
    title = product.get("title") or product.get("name") or str(product.get("sku", "Product"))

    return {
        "id": product.get("id"),
        "sku": str(product.get("sku") or product.get("id") or ""),
        "name": title,
        "title": title,
        "category": product.get("category", ""),
        "description": product.get("description", ""),
        "nutrition": product.get("nutrition"),
        "allergens": product.get("allergens", []),
        "expiration_date": product.get("expiration_date"),
        "original_price": int(price.get("value", product.get("original_price", 0)) or 0),
        "cost_price": int(price.get("cost_price", product.get("cost_price", 0)) or 0),
        "bottle_deposit": int(price.get("bottle_deposit", product.get("bottle_deposit", 0)) or 0),
        "stock_current": int(stock.get("current", product.get("stock_current", product.get("stock", 0))) or 0),
        "last_7_day_sold": int(stock.get("last_7_day_sold", product.get("last_7_day_sold", 0)) or 0),
    }


def _normalize_user(user: dict) -> dict:
    user_id = str(user.get("user_id") or user.get("id") or "")
    return {
        **user,
        "id": user.get("id", user_id),
        "user_id": user_id,
        "name": user.get("name", "Customer"),
        "email": user.get("email", ""),
        "favorite_category": user.get("favorite_category", ""),
        "least_purchased_category": user.get("least_purchased_category", ""),
        "city": user.get("city") or DEFAULT_CITY,
        "country": user.get("country") or DEFAULT_COUNTRY,
        "language": user.get("language") or DEFAULT_LANGUAGE,
    }


# ── Fixture fallbacks ────────────────────────────────────────────────────────

def _fixture_products() -> list[dict]:
    """Local sample so the team can work without the live API."""
    return [
        {
            "sku": "4088600111001",
            "name": "Grillwürstchen",
            "title": "Grillwürstchen",
            "category": "meat",
            "expiration_date": "2026-04-25",
            "original_price": 399,
            "cost_price": 249,
            "stock_current": 24,
            "last_7_day_sold": 18,
        },
        {
            "sku": "4088600111002",
            "name": "Kartoffelsalat",
            "title": "Kartoffelsalat",
            "category": "deli",
            "expiration_date": "2026-04-25",
            "original_price": 249,
            "cost_price": 152,
            "stock_current": 19,
            "last_7_day_sold": 10,
        },
        {
            "sku": "4088600111003",
            "name": "Bier 6-Pack",
            "title": "Bier 6-Pack",
            "category": "beverages",
            "expiration_date": "2026-04-26",
            "original_price": 499,
            "cost_price": 319,
            "stock_current": 20,
            "last_7_day_sold": 8,
        },
        {
            "sku": "4088600111004",
            "name": "Grillkohle",
            "title": "Grillkohle",
            "category": "non-food",
            "expiration_date": "2026-04-26",
            "original_price": 349,
            "cost_price": 210,
            "stock_current": 16,
            "last_7_day_sold": 7,
        },
        {
            "sku": "4088600111005",
            "name": "Paprika-Dip",
            "title": "Paprika-Dip",
            "category": "condiments",
            "expiration_date": "2026-04-24",
            "original_price": 129,
            "cost_price": 84,
            "stock_current": 18,
            "last_7_day_sold": 9,
        },
    ]


def _fixture_all_users() -> list[dict]:
    path = pathlib.Path(__file__).parent.parent / "data" / "users.json"
    return [_normalize_user(user) for user in json.loads(path.read_text())]


def _fixture_user(user_id: str) -> dict:
    users = _fixture_all_users()
    for u in users:
        if str(u.get("user_id", "")) == str(user_id):
            return u
    return users[0]
