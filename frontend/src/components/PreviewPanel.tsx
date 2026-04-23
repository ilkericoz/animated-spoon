import {
  Mail,
  Braces,
  FileText,
  Calculator,
  Thermometer,
  Sun,
  CloudRain,
  Cloud,
  Snowflake,
  Heart,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react"

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { EmailTab } from "@/components/EmailTab"
import { JsonTab } from "@/components/JsonTab"
import { PdfTab } from "@/components/PdfTab"
import { DiscountBreakdown } from "@/components/DiscountBreakdown"
import { PreferencesTab } from "@/components/PreferencesTab"
import type { Payload, SwipeRecord, User } from "@/types"

type Props = {
  selectedUser: User | null
  payload: Payload | null
  emailHtml: string | null
  loading: boolean
  swipes: SwipeRecord[] | null
  swipesLoading: boolean
}

export function PreviewPanel({
  selectedUser,
  payload,
  emailHtml,
  loading,
  swipes,
  swipesLoading,
}: Props) {
  return (
    <section className="flex h-full min-h-0 flex-col gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-xs">
      <PreviewHeader user={selectedUser} payload={payload} loading={loading} />

      <Tabs defaultValue="email" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-auto self-start">
          <TabsTrigger value="email">
            <Mail className="size-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="breakdown">
            <Calculator className="size-4" />
            Breakdown
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <Heart className="size-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="json">
            <Braces className="size-4" />
            Payload
          </TabsTrigger>
          <TabsTrigger value="pdf">
            <FileText className="size-4" />
            Coupon PDF
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="email"
          className="min-h-0 flex-1 data-[state=inactive]:hidden"
        >
          <EmailTab
            html={emailHtml}
            loading={loading}
            hasSelection={!!selectedUser}
          />
        </TabsContent>
        <TabsContent
          value="breakdown"
          className="min-h-0 flex-1 data-[state=inactive]:hidden"
        >
          <DiscountBreakdown payload={payload} />
        </TabsContent>
        <TabsContent
          value="preferences"
          className="min-h-0 flex-1 data-[state=inactive]:hidden"
        >
          <PreferencesTab
            records={swipes}
            loading={swipesLoading}
            hasSelection={!!selectedUser}
          />
        </TabsContent>
        <TabsContent
          value="json"
          className="min-h-0 flex-1 data-[state=inactive]:hidden"
        >
          <JsonTab payload={payload} />
        </TabsContent>
        <TabsContent
          value="pdf"
          className="min-h-0 flex-1 data-[state=inactive]:hidden"
        >
          <PdfTab payload={payload} />
        </TabsContent>
      </Tabs>
    </section>
  )
}

function PreviewHeader({
  user,
  payload,
  loading,
}: {
  user: User | null
  payload: Payload | null
  loading: boolean
}) {
  if (!user) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border/80 bg-muted/30 px-4 py-3">
        <div className="text-sm text-muted-foreground">
          Select a customer to begin.
        </div>
      </div>
    )
  }

  const weather = payload?.weather

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/30 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
          {user.name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">
              {user.name}
            </span>
            {user.language ? (
              <Badge variant="outline" className="uppercase">
                {user.language}
              </Badge>
            ) : null}
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {[user.email, user.city, user.country].filter(Boolean).join(" · ")}
          </div>
          {(user.favorite_category || user.least_purchased_category) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {user.favorite_category ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-900">
                  <ThumbsUp className="size-3" />
                  {user.favorite_category}
                </span>
              ) : null}
              {user.least_purchased_category ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <ThumbsDown className="size-3" />
                  {user.least_purchased_category}
                </span>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-9 w-56" />
      ) : weather ? (
        <div className="flex items-center gap-3 rounded-md border border-border/70 bg-background px-3 py-1.5 text-xs">
          <WeatherIcon condition={weather.condition} />
          <span className="text-foreground">
            {weather.description ??
              `${capitalize(weather.condition)} weekend`}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Thermometer className="size-3" />
            <span className="num-tabular">{Math.round(weather.temp_c)}°C</span>
          </span>
          {payload?.ai_copy.send_time ? (
            <Badge variant="warning" className="ml-1">
              Send · {payload.ai_copy.send_time}
            </Badge>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function WeatherIcon({ condition }: { condition?: string }) {
  const className = "size-4 text-[var(--aldi-blue)]"
  switch (condition) {
    case "sunny":
    case "clear":
      return <Sun className={className} />
    case "rainy":
      return <CloudRain className={className} />
    case "cold":
      return <Snowflake className={className} />
    default:
      return <Cloud className={className} />
  }
}

function capitalize(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}
