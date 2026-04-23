import type {
  Payload,
  Product,
  SendResult,
  SentRecord,
  Stats,
  User,
} from "@/types"
import { inferCurrency, urgencyFromDays } from "@/lib/format"

export const API_BASE =
  (import.meta as unknown as { env: Record<string, string | undefined> }).env
    .VITE_API_BASE ?? "http://localhost:8000"

class HttpError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json" },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new HttpError(res.status, text || res.statusText)
  }
  return (await res.json()) as T
}

// ─── Users ────────────────────────────────────────────────────────────────
export async function getUsers(): Promise<User[]> {
  const raw = await request<Array<Record<string, unknown>>>("/users")
  return raw.map(normalizeUser)
}

function normalizeUser(u: Record<string, unknown>): User {
  return {
    id: (u.user_id ?? u.id) as string | number,
    name: (u.name ?? u.user_name ?? "Unknown") as string,
    email: u.email as string | undefined,
    city: (u.city ?? u.user_city) as string | undefined,
    country: (u.country ?? u.user_country) as string | undefined,
    language: (u.language ?? u.user_language) as string | undefined,
    favorite_category: u.favorite_category as string | undefined,
    least_purchased_category: u.least_purchased_category as string | undefined,
  }
}

// ─── Stats ────────────────────────────────────────────────────────────────
export async function getStats(): Promise<Stats> {
  return request<Stats>("/stats")
}

// ─── Generate ─────────────────────────────────────────────────────────────
export async function generate(
  userId: string | number,
  useAi: boolean,
): Promise<Payload> {
  const raw = await request<Record<string, unknown>>(
    `/generate/${userId}?use_ai=${useAi}`,
    { method: "POST" },
  )
  return normalizePayload(raw)
}

// ─── Email HTML preview ───────────────────────────────────────────────────
export async function getEmailHtml(
  userId: string | number,
  useAi: boolean,
): Promise<string> {
  const res = await fetch(
    `${API_BASE}/email/${userId}?use_ai=${useAi}`,
  )
  if (!res.ok) throw new HttpError(res.status, res.statusText)
  return res.text()
}

// ─── PDF URL ──────────────────────────────────────────────────────────────
export function pdfUrl(userId: string | number, useAi = false) {
  return `${API_BASE}/pdf/${userId}?use_ai=${useAi}`
}

// ─── Send (may 404 until Agent B ships it) ────────────────────────────────
export async function send(userId: string | number): Promise<SendResult> {
  try {
    const r = await fetch(`${API_BASE}/send/${userId}`, { method: "POST" })
    if (r.status === 404 || r.status === 405) {
      return {
        status: "unavailable",
        reason: "Send endpoint not deployed yet",
      }
    }
    if (!r.ok) {
      const error = await r.text().catch(() => r.statusText)
      return { status: "failed", error: error || `HTTP ${r.status}` }
    }
    const body = await r.json().catch(() => ({}))
    return {
      status: "sent",
      message_id: body.message_id,
      sent_at: body.sent_at,
      user_email: body.user_email,
    }
  } catch (e) {
    return {
      status: "failed",
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

export async function getSent(): Promise<
  { available: true; records: SentRecord[] } | { available: false }
> {
  try {
    const r = await fetch(`${API_BASE}/sent`)
    if (r.status === 404 || r.status === 405) return { available: false }
    if (!r.ok) return { available: false }
    const records = (await r.json()) as SentRecord[]
    return { available: true, records }
  } catch {
    return { available: false }
  }
}

// ─── Normalisation ────────────────────────────────────────────────────────
/**
 * Accepts both the legacy payload shape (email_payload.generate_email_payload)
 * and the frozen v1 contract (worksplit1.md). Returns our canonical shape.
 */
export function normalizePayload(raw: Record<string, unknown>): Payload {
  // User
  const userObj = (raw.user as Record<string, unknown> | undefined) ?? {}
  const user = normalizeUser({
    ...userObj,
    user_id: raw.user_id ?? userObj.id,
    user_name: raw.user_name ?? userObj.name,
    user_city: raw.user_city ?? userObj.city,
    user_country: raw.user_country ?? userObj.country,
    user_language: raw.user_language ?? userObj.language,
  })

  // Weather
  const w = (raw.weather as Record<string, unknown> | undefined) ?? {}
  const weather = {
    condition: (w.condition ?? w.forecast ?? "unknown") as string,
    temp_c: Number(w.temp_c ?? w.temp_max ?? 0),
    description: w.description as string | undefined,
    city: (w.city ?? user.city) as string | undefined,
    weekend_day: w.weekend_day as string | undefined,
  }

  // Products
  const rawProducts = (raw.products as Array<Record<string, unknown>>) ?? []
  const products: Product[] = rawProducts.map((p) => {
    const days = (p.days_until_expiry ?? p.expiry_days) as number | undefined
    const price = Number(p.price_huf ?? p.original_price ?? p.price ?? 0)
    const discounted = Number(
      p.discounted_price_huf ?? p.discounted_price ?? 0,
    )
    const chosenPct = (p.chosen_discount_pct ?? p.discount_pct ?? 0) as number
    return {
      sku: String(p.sku ?? ""),
      title: String(p.title ?? p.name ?? "Product"),
      category: (p.category as string | undefined) ?? undefined,
      expiration_date: p.expiration_date as string | undefined,
      days_until_expiry: days,
      urgency:
        (p.urgency as 1 | 2 | 3 | undefined) ?? urgencyFromDays(days),
      price,
      discounted_price: discounted || price * (1 - chosenPct / 100),
      discount_pct: chosenPct,
      chosen_discount_pct: p.chosen_discount_pct as number | undefined,
      units_at_risk: p.units_at_risk as number | undefined,
      projected_units_rescued: p.projected_units_rescued as number | undefined,
      projected_profit: p.projected_profit_huf as number | undefined,
      economic_reasoning: p.economic_reasoning as string | undefined,
      ai_explanation: (p.ai_explanation ?? p.explanation) as string | undefined,
      bundle_sku: (p.bundle_sku as string | null | undefined) ?? null,
    }
  })

  // Bundles
  const rawBundles = (raw.bundles as Array<Record<string, unknown>>) ?? []
  const bundles = rawBundles.map((b) => ({
    name: String(b.name ?? "Bundle"),
    skus: (b.skus as string[]) ?? [],
    bundle_discount_pct: b.bundle_discount_pct as number | undefined,
    bundle_price: (b.bundle_price ?? b.bundle_price_huf) as number | undefined,
    original_total: (b.original_total ?? b.original_total_huf) as
      | number
      | undefined,
  }))

  // Totals (from frozen v1 `totals` object OR from top-level legacy fields)
  const t = (raw.totals as Record<string, unknown> | undefined) ?? {}
  const currency = inferCurrency(user)
  const totals = {
    projected_profit: (t.projected_profit_huf ?? t.projected_profit) as
      | number
      | undefined,
    projected_waste_saved_kg: (t.projected_waste_saved_kg ??
      raw.waste_saved_kg) as number | undefined,
    projected_waste_value: (t.projected_waste_value_huf ??
      t.projected_waste_value) as number | undefined,
    projected_co2_saved_kg: (t.projected_co2_saved_kg ??
      raw.co2_saved_kg) as number | undefined,
    currency,
  }

  // AI copy
  const ai = (raw.ai_copy as Record<string, unknown> | undefined) ?? {}
  const ai_copy = {
    subject_line: (ai.subject_line ?? raw.subject_line) as string | undefined,
    intro_line: (ai.intro_line ?? raw.intro_line) as string | undefined,
    send_time: (ai.send_time ?? raw.send_time) as string | undefined,
  }

  return { user, weather, products, bundles, totals, ai_copy, raw }
}

export { HttpError }
