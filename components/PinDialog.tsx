"use client"

import { useState } from "react"

type Props = {
  title: string
  onConfirm: (pin: string) => Promise<void>
  onCancel: () => void
}

export function PinDialog({ title, onConfirm, onCancel }: Props) {
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError("")
    setLoading(true)
    try {
      await onConfirm(pin)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid PIN")
      setPin("")
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && pin.length >= 4) handleSubmit()
    if (e.key === "Escape") onCancel()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-xs space-y-4">
        <h2 className="font-semibold text-center text-white">{title}</h2>
        <input
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
          onKeyDown={handleKey}
          autoFocus
          placeholder="Enter PIN"
          className="w-full bg-zinc-800 text-white text-xl font-mono text-center tracking-widest rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-white"
        />
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={pin.length < 4 || loading}
            className="flex-1 py-3 rounded-xl bg-white text-black font-bold hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  )
}
