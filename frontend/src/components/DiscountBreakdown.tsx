import { Calculator, Info } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { EmptyState } from "@/components/EmptyState"
import { formatMoney } from "@/lib/format"
import type { Payload } from "@/types"

type Props = {
  payload: Payload | null
}

export function DiscountBreakdown({ payload }: Props) {
  if (!payload) {
    return (
      <EmptyState
        icon={Calculator}
        title="Discount breakdown"
        description="Per-product discounts and the economic reasoning behind them will appear here after you generate."
      />
    )
  }

  const currency = payload.totals.currency ?? "HUF"

  return (
    <div className="flex h-full min-h-[520px] flex-col overflow-hidden rounded-xl border border-border/70 bg-card">
      <div className="border-b border-border/60 bg-muted/50 px-5 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Calculator className="size-4 text-primary" />
          Discount breakdown
          <Badge variant="outline" className="ml-2">
            {payload.products.length} products
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Tier discount chosen per product, with the ranking engine's reasoning.
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-[28%]">Product</TableHead>
              <TableHead className="w-[12%]">Days left</TableHead>
              <TableHead className="w-[10%]">Discount</TableHead>
              <TableHead className="w-[18%]">Price</TableHead>
              <TableHead className="w-[12%]">Rescued</TableHead>
              <TableHead>Reasoning</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payload.products.map((p) => (
              <TableRow key={p.sku}>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-foreground">
                      {p.title}
                    </span>
                    {p.category ? (
                      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {p.category}
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  {p.days_until_expiry != null ? (
                    <Badge
                      variant={
                        p.urgency === 3
                          ? "urgent"
                          : p.urgency === 2
                            ? "warning"
                            : "outline"
                      }
                    >
                      {p.days_until_expiry === 0
                        ? "today"
                        : `${p.days_until_expiry}d`}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <span
                    className={
                      "num-tabular inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-semibold " +
                      (p.discount_pct >= 50
                        ? "border-[color-mix(in_oklch,var(--aldi-red)_35%,transparent)] bg-[color-mix(in_oklch,var(--aldi-red)_10%,white)] text-[var(--aldi-red)]"
                        : p.discount_pct >= 20
                          ? "border-[color-mix(in_oklch,var(--aldi-orange)_35%,transparent)] bg-[color-mix(in_oklch,var(--aldi-orange)_12%,white)] text-[color-mix(in_oklch,var(--aldi-orange)_82%,black)]"
                          : "border-border bg-muted text-muted-foreground")
                    }
                  >
                    −{p.discount_pct}%
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-baseline gap-1.5">
                    <span className="num-tabular text-sm font-semibold text-foreground">
                      {formatMoney(p.discounted_price, currency)}
                    </span>
                    <span className="num-tabular text-xs text-muted-foreground line-through">
                      {formatMoney(p.price, currency)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {p.projected_units_rescued != null &&
                  p.units_at_risk != null ? (
                    <span className="num-tabular text-sm">
                      {p.projected_units_rescued}
                      <span className="text-muted-foreground">
                        /{p.units_at_risk}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                    {p.economic_reasoning ? (
                      <>
                        <Info className="mt-0.5 size-3 shrink-0 text-[var(--aldi-blue)]" />
                        <span>{p.economic_reasoning}</span>
                      </>
                    ) : p.ai_explanation ? (
                      <span className="italic">{p.ai_explanation}</span>
                    ) : (
                      <span className="text-muted-foreground/60">
                        No reasoning provided yet.
                      </span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {payload.bundles.length > 0 ? (
        <div className="border-t border-border/60 bg-muted/30 px-5 py-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Bundles
          </div>
          <div className="flex flex-wrap gap-2">
            {payload.bundles.map((b, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_oklch,var(--aldi-orange)_30%,transparent)] bg-[color-mix(in_oklch,var(--aldi-orange)_8%,white)] px-3 py-1 text-xs"
              >
                <span className="font-medium text-foreground">{b.name}</span>
                {b.bundle_discount_pct != null ? (
                  <span className="num-tabular text-[var(--aldi-orange)]">
                    −{b.bundle_discount_pct}%
                  </span>
                ) : null}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help text-muted-foreground">
                      {b.skus.length} items
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{b.skus.join(", ")}</TooltipContent>
                </Tooltip>
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
