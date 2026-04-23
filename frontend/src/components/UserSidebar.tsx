import { Users2 } from "lucide-react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { SendAllButton } from "@/components/SendAllButton"
import { UserRow } from "@/components/UserRow"
import type { SendStatus } from "@/components/StatusBadge"
import type { User } from "@/types"

type Props = {
  users: User[] | null
  loading: boolean
  selectedUserId: string | number | null
  statuses: Record<string, SendStatus>
  sendAvailable: boolean
  sendingAll: boolean
  sendAllCompleted: number
  sendAllFailed: number
  onSelect: (id: string | number) => void
  onGenerate: (id: string | number) => void
  onSend: (id: string | number) => void
  onSendAll: () => void
}

export function UserSidebar({
  users,
  loading,
  selectedUserId,
  statuses,
  sendAvailable,
  sendingAll,
  sendAllCompleted,
  sendAllFailed,
  onSelect,
  onGenerate,
  onSend,
  onSendAll,
}: Props) {
  return (
    <aside className="flex h-full flex-col gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-xs">
      <header className="flex items-center justify-between px-2 pt-1">
        <div className="flex items-center gap-2">
          <Users2 className="size-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-tight">
            Customers
          </h2>
        </div>
        <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground num-tabular">
          {users?.length ?? "—"}
        </span>
      </header>

      <div className="px-1">
        <SendAllButton
          total={users?.length ?? 0}
          sending={sendingAll}
          completed={sendAllCompleted}
          failed={sendAllFailed}
          available={sendAvailable}
          onClick={onSendAll}
        />
      </div>

      <div className="-mx-1 flex-1 overflow-hidden">
        <ScrollArea className="h-full px-1">
          {loading ? (
            <div className="flex flex-col gap-2 p-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[98px] w-full" />
              ))}
            </div>
          ) : !users || users.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No customers returned from the API.
            </div>
          ) : (
            <div className="flex flex-col gap-2 p-1">
              {users.map((u) => (
                <UserRow
                  key={String(u.id)}
                  user={u}
                  selected={String(u.id) === String(selectedUserId)}
                  status={statuses[String(u.id)] ?? "idle"}
                  sendAvailable={sendAvailable}
                  onSelect={() => onSelect(u.id)}
                  onGenerate={() => onGenerate(u.id)}
                  onSend={() => onSend(u.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </aside>
  )
}
