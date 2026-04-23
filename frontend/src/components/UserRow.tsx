import { MapPin, Send, Wand2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { StatusBadge, type SendStatus } from "@/components/StatusBadge"
import type { User } from "@/types"

type Props = {
  user: User
  selected: boolean
  status: SendStatus
  sendAvailable: boolean
  onSelect: () => void
  onGenerate: () => void
  onSend: () => void
}

export function UserRow({
  user,
  selected,
  status,
  sendAvailable,
  onSelect,
  onGenerate,
  onSend,
}: Props) {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  const isBusy = status === "generating" || status === "sending"

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect()
        }
      }}
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl border p-3.5 transition-all outline-none cursor-pointer",
        selected
          ? "border-primary/80 bg-primary/[0.04] shadow-xs ring-1 ring-primary/25"
          : "border-border/70 bg-card hover:border-primary/40 hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold tracking-wide",
            selected
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {initials || "??"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold text-foreground">
              {user.name}
            </span>
            <StatusBadge status={status} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {user.city ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" />
                {user.city}
                {user.country ? `, ${user.country}` : ""}
              </span>
            ) : null}
            {user.language ? (
              <Badge
                variant="outline"
                className="h-4 rounded-full px-1.5 text-[10px] uppercase"
              >
                {user.language}
              </Badge>
            ) : null}
            {user.favorite_category ? (
              <Badge variant="info" className="h-4 px-1.5 text-[10px]">
                {user.favorite_category}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          disabled={isBusy}
          onClick={(e) => {
            e.stopPropagation()
            onGenerate()
          }}
        >
          <Wand2 className="size-3.5" />
          Generate
        </Button>

        {sendAvailable ? (
          <Button
            size="sm"
            variant="aldi"
            className="flex-1"
            disabled={isBusy}
            onClick={(e) => {
              e.stopPropagation()
              onSend()
            }}
          >
            <Send className="size-3.5" />
            Send
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex-1">
                <Button
                  size="sm"
                  variant="aldi"
                  className="w-full opacity-60"
                  disabled
                  onClick={(e) => e.stopPropagation()}
                >
                  <Send className="size-3.5" />
                  Send
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Send endpoint not deployed yet — Agent B ships this
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
}
