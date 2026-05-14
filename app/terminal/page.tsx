"use client"

import { useEffect, useState, useRef } from "react"
import { loadStripeTerminal, Terminal } from "@stripe/terminal-js"
import { PACKAGES, EVENT_NAME } from "@/lib/config"

type TerminalStatus = "idle" | "connecting" | "ready" | "collecting" | "processing" | "success" | "error"

export default function TerminalPage() {
  const [status, setStatus] = useState<TerminalStatus>("idle")
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const terminalRef = useRef<Terminal | null>(null)

  useEffect(() => {
    initTerminal()
  }, [])

  async function initTerminal() {
    setStatus("connecting")
    try {
      const StripeTerminal = await loadStripeTerminal()
      if (!StripeTerminal) throw new Error("Failed to load Stripe Terminal")

      const terminal = StripeTerminal.create({
        onFetchConnectionToken: async () => {
          const res = await fetch("/api/terminal/connection-token", { method: "POST" })
          const data = await res.json()
          return data.secret
        },
        onUnexpectedReaderDisconnect: () => {
          setStatus("error")
          setMessage("Reader disconnected. Refresh to reconnect.")
        },
      })

      const locationId = process.env.NEXT_PUBLIC_STRIPE_TERMINAL_LOCATION_ID
      const discoverResult = await terminal.discoverReaders({ location: locationId })

      if ("error" in discoverResult || !discoverResult.discoveredReaders?.length) {
        throw new Error("No reader found. Make sure the S700 is on and paired.")
      }

      const connectResult = await terminal.connectReader(discoverResult.discoveredReaders[0])
      if ("error" in connectResult) throw new Error(connectResult.error.message)

      terminalRef.current = terminal
      setStatus("ready")
      setMessage(`Connected to ${discoverResult.discoveredReaders[0].label || "reader"}`)
    } catch (err: unknown) {
      setStatus("error")
      setMessage(err instanceof Error ? err.message : "Connection failed")
    }
  }

  async function handleCharge() {
    if (!selectedPkg || !terminalRef.current) return
    const terminal = terminalRef.current

    setStatus("collecting")
    setMessage("Tap or insert card on reader…")

    try {
      const piRes = await fetch("/api/terminal/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: selectedPkg }),
      })
      const { clientSecret, id } = await piRes.json()

      const collectResult = await terminal.collectPaymentMethod(clientSecret)
      if ("error" in collectResult) throw new Error(collectResult.error.message)

      setStatus("processing")
      setMessage("Processing…")

      const processResult = await terminal.processPayment(collectResult.paymentIntent)
      if ("error" in processResult) throw new Error(processResult.error.message)

      await fetch("/api/terminal/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId: id }),
      })

      setStatus("success")
      setMessage("Payment complete! Hand over ticket.")
      setTimeout(() => {
        setStatus("ready")
        setMessage("")
        setSelectedPkg(null)
      }, 3000)
    } catch (err: unknown) {
      setStatus("error")
      setMessage(err instanceof Error ? err.message : "Payment failed")
      setTimeout(() => { setStatus("ready"); setMessage("") }, 4000)
    }
  }

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">{EVENT_NAME}</h1>
          <p className="text-zinc-500 text-sm">Staff Terminal</p>
        </div>

        {/* Connection status */}
        <div className={`text-center text-sm px-3 py-2 rounded-lg ${
          status === "ready" || status === "collecting" || status === "processing"
            ? "bg-green-950 text-green-400"
            : status === "success"
            ? "bg-purple-950 text-purple-300"
            : status === "error"
            ? "bg-red-950 text-red-400"
            : "bg-zinc-900 text-zinc-400"
        }`}>
          {status === "connecting" && "Connecting to reader…"}
          {status === "idle" && "Initializing…"}
          {message || (status === "ready" ? "Ready" : "")}
        </div>

        {/* Package selection */}
        {(status === "ready") && (
          <div className="space-y-3">
            {Object.entries(PACKAGES).map(([key, pkg]) => (
              <button
                key={key}
                onClick={() => setSelectedPkg(key)}
                className={`w-full rounded-xl border-2 p-5 text-left transition-all ${
                  selectedPkg === key
                    ? "border-purple-500 bg-purple-950"
                    : "border-zinc-700 bg-zinc-900 hover:border-zinc-500"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">{pkg.label}</p>
                    <p className="text-zinc-400 text-sm">{pkg.drinks} ticket{pkg.drinks > 1 ? "s" : ""}</p>
                  </div>
                  <span className="text-xl font-bold text-white">{pkg.display}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {status === "ready" && (
          <button
            onClick={handleCharge}
            disabled={!selectedPkg}
            className="w-full py-4 rounded-xl font-bold text-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-white"
          >
            Charge
          </button>
        )}

        {(status === "collecting" || status === "processing") && (
          <div className="text-center text-zinc-400 text-sm animate-pulse py-4">
            {status === "collecting" ? "Waiting for card…" : "Processing…"}
          </div>
        )}

        {status === "error" && (
          <button
            onClick={initTerminal}
            className="w-full py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white transition-colors"
          >
            Retry connection
          </button>
        )}
      </div>
    </main>
  )
}
