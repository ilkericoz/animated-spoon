import { useState } from "react"
import { Braces, Check, Copy } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { EmptyState } from "@/components/EmptyState"
import type { Payload } from "@/types"

type Props = {
  payload: Payload | null
}

export function JsonTab({ payload }: Props) {
  const [copied, setCopied] = useState(false)

  if (!payload) {
    return (
      <EmptyState
        icon={Braces}
        title="Payload JSON"
        description="Generate an email to inspect the full payload JSON the backend produced."
      />
    )
  }

  const json = JSON.stringify(payload.raw, null, 2)

  return (
    <div className="relative h-full min-h-[520px] overflow-hidden rounded-xl border border-border/70 bg-[#0b0d14]">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5 text-xs text-white/70">
        <span className="flex items-center gap-2 font-medium">
          <Braces className="size-3.5 text-[var(--aldi-blue)]" />
          Payload · <code className="text-white/90">/generate/{String(payload.user.id)}</code>
        </span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(json)
              setCopied(true)
              toast.success("Payload copied to clipboard")
              setTimeout(() => setCopied(false), 1200)
            } catch {
              toast.error("Could not copy payload")
            }
          }}
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <ScrollArea className="h-[calc(100%-44px)]">
        <pre className="num-tabular whitespace-pre px-5 py-4 font-mono text-[12.5px] leading-relaxed text-[#cdd6f4]">
          {json}
        </pre>
      </ScrollArea>
    </div>
  )
}
