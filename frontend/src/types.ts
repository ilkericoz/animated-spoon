// ──────────────────────────────────────────────────────────────────────────
// Canonical shapes the UI consumes.
// The API still returns two overlapping shapes (legacy and frozen v1 contract),
// so `normalizePayload` in lib/api.ts reconciles them into these types.
// ──────────────────────────────────────────────────────────────────────────

export type User = {
  id: string | number
  name: string
  email?: string
  city?: string
  country?: string
  language?: string
  favorite_category?: string
  least_purchased_category?: string
}

export type Weather = {
  condition: string // "sunny" | "rainy" | "cloudy" | "cold" | "clear" | …
  temp_c: number
  description?: string
  city?: string
  weekend_day?: string
}

export type Product = {
  sku: string
  title: string
  category?: string
  expiration_date?: string
  days_until_expiry?: number
  urgency?: 1 | 2 | 3
  // prices are raw numbers — currency is decided by the UI based on user.country
  price: number
  discounted_price: number
  discount_pct: number
  chosen_discount_pct?: number
  units_at_risk?: number
  projected_units_rescued?: number
  projected_profit?: number
  economic_reasoning?: string
  ai_explanation?: string
  bundle_sku?: string | null
}

export type Bundle = {
  name: string
  skus: string[]
  bundle_discount_pct?: number
  bundle_price?: number
  original_total?: number
}

export type Totals = {
  projected_profit?: number
  projected_waste_saved_kg?: number
  projected_waste_value?: number
  projected_co2_saved_kg?: number
  // Currency code inferred from user.country when possible
  currency?: "HUF" | "EUR" | "GBP"
}

export type AiCopy = {
  subject_line?: string
  intro_line?: string
  send_time?: string
}

export type Payload = {
  user: User
  weather: Weather
  products: Product[]
  bundles: Bundle[]
  totals: Totals
  ai_copy: AiCopy
  raw: unknown // original response preserved for the JSON tab
}

export type Stats = {
  total_users?: number
  total_waste_saved_kg?: number
  total_co2_saved_kg?: number
}

export type SentRecord = {
  user_id: string | number
  user_email?: string
  message_id?: string
  sent_at?: string
  subject?: string
  status?: "sent" | "failed"
  error?: string
}

export type SwipeRecord = {
  user_id: string | number
  item_type: "category" | "product" | "bundle" | string
  item_id: string
  item_name: string
  liked: boolean
  timestamp?: string
}

export type SendResult =
  | {
      status: "sent"
      message_id?: string
      sent_at?: string
      user_email?: string
    }
  | { status: "failed"; error: string }
  | { status: "unavailable"; reason: string }
