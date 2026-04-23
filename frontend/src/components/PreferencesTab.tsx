import { useMemo } from "react"
import { Heart, HeartOff, Layers, Package, Tag } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/EmptyState"
import { Skeleton } from "@/components/ui/skeleton"
import type { SwipeRecord } from "@/types"

type Props = {
  records: SwipeRecord[] | null
  loading: boolean
  hasSelection: boolean
}

type Bucket = {
  key: string
  name: string
  likes: number
  passes: number
}

function bucketise(records: SwipeRecord[], type: string): Bucket[] {
  const byId = new Map<string, Bucket>()
  for (const r of records) {
    if (r.item_type !== type) continue
    const key = r.item_id || r.item_name
    const b = byId.get(key) ?? {
      key,
      name: r.item_name || r.item_id,
      likes: 0,
      passes: 0,
    }
    if (r.liked) b.likes += 1
    else b.passes += 1
    byId.set(key, b)
  }
  return Array.from(byId.values()).sort(
    (a, b) => b.likes + b.passes - (a.likes + a.passes),
  )
}

export function PreferencesTab({ records, loading, hasSelection }: Props) {
  const { categories, products, bundles, totals } = useMemo(() => {
    const rs = records ?? []
    const categories = bucketise(rs, "category")
    const products = bucketise(rs, "product")
    const bundles = bucketise(rs, "bundle")
    const likes = rs.filter((r) => r.liked).length
    const passes = rs.length - likes
    return {
      categories,
      products,
      bundles,
      totals: { likes, passes, total: rs.length },
    }
  }, [records])

  if (!hasSelection) {
    return (
      <EmptyState
        icon={Heart}
        title="Swipe preferences"
        description="Pick a customer to see what they've liked or passed on in the swipe game."
      />
    )
  }

  if (loading) {
    return (
      <div className="flex h-full flex-col gap-3 p-4">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (totals.total === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="No swipes yet"
        description="This customer hasn't played the swipe game. Preferences will appear here as soon as they tap their first card."
      />
    )
  }

  return (
    <div className="flex h-full min-h-[520px] flex-col overflow-hidden rounded-xl border border-border/70 bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/50 px-5 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Heart className="size-4 text-primary" />
          Swipe preferences
          <Badge variant="outline" className="ml-2 num-tabular">
            {totals.total} taps
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-900">
            <Heart className="size-3" />
            <span className="num-tabular">{totals.likes}</span>
            liked
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 font-medium text-muted-foreground">
            <HeartOff className="size-3" />
            <span className="num-tabular">{totals.passes}</span>
            passed
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <Section icon={Tag} title="Categories" buckets={categories} />
        <Section icon={Package} title="Products" buckets={products} />
        <Section icon={Layers} title="Bundles" buckets={bundles} />
      </div>
    </div>
  )
}

type SectionProps = {
  icon: typeof Heart
  title: string
  buckets: Bucket[]
}

function Section({ icon: Icon, title, buckets }: SectionProps) {
  if (buckets.length === 0) {
    return (
      <div className="border-b border-border/60 px-5 py-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <Icon className="size-3.5" />
          {title}
        </div>
        <p className="mt-1 text-xs text-muted-foreground/80">
          No swipes recorded yet.
        </p>
      </div>
    )
  }

  return (
    <div className="border-b border-border/60 px-5 py-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <Icon className="size-3.5" />
        {title}
        <span className="num-tabular rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {buckets.length}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {buckets.map((b) => {
          const net = b.likes - b.passes
          const tone =
            net > 0
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : net < 0
                ? "border-[color-mix(in_oklch,var(--aldi-red)_30%,transparent)] bg-[color-mix(in_oklch,var(--aldi-red)_10%,white)] text-[var(--aldi-red)]"
                : "border-border bg-muted text-muted-foreground"
          return (
            <span
              key={b.key}
              className={
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs " +
                tone
              }
            >
              <span className="font-medium text-foreground">{b.name}</span>
              {b.likes > 0 ? (
                <span className="num-tabular text-emerald-700">
                  ♥{b.likes}
                </span>
              ) : null}
              {b.passes > 0 ? (
                <span className="num-tabular text-muted-foreground">
                  ✕{b.passes}
                </span>
              ) : null}
            </span>
          )
        })}
      </div>
    </div>
  )
}
