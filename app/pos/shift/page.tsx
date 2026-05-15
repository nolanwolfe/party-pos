"use client"

import { useEffect, useState } from "react"
import { formatEur } from "@/lib/pos-config"

type Shift = {
  id: string
  openedAt: string
  closedAt: string | null
  openedBy: string
  closedBy: string | null
  orderCount: number | null
  totalRevenue: number | null
  notes: string | null
}

function elapsed(from: string, to?: string | null): string {
  const ms = (to ? new Date(to) : new Date()).getTime() - new Date(from).getTime()
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
}

export default function ShiftPage() {
  const [shift, setShift] = useState<Shift | null>(null)
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState(false)
  const [notes, setNotes] = useState("")
  const [result, setResult] = useState<{ orderCount: number; revenue: number } | null>(null)

  async function fetchShift() {
    setLoading(true)
    const res = await fetch("/api/pos/shift")
    const data = await res.json()
    setShift(data.shift)
    setLoading(false)
  }

  useEffect(() => { fetchShift() }, [])

  async function openShift() {
    const res = await fetch("/api/pos/shift", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openedBy: "staff" }),
    })
    const data = await res.json()
    if (data.error) { alert(data.error); return }
    setShift(data.shift)
    setResult(null)
  }

  async function closeShift() {
    setClosing(true)
    const res = await fetch("/api/pos/shift", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ closedBy: "staff", notes }),
    })
    const data = await res.json()
    setClosing(false)
    if (data.error) { alert(data.error); return }
    setResult({ orderCount: data.orderCount, revenue: data.revenue })
    setShift(null)
    setNotes("")
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-md mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <a href="/pos" className="text-zinc-500 hover:text-white text-sm transition-colors">← POS</a>
          <h1 className="text-xl font-semibold">Shift Management</h1>
        </div>

        {loading ? (
          <p className="text-zinc-500 text-center py-12">Loading…</p>
        ) : shift ? (
          <div className="space-y-5">
            {/* Current shift */}
            <div className="bg-zinc-900 border border-green-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs bg-green-950 text-green-400 px-2 py-0.5 rounded-full font-medium">Shift Open</span>
                <span className="text-zinc-500 text-xs">{elapsed(shift.openedAt)} elapsed</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Opened</span>
                  <span>{fmtTime(shift.openedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">By</span>
                  <span>{shift.openedBy}</span>
                </div>
              </div>
            </div>

            {/* Close shift */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Close Shift</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Shift notes (optional)"
                rows={3}
                className="w-full bg-zinc-800 rounded-xl px-4 py-3 text-sm placeholder-zinc-600 outline-none focus:ring-2 focus:ring-white resize-none"
              />
              <button
                onClick={closeShift}
                disabled={closing}
                className="w-full py-4 rounded-xl bg-red-900 text-red-200 hover:bg-red-800 font-bold disabled:opacity-40 transition-colors"
              >
                {closing ? "Closing…" : "Close Shift & Print Summary"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Shift closed / result */}
            {result && (
              <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 space-y-3">
                <p className="font-semibold text-center">Shift Closed</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-800 rounded-xl p-4 text-center">
                    <p className="text-zinc-500 text-xs">Transactions</p>
                    <p className="text-2xl font-bold">{result.orderCount}</p>
                  </div>
                  <div className="bg-zinc-800 rounded-xl p-4 text-center">
                    <p className="text-zinc-500 text-xs">Revenue</p>
                    <p className="text-2xl font-bold">{formatEur(result.revenue)}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 space-y-4">
              <p className="text-zinc-400 text-sm text-center">No shift is open.</p>
              <button
                onClick={openShift}
                className="w-full py-4 rounded-xl bg-white text-black font-bold hover:bg-zinc-200 transition-colors"
              >
                Open New Shift
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
