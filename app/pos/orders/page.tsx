"use client"

import { useEffect, useState } from "react"
import { formatEur } from "@/lib/pos-config"
import { PinDialog } from "@/components/PinDialog"

type PosOrderRow = {
  id: string
  items: string
  subtotal: number
  modifier: string | null
  discount: number
  total: number
  tender: string
  stripeId: string | null
  last4: string | null
  cashTendered: number | null
  voided: boolean
  voidedAt: string | null
  createdAt: string
}

type Summary = {
  orders: PosOrderRow[]
  revenue: number
  discounts: number
  count: number
}

function timeStr(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
}

function itemsSummary(itemsJson: string): string {
  try {
    const items: { name: string; qty: number }[] = JSON.parse(itemsJson)
    return items.map((i) => `${i.qty}× ${i.name}`).join(", ")
  } catch {
    return itemsJson
  }
}

const MODIFIER_LABELS: Record<string, string> = {
  student: "Student 20%",
  day_old: "Day Old 50%",
  staff_void: "Staff Void",
}

export default function PosOrdersPage() {
  const [data, setData] = useState<Summary | null>(null)
  const [showVoided, setShowVoided] = useState(false)
  const [loading, setLoading] = useState(true)
  const [voidingId, setVoidingId] = useState<string | null>(null)
  const [pinTarget, setPinTarget] = useState<string | null>(null) // orderId awaiting PIN

  const today = new Date().toISOString().slice(0, 10)

  async function fetchOrders() {
    setLoading(true)
    const res = await fetch(`/api/pos/orders?date=${today}`)
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  async function handleVoidWithPin(pin: string) {
    if (!pinTarget) return
    const orderId = pinTarget
    setVoidingId(orderId)
    setPinTarget(null)
    const res = await fetch("/api/pos/orders/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, pin }),
    })
    const data = await res.json()
    setVoidingId(null)
    if (!res.ok) throw new Error(data.error ?? "Void failed")
    await fetchOrders()
  }

  const displayed = data?.orders.filter((o) => showVoided || !o.voided) ?? []

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-4">
          <a href="/pos" className="text-zinc-500 hover:text-white text-sm transition-colors">← POS</a>
          <h1 className="text-xl font-semibold">Today's Orders</h1>
          <div className="ml-auto flex gap-2">
            <a
              href={`/api/pos/export?date=${today}`}
              className="text-xs text-zinc-500 hover:text-white border border-zinc-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              Export CSV
            </a>
            <button
              onClick={fetchOrders}
              className="text-xs text-zinc-500 hover:text-white border border-zinc-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        {data && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-900 rounded-xl p-4">
              <p className="text-zinc-500 text-xs">Transactions</p>
              <p className="text-2xl font-bold">{data.count}</p>
            </div>
            <div className="bg-zinc-900 rounded-xl p-4">
              <p className="text-zinc-500 text-xs">Revenue</p>
              <p className="text-2xl font-bold">{formatEur(data.revenue)}</p>
            </div>
            <div className="bg-zinc-900 rounded-xl p-4">
              <p className="text-zinc-500 text-xs">Discounts Given</p>
              <p className="text-2xl font-bold">{formatEur(data.discounts)}</p>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showVoided}
              onChange={(e) => setShowVoided(e.target.checked)}
              className="accent-red-500"
            />
            Show voided
          </label>
          <span className="text-zinc-700">·</span>
          <span className="text-xs text-zinc-600">{displayed.length} shown</span>
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-zinc-600 text-center py-12">Loading…</p>
        ) : displayed.length === 0 ? (
          <p className="text-zinc-600 text-center py-12">No orders yet today.</p>
        ) : (
          <div className="space-y-2">
            {displayed.map((order) => (
              <div
                key={order.id}
                className={`rounded-xl border p-4 transition-opacity ${
                  order.voided
                    ? "border-zinc-800 opacity-40"
                    : "border-zinc-700 bg-zinc-900"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-zinc-500">{timeStr(order.createdAt)}</span>
                      {order.modifier && (
                        <span className="text-xs bg-amber-900 text-amber-300 px-2 py-0.5 rounded-full">
                          {MODIFIER_LABELS[order.modifier] ?? order.modifier}
                        </span>
                      )}
                      {order.voided && (
                        <span className="text-xs bg-red-950 text-red-400 px-2 py-0.5 rounded-full">Voided</span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-300 truncate">{itemsSummary(order.items)}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        order.tender === "cash" ? "bg-green-950 text-green-400"
                        : order.tender === "comp" ? "bg-purple-950 text-purple-400"
                        : "bg-zinc-800 text-zinc-400"
                      }`}>
                        {order.tender === "cash" ? "Cash" : order.tender === "comp" ? "Comp" : "Card"}
                      </span>
                      {order.last4 && (
                        <span className="text-xs text-zinc-600 font-mono">•••• {order.last4}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold">{formatEur(order.total)}</p>
                    {order.discount > 0 && (
                      <p className="text-xs text-amber-500">−{formatEur(order.discount)}</p>
                    )}
                    {!order.voided && (
                      <button
                        onClick={() => setPinTarget(order.id)}
                        disabled={voidingId === order.id}
                        className="mt-2 text-xs text-red-500 hover:text-red-300 transition-colors disabled:opacity-40"
                      >
                        {voidingId === order.id ? "Voiding…" : "Void"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {pinTarget && (
        <PinDialog
          title="Confirm Void — Enter PIN"
          onConfirm={handleVoidWithPin}
          onCancel={() => setPinTarget(null)}
        />
      )}
    </main>
  )
}
