import { Download, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/EmptyState"
import { pdfUrl } from "@/lib/api"
import type { Payload } from "@/types"

type Props = {
  payload: Payload | null
}

export function PdfTab({ payload }: Props) {
  if (!payload) {
    return (
      <EmptyState
        icon={FileText}
        title="Coupon PDF"
        description="Generate an email first, then download or preview the printable coupon sheet."
      />
    )
  }

  const url = pdfUrl(payload.user.id)

  return (
    <div className="flex h-full min-h-[520px] flex-col gap-3 overflow-hidden rounded-xl border border-border/70 bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-md bg-[color-mix(in_oklch,var(--aldi-red)_14%,white)] text-[var(--aldi-red)]">
            <FileText className="size-4" />
          </span>
          <div>
            <div className="text-sm font-semibold">
              Coupon sheet · {payload.user.name}
            </div>
            <div className="text-xs text-muted-foreground">
              {payload.products.length} coupons · scan at any ALDI checkout
            </div>
          </div>
        </div>
        <Button asChild variant="default">
          <a
            href={url}
            download={`aldi_rescue_${payload.user.id}.pdf`}
            target="_blank"
            rel="noreferrer"
          >
            <Download className="size-4" />
            Download PDF
          </a>
        </Button>
      </div>
      <div className="min-h-0 flex-1 p-3">
        <object
          data={url}
          type="application/pdf"
          className="h-full w-full rounded-lg border border-border/60 bg-[#f3f3f6]"
        >
          <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
            PDF preview not supported in this browser. Use the Download button above.
          </div>
        </object>
      </div>
    </div>
  )
}
