import { Mail } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/EmptyState"

type Props = {
  html: string | null
  loading: boolean
  hasSelection: boolean
}

export function EmailTab({ html, loading, hasSelection }: Props) {
  if (loading) {
    return (
      <div className="grid h-full place-items-center p-6">
        <div className="w-full max-w-[600px] space-y-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-[120px] w-full rounded-lg" />
          <Skeleton className="h-[260px] w-full rounded-lg" />
          <Skeleton className="h-10 w-1/3 rounded-lg" />
        </div>
      </div>
    )
  }

  if (!html) {
    return (
      <EmptyState
        icon={Mail}
        title={
          hasSelection
            ? "Generate an email to preview it here"
            : "Pick a customer to start"
        }
        description={
          hasSelection
            ? "Click Generate on the selected customer to render the personalised email."
            : "Select a customer from the sidebar, then click Generate to create their rescue email."
        }
      />
    )
  }

  return (
    <div className="flex h-full min-h-[520px] flex-col overflow-hidden rounded-xl border border-border/70 bg-[#f3f3f6]">
      <div className="flex items-center gap-2 border-b border-border/60 bg-card px-4 py-2 text-xs text-muted-foreground">
        <span className="size-2 rounded-full bg-[var(--aldi-red)]/70" />
        <span className="size-2 rounded-full bg-[var(--aldi-yellow)]/70" />
        <span className="size-2 rounded-full bg-emerald-400/70" />
        <span className="ml-3 font-medium">Inbox preview</span>
      </div>
      <iframe
        title="Email preview"
        srcDoc={html}
        className="h-full w-full flex-1 border-none bg-white"
      />
    </div>
  )
}
