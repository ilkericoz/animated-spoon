import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import { AppHeader } from "@/components/AppHeader"
import { StatsGrid } from "@/components/StatsGrid"
import { UserSidebar } from "@/components/UserSidebar"
import { PreviewPanel } from "@/components/PreviewPanel"
import { RecentSends } from "@/components/RecentSends"
import type { SendStatus } from "@/components/StatusBadge"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  generate,
  getEmailHtml,
  getSent,
  getStats,
  getSwipes,
  getUsers,
  send,
  API_BASE,
} from "@/lib/api"
import type { Payload, SentRecord, Stats, SwipeRecord, User } from "@/types"

function App() {
  const [users, setUsers] = useState<User[] | null>(null)
  const [usersLoading, setUsersLoading] = useState(true)
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null)

  const [sentRecords, setSentRecords] = useState<SentRecord[] | null>(null)
  const [sentAvailable, setSentAvailable] = useState<boolean>(false)

  const [selectedUserId, setSelectedUserId] = useState<string | number | null>(
    null,
  )
  const [useAi, setUseAi] = useState(true)

  const [payload, setPayload] = useState<Payload | null>(null)
  const [emailHtml, setEmailHtml] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const [statuses, setStatuses] = useState<Record<string, SendStatus>>({})
  const [sendingAll, setSendingAll] = useState(false)
  const [sendAllCompleted, setSendAllCompleted] = useState(0)
  const [sendAllFailed, setSendAllFailed] = useState(0)

  const [swipes, setSwipes] = useState<SwipeRecord[] | null>(null)
  const [swipesLoading, setSwipesLoading] = useState(false)

  // Preserve the latest payload's user id so switching customers doesn't race
  const activeGenerationRef = useRef<string | number | null>(null)

  const selectedUser = useMemo(
    () =>
      users?.find((u) => String(u.id) === String(selectedUserId)) ?? null,
    [users, selectedUserId],
  )

  // ── Bootstrap ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [u, s, sent] = await Promise.all([
          getUsers(),
          getStats().catch(() => null),
          getSent(),
        ])
        if (cancelled) return
        setUsers(u)
        setStats(s)
        setApiHealthy(true)
        if (sent.available) {
          setSentAvailable(true)
          setSentRecords(sent.records)
        } else {
          setSentAvailable(false)
          setSentRecords(null)
        }
      } catch {
        if (!cancelled) {
          setApiHealthy(false)
          toast.error("Could not reach the API", {
            description: `${API_BASE} — is uvicorn running?`,
          })
        }
      } finally {
        if (!cancelled) {
          setUsersLoading(false)
          setStatsLoading(false)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  // ── Actions ──────────────────────────────────────────────────────────────
  const doGenerate = useCallback(
    async (userId: string | number) => {
      const key = String(userId)
      activeGenerationRef.current = userId
      setSelectedUserId(userId)
      setPreviewLoading(true)
      setStatuses((s) => ({ ...s, [key]: "generating" }))
      try {
        const [p, html] = await Promise.all([
          generate(userId, useAi),
          getEmailHtml(userId, useAi),
        ])
        if (String(activeGenerationRef.current) !== String(userId)) return
        setPayload(p)
        setEmailHtml(html)
        setStatuses((s) => ({
          ...s,
          [key]: s[key] === "generating" ? "idle" : s[key],
        }))
        toast.success(`Generated email for ${p.user.name}`, {
          description: p.ai_copy.subject_line,
        })
      } catch (e) {
        setStatuses((s) => ({ ...s, [key]: "failed" }))
        toast.error("Generation failed", {
          description: e instanceof Error ? e.message : String(e),
        })
      } finally {
        setPreviewLoading(false)
      }
    },
    [useAi],
  )

  const doSend = useCallback(
    async (userId: string | number): Promise<"sent" | "failed"> => {
      const key = String(userId)
      setStatuses((s) => ({ ...s, [key]: "sending" }))
      const result = await send(userId)
      if (result.status === "sent") {
        setStatuses((s) => ({ ...s, [key]: "sent" }))
        toast.success("Email sent", {
          description: result.user_email ?? `User ${userId}`,
        })
        // Refresh /sent so the count stays accurate
        getSent().then((res) => {
          if (res.available) {
            setSentAvailable(true)
            setSentRecords(res.records)
          }
        })
        return "sent"
      }
      if (result.status === "unavailable") {
        setStatuses((s) => ({ ...s, [key]: "idle" }))
        toast.warning("Send endpoint not ready", {
          description: "Waiting on /send from Agent B.",
        })
        setSentAvailable(false)
        return "failed"
      }
      setStatuses((s) => ({ ...s, [key]: "failed" }))
      toast.error("Send failed", {
        description: result.error,
      })
      return "failed"
    },
    [],
  )

  const doSendAll = useCallback(async () => {
    if (!users || users.length === 0) return
    setSendingAll(true)
    setSendAllCompleted(0)
    setSendAllFailed(0)
    let ok = 0
    let fail = 0
    for (let i = 0; i < users.length; i++) {
      const u = users[i]
      const result = await doSend(u.id)
      if (result === "sent") ok++
      else fail++
      setSendAllCompleted(ok + fail)
      setSendAllFailed(fail)
      if (i < users.length - 1) {
        await new Promise((r) => setTimeout(r, 1000))
      }
    }
    setSendingAll(false)
    toast.message("Send-to-all complete", {
      description: `${ok} sent · ${fail} failed`,
    })
  }, [users, doSend])

  // When AI toggle flips while a user is selected, re-generate to keep the
  // preview in sync without surprising the user.
  const previousUseAi = useRef(useAi)
  useEffect(() => {
    if (previousUseAi.current !== useAi && selectedUserId != null && payload) {
      doGenerate(selectedUserId)
    }
    previousUseAi.current = useAi
  }, [useAi, selectedUserId, payload, doGenerate])

  // Pull swipe preferences for the selected user whenever the selection changes.
  useEffect(() => {
    if (selectedUserId == null) {
      setSwipes(null)
      setSwipesLoading(false)
      return
    }
    let cancelled = false
    setSwipesLoading(true)
    getSwipes(selectedUserId)
      .then((res) => {
        if (cancelled) return
        setSwipes(res.available ? res.records : [])
      })
      .catch(() => {
        if (!cancelled) setSwipes([])
      })
      .finally(() => {
        if (!cancelled) setSwipesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedUserId])

  // ── Layout ───────────────────────────────────────────────────────────────
  return (
    <TooltipProvider>
      <div className="flex min-h-screen flex-col">
        <AppHeader
          useAi={useAi}
          onToggleAi={setUseAi}
          apiHealthy={apiHealthy}
        />

        <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 px-6 py-5">
          <section className="space-y-1.5">
            <h1 className="text-xl font-semibold tracking-tight">
              Weekend Rescue Campaign
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Review personalised food-rescue emails for each customer, inspect
              the economics behind every discount, and launch the weekend send
              from one console.
            </p>
          </section>

          <StatsGrid
            stats={stats}
            statsLoading={statsLoading}
            sentCount={sentAvailable ? (sentRecords?.length ?? 0) : null}
            sentUnavailable={!sentAvailable}
            payload={payload}
            payloadLoading={previewLoading}
            swipes={swipes}
            swipesLoading={swipesLoading}
          />

          {sentAvailable ? (
            <RecentSends records={sentRecords} users={users} />
          ) : null}

          <div className="grid min-h-[680px] flex-1 grid-cols-1 gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
            <UserSidebar
              users={users}
              loading={usersLoading}
              selectedUserId={selectedUserId}
              statuses={statuses}
              sendAvailable={sentAvailable}
              sendingAll={sendingAll}
              sendAllCompleted={sendAllCompleted}
              sendAllFailed={sendAllFailed}
              onSelect={(id) => setSelectedUserId(id)}
              onGenerate={doGenerate}
              onSend={doSend}
              onSendAll={doSendAll}
            />

            <PreviewPanel
              selectedUser={selectedUser}
              payload={payload}
              emailHtml={emailHtml}
              loading={previewLoading}
              swipes={swipes}
              swipesLoading={swipesLoading}
            />
          </div>

          <footer className="pt-2 text-center text-xs text-muted-foreground">
            ALDI Rescue · AIIS Hackathon · backend at{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
              {API_BASE}
            </code>
          </footer>
        </main>

        <Toaster />
      </div>
    </TooltipProvider>
  )
}

export default App
