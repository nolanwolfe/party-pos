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
  pickedUp: boolean
  createdAt: string
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "presale", label: "Presale" },
  { key: "terminal", label: "Day-of" },
  { key: "pending", label: "Not Picked Up" },
]

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState("all")
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

  const totalRevenue = orders.reduce((sum, o) => sum + o.amount, 0)
  const pickedUp = orders.filter((o) => o.pickedUp).length

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Queer Night</h1>
            <p className="text-zinc-400 text-sm">Fulfillment Dashboard</p>
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

        {/* Filters */}
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

        {/* Table */}
        {loading ? (
          <p className="text-zinc-500 text-center py-12">Loading…</p>
        ) : orders.length === 0 ? (
          <p className="text-zinc-500 text-center py-12">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900 text-zinc-400 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Package</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Source</th>
                  <th className="px-4 py-3 text-left">Time</th>
                  <th className="px-4 py-3 text-center">Picked Up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {orders.map((order) => (
                  <tr key={order.id} className={`transition-colors ${order.pickedUp ? "opacity-50" : "hover:bg-zinc-900"}`}>
                    <td className="px-4 py-3 font-medium">{order.name}</td>
                    <td className="px-4 py-3 text-zinc-400">{order.email || "—"}</td>
                    <td className="px-4 py-3">
                      {PACKAGES[order.package as PackageKey]?.label ?? order.package}
                    </td>
                    <td className="px-4 py-3">${(order.amount / 100).toFixed(0)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        order.source === "presale"
                          ? "bg-blue-950 text-blue-300"
                          : "bg-green-950 text-green-300"
                      }`}>
                        {order.source === "presale" ? "Presale" : "Day-of"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">
                      {new Date(order.createdAt).toLocaleString("en-US", {
                        month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
                      })}
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
      </div>
    </main>
  )
}
