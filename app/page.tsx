"use client"

import { useEffect, useState } from "react"
import { PACKAGES, PackageKey } from "@/lib/config"

type Order = {
  id: string
  name: string
  email: string
  package: string
  amount: number
  source: string
  last4: string | null
  pickedUp: boolean
  createdAt: string
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "presale", label: "Pre-Sale" },
  { key: "terminal", label: "Day-of" },
  { key: "pending", label: "Not Picked Up" },
]

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [alpha, setAlpha] = useState(false)
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null)
  const [receiptEmail, setReceiptEmail] = useState("")
  const [receiptSending, setReceiptSending] = useState(false)
  const [receiptDone, setReceiptDone] = useState(false)

  async function sendReceipt() {
    if (!receiptOrder || !receiptEmail) return
    setReceiptSending(true)
    await fetch("/api/orders/receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: receiptOrder.id, email: receiptEmail }),
    })
    setReceiptSending(false)
    setReceiptDone(true)
    setTimeout(() => { setReceiptOrder(null); setReceiptDone(false) }, 1500)
  }

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 30000)
    return () => clearInterval(interval)
  }, [filter])

  async function fetchOrders() {
    setLoading(true)
    const res = await fetch(`/api/orders?filter=${filter}`)
    const data = await res.json()
    setOrders(data)
    setLoading(false)
  }

  async function togglePickup(order: Order) {
    const updated = { ...order, pickedUp: !order.pickedUp }
    setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)))
    await fetch(`/api/orders/${order.id}/pickup`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pickedUp: updated.pickedUp }),
    })
  }

  const q = search.trim().toLowerCase()
  const filtered = orders
    .filter((o) =>
      q === "" ? true :
        o.name.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q) ||
        (o.last4 ?? "").includes(q)
    )
    .sort((a, b) => alpha ? a.name.localeCompare(b.name) : 0)

  const totalRevenue = orders.filter((o) => o.source !== "test").reduce((sum, o) => sum + o.amount, 0)
  const realOrders = orders.filter((o) => o.source !== "test")
  const pickedUp = realOrders.filter((o) => o.pickedUp).length

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-zinc-500 text-xs uppercase tracking-widest">Queer Night 2026</p>
            <h1 className="text-2xl font-bold">Queer Night</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-zinc-400 text-sm">Fulfillment Dashboard</p>
              <a
                href="/log"
                className="text-xs text-zinc-500 hover:text-white transition-colors"
              >
                View Log →
              </a>
            </div>
          </div>
          <button
            onClick={fetchOrders}
            className="text-sm text-zinc-400 hover:text-white border border-zinc-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-900 rounded-xl p-4">
            <p className="text-zinc-400 text-xs">Orders</p>
            <p className="text-2xl font-bold">{realOrders.length}</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4">
            <p className="text-zinc-400 text-xs">Revenue</p>
            <p className="text-2xl font-bold">€{(totalRevenue / 100).toFixed(0)}</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4">
            <p className="text-zinc-400 text-xs">Picked Up</p>
            <p className="text-2xl font-bold">{pickedUp}/{realOrders.length}</p>
          </div>
        </div>

        {/* Filters + Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filter === f.key
                    ? "bg-purple-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="sm:ml-auto flex gap-2">
            <button
              onClick={() => setAlpha((a) => !a)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                alpha ? "bg-purple-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              A→Z
            </button>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or card…"
              className="bg-zinc-800 rounded-lg px-4 py-1.5 text-sm placeholder-zinc-500 outline-none focus:ring-2 focus:ring-purple-500 w-full sm:w-80"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-zinc-500 text-center py-12">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-zinc-500 text-center py-12">No orders found.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900 text-zinc-400 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-center">Pick Up</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Name</th>
                  <th className="px-4 py-3 text-center">Tickets</th>
                  <th className="px-4 py-3 text-left">Card</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Package</th>
                  <th className="px-4 py-3 text-left">Source</th>
                  <th className="px-4 py-3 text-left">Time</th>
                  <th className="px-4 py-3 text-left">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filtered.map((order) => (
                  <tr key={order.id} className={`transition-colors ${order.pickedUp ? "opacity-40" : "hover:bg-zinc-900"}`}>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={order.pickedUp}
                        onChange={() => togglePickup(order)}
                        className="w-5 h-5 cursor-pointer accent-purple-500"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium max-w-[8rem] truncate">{order.name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block bg-purple-900 text-purple-200 font-bold rounded-lg px-3 py-0.5 text-sm">
                        {(PACKAGES[order.package as PackageKey]?.drinks ?? 1) * Math.round(order.amount / (PACKAGES[order.package as PackageKey]?.price ?? order.amount))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 font-mono">
                      {order.last4 ? <>•••• {order.last4}</> : "—"}
                    </td>
                    <td className="px-4 py-3">{order.source === "test" ? <span className="text-zinc-600">€0</span> : <>€{(order.amount / 100).toFixed(0)}</>}</td>
                    <td className="px-4 py-3">
                      {PACKAGES[order.package as PackageKey]?.label ?? order.package}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        order.source === "test"
                          ? "bg-zinc-800 text-zinc-500"
                          : order.source === "presale"
                          ? "bg-blue-950 text-blue-300"
                          : "bg-green-950 text-green-300"
                      }`}>
                        {order.source === "test" ? "Test" : order.source === "presale" ? "Pre-Sale" : "Day-of"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">
                      {new Date(order.createdAt).toLocaleString("en-US", {
                        month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => { setReceiptOrder(order); setReceiptEmail(order.email ?? ""); setReceiptDone(false) }}
                        className="text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-400 px-2 py-1 rounded transition-colors"
                      >
                        Send
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {search && (
          <p className="text-zinc-500 text-xs text-right">
            Showing {filtered.length} of {orders.length} orders
          </p>
        )}

      </div>

      {/* Receipt modal */}
      {receiptOrder && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={() => setReceiptOrder(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest">Send Receipt</p>
              <p className="text-lg font-semibold mt-1">{receiptOrder.name}</p>
              <p className="text-zinc-400 text-sm">{PACKAGES[receiptOrder.package as PackageKey]?.label ?? receiptOrder.package}</p>
            </div>
            <input
              type="email"
              value={receiptEmail}
              onChange={(e) => setReceiptEmail(e.target.value)}
              placeholder="Email address"
              autoFocus
              className="w-full bg-zinc-800 rounded-lg px-4 py-2.5 text-sm placeholder-zinc-500 outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="flex gap-2">
              <button onClick={() => setReceiptOrder(null)} className="flex-1 px-4 py-2 rounded-lg text-sm bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button
                onClick={sendReceipt}
                disabled={receiptSending || !receiptEmail}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition-colors"
              >
                {receiptDone ? "Sent ✓" : receiptSending ? "Sending…" : "Send Receipt"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
