import { Loader2, CheckCircle2, XCircle, Circle } from "lucide-react"

import { Badge } from "@/components/ui/badge"

export type SendStatus = "idle" | "generating" | "sending" | "sent" | "failed"

export function StatusBadge({ status }: { status: SendStatus }) {
  switch (status) {
    case "generating":
      return (
        <Badge variant="info" className="gap-1">
          <Loader2 className="size-3 animate-spin" /> Generating
        </Badge>
      )
    case "sending":
      return (
        <Badge variant="info" className="gap-1">
          <Loader2 className="size-3 animate-spin" /> Sending
        </Badge>
      )
    case "sent":
      return (
        <Badge variant="success" className="gap-1">
          <CheckCircle2 className="size-3" /> Sent
        </Badge>
      )
    case "failed":
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="size-3" /> Failed
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <Circle className="size-2.5" /> Ready
        </Badge>
      )
  }
}
