import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

type Accent = "navy" | "blue" | "orange" | "yellow" | "red" | "emerald"

const ACCENT_CLASSES: Record<Accent, { pill: string; ring: string; text: string }> = {
  navy: {
    pill: "bg-[color-mix(in_oklch,var(--aldi-navy)_12%,white)] text-[var(--aldi-navy)]",
    ring: "ring-[color-mix(in_oklch,var(--aldi-navy)_20%,transparent)]",
    text: "text-[var(--aldi-navy)]",
  },
  blue: {
    pill: "bg-[color-mix(in_oklch,var(--aldi-blue)_14%,white)] text-[color-mix(in_oklch,var(--aldi-blue)_85%,var(--aldi-navy))]",
    ring: "ring-[color-mix(in_oklch,var(--aldi-blue)_22%,transparent)]",
    text: "text-[color-mix(in_oklch,var(--aldi-blue)_85%,var(--aldi-navy))]",
  },
  orange: {
    pill: "bg-[color-mix(in_oklch,var(--aldi-orange)_14%,white)] text-[color-mix(in_oklch,var(--aldi-orange)_82%,black)]",
    ring: "ring-[color-mix(in_oklch,var(--aldi-orange)_22%,transparent)]",
    text: "text-[color-mix(in_oklch,var(--aldi-orange)_82%,black)]",
  },
  yellow: {
    pill: "bg-[color-mix(in_oklch,var(--aldi-yellow)_35%,white)] text-[color-mix(in_oklch,var(--aldi-navy)_90%,black)]",
    ring: "ring-[color-mix(in_oklch,var(--aldi-yellow)_40%,transparent)]",
    text: "text-[color-mix(in_oklch,var(--aldi-navy)_90%,black)]",
  },
  red: {
    pill: "bg-[color-mix(in_oklch,var(--aldi-red)_12%,white)] text-[var(--aldi-red)]",
    ring: "ring-[color-mix(in_oklch,var(--aldi-red)_22%,transparent)]",
    text: "text-[var(--aldi-red)]",
  },
  emerald: {
    pill: "bg-emerald-100 text-emerald-900",
    ring: "ring-emerald-200",
    text: "text-emerald-900",
  },
}

type Props = {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: LucideIcon
  accent?: Accent
  loading?: boolean
  footer?: ReactNode
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "navy",
  loading,
  footer,
}: Props) {
  const klass = ACCENT_CLASSES[accent]
  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 overflow-hidden rounded-xl border border-border/70 bg-card px-5 py-4 shadow-xs",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        {Icon ? (
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-md ring-1",
              klass.pill,
              klass.ring,
            )}
          >
            <Icon className="size-3.5" />
          </span>
        ) : null}
      </div>

      <div className="flex items-baseline gap-2">
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <span
            className={cn(
              "num-tabular text-[26px] font-semibold leading-none tracking-tight",
              klass.text,
            )}
          >
            {value}
          </span>
        )}
        {hint && !loading ? (
          <span className="text-xs font-medium text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </div>

      {footer ? (
        <div className="mt-auto text-xs text-muted-foreground">{footer}</div>
      ) : null}
    </div>
  )
}
