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

  useEffect(() => {
    fetchOrders()
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
  const filtered = orders.filter((o) =>
    q === "" ? true :
      o.name.toLowerCase().includes(q) ||
      o.email.toLowerCase().includes(q) ||
      (o.last4 ?? "").includes(q)
  )

  const totalRevenue = orders.reduce((sum, o) => sum + o.amount, 0)
  const pickedUp = orders.filter((o) => o.pickedUp).length

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
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
            <p className="text-2xl font-bold">{orders.length}</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4">
            <p className="text-zinc-400 text-xs">Revenue</p>
            <p className="text-2xl font-bold">${(totalRevenue / 100).toFixed(0)}</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4">
            <p className="text-zinc-400 text-xs">Picked Up</p>
            <p className="text-2xl font-bold">{pickedUp}/{orders.length}</p>
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
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or card…"
            className="sm:ml-auto bg-zinc-800 rounded-lg px-4 py-1.5 text-sm placeholder-zinc-500 outline-none focus:ring-2 focus:ring-purple-500 w-full sm:w-80"
          />
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
                  <th className="px-4 py-3 text-left">Time</th>
                  <th className="px-4 py-3 text-left">Source</th>
                  <th className="px-4 py-3 text-left">Package</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Card</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-center">Tickets</th>
                  <th className="px-4 py-3 text-center">Picked Up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filtered.map((order) => (
                  <tr key={order.id} className={`transition-colors ${order.pickedUp ? "opacity-40" : "hover:bg-zinc-900"}`}>
                    <td className="px-4 py-3 text-zinc-400 text-xs">
                      {new Date(order.createdAt).toLocaleString("en-US", {
                        month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        order.source === "presale"
                          ? "bg-blue-950 text-blue-300"
                          : "bg-green-950 text-green-300"
                      }`}>
                        {order.source === "presale" ? "Presale" : "Day-of"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {PACKAGES[order.package as PackageKey]?.label ?? order.package}
                    </td>
                    <td className="px-4 py-3">${(order.amount / 100).toFixed(0)}</td>
                    <td className="px-4 py-3 text-zinc-400 font-mono">
                      {order.last4 ? <>•••• {order.last4}</> : "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{order.email || "—"}</td>
                    <td className="px-4 py-3 font-medium">{order.name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block bg-purple-900 text-purple-200 font-bold rounded-lg px-3 py-0.5 text-sm">
                        {(PACKAGES[order.package as PackageKey]?.drinks ?? 1) * Math.round(order.amount / (PACKAGES[order.package as PackageKey]?.price ?? order.amount))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={order.pickedUp}
                        onChange={() => togglePickup(order)}
                        className="w-5 h-5 cursor-pointer accent-purple-500"
                      />
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
    </main>
  )
}
