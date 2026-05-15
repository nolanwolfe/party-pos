"use client"

import { useEffect, useState } from "react"
import { formatEur } from "@/lib/pos-config"

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "petitechef"

type TopItem = { name: string; qty: number; revenue: number }
type Shift = {
  id: string; openedAt: string; closedAt: string | null
  openedBy: string; closedBy: string | null
  orderCount: number | null; totalRevenue: number | null
}
type AuditEntry = { id: string; action: string; actor: string; detail: string | null; createdAt: string }
type Stats = {
  date: string
  summary: { transactions: number; revenue: number; discounts: number; voids: number; byTender: Record<string, number> }
  topItems: TopItem[]
  hourly: number[]
  shifts: Shift[]
  auditLogs: AuditEntry[]
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pwInput, setPwInput] = useState("")
  const [pwError, setPwError] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)

  function handleLogin() {
    if (pwInput === ADMIN_PASSWORD) {
      setAuthed(true)
      setPwError(false)
    } else {
      setPwError(true)
      setPwInput("")
    }
  }

  async function fetchStats(d: string) {
    setLoading(true)
    const res = await fetch(`/api/admin/stats?date=${d}`)
    const data = await res.json()
    setStats(data)
    setLoading(false)
  }

  useEffect(() => {
    if (authed) fetchStats(date)
  }, [authed, date])

  const maxHourly = stats ? Math.max(...stats.hourly, 1) : 1

  if (!authed) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-xs space-y-4">
          <h1 className="text-lg font-semibold text-center">Admin</h1>
          <input
            type="password"
            value={pwInput}
            onChange={(e) => setPwInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            autoFocus
            placeholder="Password"
            className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white"
          />
          {pwError && <p className="text-red-400 text-sm text-center">Incorrect password</p>}
          <button
            onClick={handleLogin}
            className="w-full py-3 rounded-xl bg-white text-black font-bold hover:bg-zinc-200 transition-colors"
          >
            Enter
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">AmPav Admin</h1>
            <p className="text-zinc-500 text-sm">Point of Sale · Cannes 2026</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-zinc-800 text-white rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-white"
            />
            <a
              href={`/api/pos/export?date=${date}`}
              className="text-xs text-zinc-500 hover:text-white border border-zinc-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              Export CSV
            </a>
          </div>
        </div>

        {loading || !stats ? (
          <p className="text-zinc-500 text-center py-12">Loading…</p>
        ) : (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Revenue", value: formatEur(stats.summary.revenue) },
                { label: "Transactions", value: String(stats.summary.transactions) },
                { label: "Discounts", value: formatEur(stats.summary.discounts) },
                { label: "Voids", value: String(stats.summary.voids) },
              ].map((s) => (
                <div key={s.label} className="bg-zinc-900 rounded-xl p-4">
                  <p className="text-zinc-500 text-xs">{s.label}</p>
                  <p className="text-2xl font-bold">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Tender breakdown */}
            <div className="bg-zinc-900 rounded-xl p-4">
              <p className="text-xs text-zinc-500 mb-3">Revenue by Tender</p>
              <div className="flex gap-4">
                {Object.entries(stats.summary.byTender).map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs text-zinc-400 capitalize">{k}</p>
                    <p className="font-semibold">{formatEur(v)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Hourly bar chart */}
            <div className="bg-zinc-900 rounded-xl p-4">
              <p className="text-xs text-zinc-500 mb-3">Revenue by Hour</p>
              <div className="flex items-end gap-1 h-24">
                {stats.hourly.map((v, h) => (
                  <div key={h} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-white rounded-sm"
                      style={{ height: `${(v / maxHourly) * 80}px`, minHeight: v > 0 ? "2px" : "0" }}
                    />
                    {h % 4 === 0 && (
                      <span className="text-zinc-600 text-xs">{h}h</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Top items */}
            <div className="bg-zinc-900 rounded-xl p-4">
              <p className="text-xs text-zinc-500 mb-3">Top Items</p>
              <div className="space-y-2">
                {stats.topItems.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-zinc-400 w-6 text-right font-mono text-xs">{item.qty}×</span>
                      <span>{item.name}</span>
                    </div>
                    <span className="text-zinc-400">{formatEur(item.revenue)}</span>
                  </div>
                ))}
                {stats.topItems.length === 0 && (
                  <p className="text-zinc-600 text-sm">No items yet.</p>
                )}
              </div>
            </div>

            {/* Shifts */}
            {stats.shifts.length > 0 && (
              <div className="bg-zinc-900 rounded-xl p-4">
                <p className="text-xs text-zinc-500 mb-3">Shifts</p>
                <div className="space-y-2">
                  {stats.shifts.map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-zinc-400">
                          {fmtTime(s.openedAt)} → {s.closedAt ? fmtTime(s.closedAt) : "open"}
                        </span>
                        <span className="text-zinc-600 ml-2">{s.openedBy}</span>
                      </div>
                      <div className="text-right">
                        {s.orderCount != null && <span className="text-zinc-400">{s.orderCount} orders</span>}
                        {s.totalRevenue != null && <span className="ml-2">{formatEur(s.totalRevenue)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audit log */}
            <div className="bg-zinc-900 rounded-xl p-4">
              <p className="text-xs text-zinc-500 mb-3">Audit Log</p>
              {stats.auditLogs.length === 0 ? (
                <p className="text-zinc-600 text-sm">No audit events today.</p>
              ) : (
                <div className="space-y-1.5">
                  {stats.auditLogs.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3 text-xs">
                      <span className="text-zinc-600 shrink-0">{fmtTime(entry.createdAt)}</span>
                      <span className={`px-1.5 py-0.5 rounded font-medium shrink-0 ${
                        entry.action === "void" ? "bg-red-950 text-red-400"
                        : entry.action === "comp" ? "bg-purple-950 text-purple-400"
                        : "bg-zinc-800 text-zinc-400"
                      }`}>{entry.action}</span>
                      <span className="text-zinc-300">{entry.actor}</span>
                      {entry.detail && (
                        <span className="text-zinc-600 truncate font-mono">{entry.detail}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
