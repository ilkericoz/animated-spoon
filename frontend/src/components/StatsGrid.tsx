import {
  Users,
  Leaf,
  Cloud,
  Mail,
  Wallet,
  Package,
  TrendingDown,
  Heart,
} from "lucide-react"

import { StatCard } from "@/components/StatCard"
import {
  formatCompactMoney,
  formatInt,
  formatKg,
} from "@/lib/format"
import type { Payload, Stats, SwipeRecord, Totals } from "@/types"

type Props = {
  stats: Stats | null
  statsLoading: boolean
  sentCount: number | null // null = unavailable
  sentUnavailable: boolean
  payload: Payload | null
  payloadLoading: boolean
  swipes: SwipeRecord[] | null
  swipesLoading: boolean
}

export function StatsGrid({
  stats,
  statsLoading,
  sentCount,
  sentUnavailable,
  payload,
  payloadLoading,
  swipes,
  swipesLoading,
}: Props) {
  const totals: Totals | undefined = payload?.totals
  const currency = totals?.currency ?? "HUF"
  const swipeLikes = swipes?.filter((r) => r.liked).length ?? 0
  const swipeTotal = swipes?.length ?? 0
  const swipePasses = swipeTotal - swipeLikes

  return (
    <div className="space-y-3">
      {/* Row 1 — program-level metrics */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Users targeted"
          icon={Users}
          accent="navy"
          value={formatInt(stats?.total_users)}
          hint="customers"
          loading={statsLoading}
        />
        <StatCard
          label="Food rescued"
          icon={Leaf}
          accent="emerald"
          value={formatKg(stats?.total_waste_saved_kg)}
          hint="this batch"
          loading={statsLoading}
        />
        <StatCard
          label="CO₂ saved"
          icon={Cloud}
          accent="blue"
          value={formatKg(stats?.total_co2_saved_kg)}
          hint="emissions avoided"
          loading={statsLoading}
        />
        <StatCard
          label="Emails sent"
          icon={Mail}
          accent="yellow"
          value={sentCount == null ? "—" : formatInt(sentCount)}
          hint={sentUnavailable ? "pending /send" : "this session"}
          loading={false}
        />
      </div>

      {/* Row 2 — selected-user economics */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Projected profit"
          icon={Wallet}
          accent="orange"
          value={
            totals?.projected_profit != null
              ? formatCompactMoney(totals.projected_profit, currency)
              : "—"
          }
          hint={payload ? `for ${payload.user.name.split(" ")[0]}` : "pick a customer"}
          loading={payloadLoading}
        />
        <StatCard
          label="Waste value avoided"
          icon={TrendingDown}
          accent="red"
          value={
            totals?.projected_waste_value != null
              ? formatCompactMoney(totals.projected_waste_value, currency)
              : payload
                ? "—"
                : "—"
          }
          hint="at cost"
          loading={payloadLoading}
        />
        <StatCard
          label="Bundles offered"
          icon={Package}
          accent="navy"
          value={formatInt(payload?.bundles.length)}
          hint={
            payload && payload.bundles.length > 0
              ? "complementary pairs"
              : "for this customer"
          }
          loading={payloadLoading}
        />
        <StatCard
          label="Swipes collected"
          icon={Heart}
          accent="red"
          value={payload ? formatInt(swipeTotal) : "—"}
          hint={
            payload
              ? swipeTotal > 0
                ? `${swipeLikes} liked · ${swipePasses} passed`
                : "no swipes yet"
              : "pick a customer"
          }
          loading={swipesLoading && payload != null}
        />
      </div>
    </div>
  )
}
