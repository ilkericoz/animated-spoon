import type { Totals, User } from "@/types"

const CURRENCY_BY_COUNTRY: Record<string, Totals["currency"]> = {
  HU: "HUF",
  DE: "EUR",
  FR: "EUR",
  AT: "EUR",
  IT: "EUR",
  ES: "EUR",
  NL: "EUR",
  BE: "EUR",
  IE: "EUR",
  GB: "GBP",
  UK: "GBP",
}

export function inferCurrency(user?: User): NonNullable<Totals["currency"]> {
  if (user?.country && CURRENCY_BY_COUNTRY[user.country.toUpperCase()]) {
    return CURRENCY_BY_COUNTRY[user.country.toUpperCase()]!
  }
  return "HUF"
}

export function formatMoney(
  value: number | null | undefined,
  currency: NonNullable<Totals["currency"]> = "HUF",
) {
  if (value == null || Number.isNaN(value)) return "—"
  const locale = currency === "HUF" ? "hu-HU" : currency === "EUR" ? "de-DE" : "en-GB"
  const maximumFractionDigits = currency === "HUF" ? 0 : 2
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits,
  }).format(value)
}

export function formatCompactMoney(
  value: number | null | undefined,
  currency: NonNullable<Totals["currency"]> = "HUF",
) {
  if (value == null || Number.isNaN(value)) return "—"
  const locale = currency === "HUF" ? "hu-HU" : "en-GB"
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatKg(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—"
  return `${new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 1,
  }).format(value)} kg`
}

export function formatInt(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—"
  return new Intl.NumberFormat("en-GB").format(Math.round(value))
}

export function urgencyFromDays(days: number | undefined): 1 | 2 | 3 {
  if (days == null) return 1
  if (days <= 1) return 3
  if (days <= 2) return 2
  return 1
}

export function urgencyLabel(urgency: 1 | 2 | 3) {
  return urgency === 3
    ? "Last chance"
    : urgency === 2
      ? "Expiring soon"
      : "Highlight"
}
