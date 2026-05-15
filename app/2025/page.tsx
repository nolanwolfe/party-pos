"use client"

import { useState } from "react"
import Link from "next/link"

export default function TestPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [pkg, setPkg] = useState("bundle_5")
  const [source, setSource] = useState("presale")
  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(false)

  async function seedSample() {
    setLoading(true)
    setStatus("")
    const res = await fetch("/api/test-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seed: true }),
    })
    const data = await res.json()
    setStatus(`✓ Created ${data.created} sample orders`)
    setLoading(false)
  }

  async function addOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!name) return
    setLoading(true)
    setStatus("")
    const res = await fetch("/api/test-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, pkg, source }),
    })
    if (res.ok) {
      setStatus(`✓ Added order for ${name}`)
      setName("")
      setEmail("")
    } else {
      setStatus("Error adding order")
    }
    setLoading(false)
  }

  async function clearAll() {
    if (!confirm("Delete all test orders?")) return
    setLoading(true)
    const res = await fetch("/api/test-orders", { method: "DELETE" })
    const data = await res.json()
    setStatus(`✓ Deleted ${data.deleted} test orders`)
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">

        <div className="text-center space-y-1">
          <div className="inline-block px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-semibold tracking-widest mb-4">
            TEST MODE — 2025 DATA
          </div>
          <h1 className="text-3xl font-bold">Queer Night Test</h1>
          <p className="text-zinc-400 text-sm">Create fake orders to test the dashboard and pickup flow</p>
        </div>

        {/* Seed button */}
        <div className="bg-zinc-900 rounded-xl p-5 space-y-3">
          <p className="font-semibold text-sm">Quick seed — 8 sample orders</p>
          <p className="text-zinc-400 text-xs">Mix of presale and day-of, different packages</p>
          <button
            onClick={seedSample}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 font-semibold transition-colors"
          >
            {loading ? "Working…" : "Create Sample Orders"}
          </button>
        </div>

        {/* Manual form */}
        <form onSubmit={addOrder} className="bg-zinc-900 rounded-xl p-5 space-y-4">
          <p className="font-semibold text-sm">Or add one manually</p>

          <div className="space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name *"
              className="w-full bg-zinc-800 rounded-lg px-4 py-2.5 text-sm placeholder-zinc-500 outline-none focus:ring-2 focus:ring-purple-500"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (optional)"
              className="w-full bg-zinc-800 rounded-lg px-4 py-2.5 text-sm placeholder-zinc-500 outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {["bundle_5", "single_1"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPkg(p)}
                className={`py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                  pkg === p ? "border-purple-500 bg-purple-950" : "border-zinc-700 bg-zinc-800"
                }`}
              >
                {p === "bundle_5" ? "5 Bundle — $20" : "1 Ticket — $5"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {["presale", "terminal"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSource(s)}
                className={`py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                  source === s ? "border-blue-500 bg-blue-950" : "border-zinc-700 bg-zinc-800"
                }`}
              >
                {s === "presale" ? "Presale" : "Day-of"}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || !name}
            className="w-full py-3 rounded-xl bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 font-semibold text-sm transition-colors"
          >
            Add Order
          </button>
        </form>

        {status && (
          <p className={`text-center text-sm ${status.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>
            {status}
          </p>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          <Link
            href="/dashboard"
            className="flex-1 py-3 rounded-xl border border-purple-500 text-purple-400 hover:bg-purple-950 text-center text-sm font-semibold transition-colors"
          >
            View Dashboard →
          </Link>
          <button
            onClick={clearAll}
            disabled={loading}
            className="flex-1 py-3 rounded-xl border border-red-800 text-red-400 hover:bg-red-950 text-sm font-semibold transition-colors disabled:opacity-40"
          >
            Clear Test Data
          </button>
        </div>

      </div>
    </main>
  )
}
