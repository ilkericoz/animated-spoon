import { CheckCircle2, Mail, XCircle } from "lucide-react"

import type { SentRecord, User } from "@/types"

type Props = {
  records: SentRecord[] | null
  users: User[] | null
}

export function RecentSends({ records, users }: Props) {
  if (!records || records.length === 0) return null

  const nameById = new Map<string, string>()
  for (const u of users ?? []) {
    nameById.set(String(u.id), u.name)
  }

  const latest = [...records]
    .sort((a, b) => (b.sent_at ?? "").localeCompare(a.sent_at ?? ""))
    .slice(0, 5)

  return (
    <section className="rounded-xl border border-border/70 bg-card p-3 shadow-xs">
      <header className="flex items-center justify-between px-2 pb-2 pt-1">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Mail className="size-4 text-primary" />
          Recent sends
        </div>
        <span className="num-tabular rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {records.length} total
        </span>
      </header>

      <ul className="divide-y divide-border/60">
        {latest.map((r, idx) => {
          const name = nameById.get(String(r.user_id)) ?? `User ${r.user_id}`
          const ok = r.status !== "failed"
          return (
            <li
              key={r.message_id ?? `${r.user_id}-${idx}`}
              className="flex items-center gap-3 px-2 py-2 text-sm"
            >
              <span
                className={
                  "flex size-6 shrink-0 items-center justify-center rounded-full " +
                  (ok
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-[color-mix(in_oklch,var(--aldi-red)_14%,white)] text-[var(--aldi-red)]")
                }
              >
                {ok ? (
                  <CheckCircle2 className="size-3.5" />
                ) : (
                  <XCircle className="size-3.5" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate font-medium text-foreground">
                    {name}
                  </span>
                  {r.user_email ? (
                    <span className="truncate text-xs text-muted-foreground">
                      {r.user_email}
                    </span>
                  ) : null}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {r.subject || "ALDI Rescue"}
                  {r.error ? (
                    <span className="ml-2 text-[var(--aldi-red)]">
                      · {r.error}
                    </span>
                  ) : null}
                </div>
              </div>

              <span className="num-tabular shrink-0 text-xs text-muted-foreground">
                {formatRelative(r.sent_at)}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function formatRelative(iso?: string): string {
  if (!iso) return ""
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ""
  const diff = Date.now() - t
  const sec = Math.round(diff / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.round(hr / 24)
  return `${d}d ago`
}
