import { Send, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type Props = {
  total: number
  sending: boolean
  completed: number
  failed: number
  available: boolean
  onClick: () => void
}

export function SendAllButton({
  total,
  sending,
  completed,
  failed,
  available,
  onClick,
}: Props) {
  const progress = total === 0 ? 0 : (completed / total) * 100

  if (!available) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="block">
            <Button disabled className="w-full" variant="default">
              <Send className="size-4" />
              Send to all {total}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          Send endpoint not deployed yet — Agent B ships this
        </TooltipContent>
      </Tooltip>
    )
  }

  if (sending) {
    return (
      <div className="flex flex-col gap-2">
        <Button disabled className="w-full" variant="default">
          <Loader2 className="size-4 animate-spin" />
          Sending… {completed} / {total}
          {failed > 0 ? (
            <span className="ml-1 text-[var(--aldi-yellow)]">
              ({failed} failed)
            </span>
          ) : null}
        </Button>
        <Progress value={progress} />
      </div>
    )
  }

  return (
    <Button className="w-full" variant="default" onClick={onClick}>
      <Send className="size-4" />
      Send to all {total}
    </Button>
  )
}
