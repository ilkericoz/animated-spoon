import { Sparkles, Activity } from "lucide-react"

import { AldiLogo } from "@/components/AldiLogo"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type Props = {
  useAi: boolean
  onToggleAi: (next: boolean) => void
  apiHealthy: boolean | null
}

export function AppHeader({ useAi, onToggleAi, apiHealthy }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-6 px-6">
        <div className="flex items-center gap-3">
          <AldiLogo size={32} />
          <div className="flex flex-col leading-tight">
            <span className="text-[15px] font-semibold tracking-tight text-foreground">
              ALDI <span className="text-[var(--aldi-blue)]">Rescue</span>
            </span>
            <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Campaign Console
            </span>
          </div>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          <HeaderLink label="Dashboard" active />
          <HeaderLink label="Campaigns" disabled />
          <HeaderLink label="Inventory" disabled />
          <HeaderLink label="Settings" disabled />
        </nav>

        <div className="flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-2.5 py-1 text-xs">
                <Activity
                  className={
                    apiHealthy === null
                      ? "size-3 text-muted-foreground"
                      : apiHealthy
                        ? "size-3 text-emerald-500"
                        : "size-3 text-[var(--aldi-red)]"
                  }
                />
                <span className="num-tabular font-medium text-muted-foreground">
                  {apiHealthy === null
                    ? "Checking API…"
                    : apiHealthy
                      ? "API online"
                      : "API offline"}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              FastAPI backend at <code>localhost:8000</code>
            </TooltipContent>
          </Tooltip>

          <label className="flex cursor-pointer items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-1.5 text-xs">
            <Sparkles className="size-3.5 text-[var(--aldi-blue)]" />
            <span className="font-medium text-muted-foreground">
              AI copy
            </span>
            <Switch checked={useAi} onCheckedChange={onToggleAi} />
          </label>

          <Badge variant="outline" className="hidden sm:inline-flex">
            v1.0 · Hackathon
          </Badge>
        </div>
      </div>
    </header>
  )
}

function HeaderLink({
  label,
  active,
  disabled,
}: {
  label: string
  active?: boolean
  disabled?: boolean
}) {
  return (
    <a
      href="#"
      aria-disabled={disabled}
      className={
        "rounded-md px-3 py-1.5 text-sm transition-colors " +
        (active
          ? "bg-primary/10 text-primary font-medium"
          : disabled
            ? "pointer-events-none text-muted-foreground/60"
            : "text-muted-foreground hover:bg-muted hover:text-foreground")
      }
    >
      {label}
    </a>
  )
}
