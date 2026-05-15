"use client"

import { useState } from "react"
import { PACKAGES, EVENT_NAME, EVENT_DATE, EVENT_LOCATION } from "@/lib/config"

export default function SalesPage() {
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleCheckout() {
    if (!selected) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: selected }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError("Something went wrong. Try again.")
      }
    } catch {
      setError("Something went wrong. Try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-black">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="w-full h-32 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-700 mb-6">
            <span className="text-zinc-500 text-sm">[ Event graphic — swap ready ]</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">{EVENT_NAME}</h1>
          <p className="text-zinc-400 text-sm">{EVENT_DATE} · {EVENT_LOCATION}</p>
        </div>

        <div className="space-y-3">
          {Object.entries(PACKAGES).map(([key, pkg]) => (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className={`w-full rounded-xl border-2 p-5 text-left transition-all ${
                selected === key
                  ? "border-purple-500 bg-purple-950"
                  : "border-zinc-700 bg-zinc-900 hover:border-zinc-500"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white text-lg">{pkg.label}</p>
                  <p className="text-zinc-400 text-sm">{pkg.drinks} drink ticket{pkg.drinks > 1 ? "s" : ""}</p>
                </div>
                <span className="text-2xl font-bold text-white">{pkg.display}</span>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleCheckout}
          disabled={!selected || loading}
          className="w-full py-4 rounded-xl font-bold text-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-white"
        >
          {loading ? "Loading…" : "Buy Tickets"}
        </button>

        {error && <p className="text-red-400 text-center text-sm">{error}</p>}

        <p className="text-center text-zinc-600 text-xs">
          Secure payment via Stripe · Apple Pay accepted
        </p>
      </div>
    </main>
  )
}
