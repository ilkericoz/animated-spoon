"""
Person A owns this file.

Wraps the two nagya.app API endpoints:
  - GET /products  → list of near-expiry products
  - GET /users     → user purchase history / profile

TODO: replace BASE_URL and endpoint paths once confirmed with team.
"""

import httpx
import os
from typing import Any

BASE_URL = os.getenv("NAGYA_BASE_URL", "https://api.nagya.app")
API_KEY = os.getenv("NAGYA_API_KEY", "")


def _headers() -> dict:
    h = {"Content-Type": "application/json"}
    if API_KEY:
        h["Authorization"] = f"Bearer {API_KEY}"
    return h


def get_near_expiry_products() -> list[dict]:
    """
    GET api.nagya.app/products
    Returns a list of product dicts. Falls back to fixture data if API is down.
    """
    try:
        r = httpx.get(f"{BASE_URL}/products", headers=_headers(), timeout=5)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        print(f"[nagya] GET /products failed ({e}), using fixture")
        return _fixture_products()


def get_all_users() -> list[dict]:
    """
    GET api.nagya.app/users
    Returns a list of user dicts. Falls back to local users.json if API is down.
    """
    try:
        r = httpx.get(f"{BASE_URL}/users", headers=_headers(), timeout=5)
        r.raise_for_status()
        return r.json()
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
        # handle both {"user_id": ...} and {"id": ...} shapes
        if str(u.get("user_id") or u.get("id", "")) == str(user_id):
            return u
    return users[0] if users else _fixture_user(user_id)


# ── Fixture fallbacks ────────────────────────────────────────────────────────

def _fixture_products() -> list[dict]:
    """Local sample so the team can work without the live API."""
    return [
        {
            "sku": "4088600111001",
            "name": "Grillwürstchen",
            "category": "meat",
            "expiry_days": 2,
            "original_price": 3.99,
            "discount_pct": 40,
        },
        {
            "sku": "4088600111002",
            "name": "Kartoffelsalat",
            "category": "deli",
            "expiry_days": 2,
            "original_price": 2.49,
            "discount_pct": 35,
        },
        {
            "sku": "4088600111003",
            "name": "Bier 6-Pack",
            "category": "beverages",
            "expiry_days": 5,
            "original_price": 4.99,
            "discount_pct": 20,
        },
        {
            "sku": "4088600111004",
            "name": "Grillkohle",
            "category": "non-food",
            "expiry_days": 30,
            "original_price": 3.49,
            "discount_pct": 15,
        },
        {
            "sku": "4088600111005",
            "name": "Paprika-Dip",
            "category": "condiments",
            "expiry_days": 3,
            "original_price": 1.29,
            "discount_pct": 25,
        },
    ]


def _fixture_all_users() -> list[dict]:
    import json, pathlib
    path = pathlib.Path(__file__).parent.parent / "data" / "users.json"
    return json.loads(path.read_text())


def _fixture_user(user_id: str) -> dict:
    users = _fixture_all_users()
    for u in users:
        if str(u.get("user_id", "")) == str(user_id):
            return u
    return users[0]
