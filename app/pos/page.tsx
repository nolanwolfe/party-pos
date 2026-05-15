"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { loadStripeTerminal, Terminal } from "@stripe/terminal-js"
import {
  BAR_ITEMS,
  CUISINE_ITEMS,
  MODIFIERS,
  cartSubtotal,
  applyModifier,
  formatEur,
  type MenuItem,
  type CartItem,
  type ModifierKey,
} from "@/lib/pos-config"

type Tab = "bar" | "cuisine"
type TerminalStatus = "idle" | "connecting" | "ready" | "collecting" | "cancelling" | "processing" | "success" | "error"

const CART_KEY = "ampav_pos_cart"
const MODIFIER_KEY = "ampav_pos_modifier"
// Abandon a collection after 2 minutes with no card tap
const COLLECT_TIMEOUT_MS = 120_000

function loadPersistedCart(): CartItem[] {
  if (typeof window === "undefined") return []
  try { return JSON.parse(localStorage.getItem(CART_KEY) ?? "[]") } catch { return [] }
}

function loadPersistedModifier(): ModifierKey | null {
  if (typeof window === "undefined") return null
  const v = localStorage.getItem(MODIFIER_KEY)
  return (v as ModifierKey) ?? null
}

function newIdempotencyKey() {
  return `pos-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export default function PosPage() {
  const [tab, setTab] = useState<Tab>("bar")
  const [cart, setCart] = useState<CartItem[]>([])
  const [modifier, setModifier] = useState<ModifierKey | null>(null)
  const [status, setStatus] = useState<TerminalStatus>("idle")
  const [statusMsg, setStatusMsg] = useState("")
  const [captureWarning, setCaptureWarning] = useState<string | null>(null)
  const [cashModal, setCashModal] = useState(false)
  const [cashInput, setCashInput] = useState("")

  const terminalRef = useRef<Terminal | null>(null)
  const pendingPiRef = useRef<string | null>(null)
  const collectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const readerLabelRef = useRef<string>("S700")

  useEffect(() => {
    setCart(loadPersistedCart())
    setModifier(loadPersistedModifier())
    initTerminal()
    return () => {
      if (collectTimeoutRef.current) clearTimeout(collectTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    if (modifier) localStorage.setItem(MODIFIER_KEY, modifier)
    else localStorage.removeItem(MODIFIER_KEY)
  }, [modifier])

  async function initTerminal() {
    setStatus("connecting")
    setStatusMsg("Connecting to reader…")
    try {
      const StripeTerminal = await loadStripeTerminal()
      if (!StripeTerminal) throw new Error("Failed to load Stripe Terminal SDK")

      const terminal = StripeTerminal.create({
        onFetchConnectionToken: async () => {
          const res = await fetch("/api/terminal/connection-token", { method: "POST" })
          const data = await res.json()
          return data.secret
        },
        onUnexpectedReaderDisconnect: () => {
          setStatus("error")
          setStatusMsg("Reader disconnected. Tap Reconnect.")
        },
      })

      const locationId = process.env.NEXT_PUBLIC_STRIPE_TERMINAL_LOCATION_ID
      const discoverResult = await terminal.discoverReaders({ location: locationId })

      if ("error" in discoverResult || !discoverResult.discoveredReaders?.length) {
        throw new Error("No reader found — make sure the S700 is on.")
      }

      const reader = discoverResult.discoveredReaders[0]
      const connectResult = await terminal.connectReader(reader)
      if ("error" in connectResult) throw new Error(connectResult.error.message)

      readerLabelRef.current = reader.label || "S700"
      terminalRef.current = terminal
      setStatus("ready")
      setStatusMsg(`Connected · ${readerLabelRef.current}`)
    } catch (err) {
      setStatus("error")
      setStatusMsg(err instanceof Error ? err.message : "Connection failed")
    }
  }

  async function cancelPendingPi() {
    const piId = pendingPiRef.current
    if (!piId) return
    pendingPiRef.current = null
    await fetch("/api/pos/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId: piId }),
    }).catch(() => {})
  }

  const handleCancelCollect = useCallback(async () => {
    if (!terminalRef.current) return
    setStatus("cancelling")
    setStatusMsg("Cancelling…")
    if (collectTimeoutRef.current) {
      clearTimeout(collectTimeoutRef.current)
      collectTimeoutRef.current = null
    }
    try {
      await terminalRef.current.cancelCollectPaymentMethod()
    } catch {
      // SDK may throw if already resolved
    }
    await cancelPendingPi()
    setStatus("ready")
    setStatusMsg(`Connected · ${readerLabelRef.current}`)
  }, [])

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id)
      if (existing) return prev.map((c) => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { item, qty: 1 }]
    })
  }

  function removeFromCart(itemId: string) {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === itemId)
      if (!existing) return prev
      if (existing.qty <= 1) return prev.filter((c) => c.item.id !== itemId)
      return prev.map((c) => c.item.id === itemId ? { ...c, qty: c.qty - 1 } : c)
    })
  }

  function clearCart() {
    setCart([])
    setModifier(null)
    setCaptureWarning(null)
  }

  function toggleModifier(key: ModifierKey) {
    setModifier((prev) => prev === key ? null : key)
  }

  const subtotal = cartSubtotal(cart)
  const { discount, total } = applyModifier(subtotal, modifier)
  const canCharge = status === "ready" && cart.length > 0 && total >= 50

  async function handleCashTender() {
    const cents = Math.round(parseFloat(cashInput) * 100)
    if (isNaN(cents) || cents < 0) return
    setCashModal(false)
    setCashInput("")

    const res = await fetch("/api/pos/tender", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart, modifier, tender: "cash", cashTendered: cents }),
    })
    const data = await res.json()
    if (!data.ok) { setStatusMsg("Cash tender failed"); return }

    const change = data.change ?? 0
    setStatus("success")
    setStatusMsg(change > 0 ? `Cash — change due: ${formatEur(change)}` : `Cash — exact. Thank you!`)
    clearCart()
    setTimeout(() => { setStatus("ready"); setStatusMsg(`Connected · ${readerLabelRef.current}`) }, 4000)
  }

  async function handleCompTender() {
    if (!confirm("Mark this order as complimentary (no charge)?")) return
    const res = await fetch("/api/pos/tender", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart, modifier, tender: "comp" }),
    })
    const data = await res.json()
    if (!data.ok) { setStatusMsg("Comp tender failed"); return }

    setStatus("success")
    setStatusMsg("Comp recorded — enjoy!")
    clearCart()
    setTimeout(() => { setStatus("ready"); setStatusMsg(`Connected · ${readerLabelRef.current}`) }, 3500)
  }

  async function handleCharge() {
    if (!canCharge || !terminalRef.current) return
    const terminal = terminalRef.current
    setCaptureWarning(null)

    const idempotencyKey = newIdempotencyKey()

    setStatus("collecting")
    setStatusMsg("Tap or insert card on reader…")

    let piId: string | null = null

    try {
      const piRes = await fetch("/api/pos/payment-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ items: cart, modifier }),
      })
      const piData = await piRes.json()
      if (piData.error) throw new Error(piData.error)

      piId = piData.id
      pendingPiRef.current = piId

      // Auto-cancel if customer doesn't tap in time
      collectTimeoutRef.current = setTimeout(() => {
        setStatusMsg("Timed out — cancelling…")
        handleCancelCollect()
      }, COLLECT_TIMEOUT_MS)

      const collectResult = await terminal.collectPaymentMethod(piData.clientSecret)

      if (collectTimeoutRef.current) {
        clearTimeout(collectTimeoutRef.current)
        collectTimeoutRef.current = null
      }

      if ("error" in collectResult) {
        pendingPiRef.current = null
        await cancelPendingPi()
        throw new Error(collectResult.error.message)
      }

      setStatus("processing")
      setStatusMsg("Processing…")

      const processResult = await terminal.processPayment(collectResult.paymentIntent)
      if ("error" in processResult) {
        await cancelPendingPi()
        throw new Error(processResult.error.message)
      }

      // PI is captured on Stripe side — network failure here means we succeeded but didn't log it
      const captureRes = await fetch("/api/pos/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId: piId }),
      })

      pendingPiRef.current = null

      if (!captureRes.ok) {
        // Payment went through but we failed to save — alert staff
        setCaptureWarning(`Payment captured (${piId}) but not logged. Note this ID for reconciliation.`)
      }

      setStatus("success")
      setStatusMsg(`Paid ${formatEur(total)} — thank you!`)
      clearCart()
      setTimeout(() => {
        setStatus("ready")
        setStatusMsg(`Connected · ${readerLabelRef.current}`)
      }, 3500)
    } catch (err) {
      if (collectTimeoutRef.current) {
        clearTimeout(collectTimeoutRef.current)
        collectTimeoutRef.current = null
      }
      const msg = err instanceof Error ? err.message : "Payment failed"
      setStatus("error")
      setStatusMsg(msg)
      setTimeout(() => {
        setStatus("ready")
        setStatusMsg(`Connected · ${readerLabelRef.current}`)
      }, 4000)
    }
  }

  const menuItems = tab === "bar" ? BAR_ITEMS : CUISINE_ITEMS
  const busy = status === "collecting" || status === "cancelling" || status === "processing"

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 shrink-0">
        <div>
          <h1 className="text-lg font-semibold tracking-wide">American Pavilion</h1>
          <p className="text-zinc-500 text-xs">
            Point of Sale · Cannes 2026 ·{" "}
            <a href="/pos/orders" className="hover:text-white transition-colors">Orders</a>
          </p>
        </div>
        <div className={`text-xs px-3 py-1.5 rounded-full font-medium ${
          status === "ready" ? "bg-green-950 text-green-400"
          : status === "success" ? "bg-purple-950 text-purple-300"
          : status === "error" ? "bg-red-950 text-red-400"
          : status === "collecting" ? "bg-yellow-950 text-yellow-300"
          : "bg-zinc-800 text-zinc-400"
        }`}>
          {statusMsg || status}
        </div>
      </header>

      {captureWarning && (
        <div className="bg-red-950 border-b border-red-800 text-red-300 text-xs px-6 py-2">
          {captureWarning}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left — Menu */}
        <div className="flex flex-col flex-1 overflow-hidden border-r border-zinc-800">
          {/* Tab bar */}
          <div className="flex border-b border-zinc-800 shrink-0">
            {(["bar", "cuisine"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  tab === t ? "text-white border-b-2 border-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {t === "bar" ? "Bar Menu" : "Cuisine"}
              </button>
            ))}
          </div>

          {/* Menu grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-3 gap-3">
              {menuItems.map((item) => {
                const inCart = cart.find((c) => c.item.id === item.id)
                return (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    disabled={busy}
                    className={`relative rounded-xl border p-4 text-left transition-all disabled:opacity-40 ${
                      inCart
                        ? "border-blue-500 bg-blue-950"
                        : "border-zinc-700 bg-zinc-900 hover:border-zinc-500 hover:bg-zinc-800"
                    }`}
                  >
                    {inCart && (
                      <span className="absolute top-2 right-2 bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {inCart.qty}
                      </span>
                    )}
                    <p className="font-medium text-sm leading-snug">{item.name}</p>
                    <p className="text-zinc-400 text-sm mt-1">{item.display}</p>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right — Cart */}
        <div className="w-72 flex flex-col shrink-0">
          {/* Cart items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {cart.length === 0 ? (
              <p className="text-zinc-600 text-sm text-center mt-8">Cart is empty</p>
            ) : (
              cart.map((c) => (
                <div key={c.item.id} className="flex items-center gap-2 text-sm">
                  <button
                    onClick={() => removeFromCart(c.item.id)}
                    disabled={busy}
                    className="text-zinc-600 hover:text-red-400 transition-colors text-lg leading-none disabled:opacity-30"
                    aria-label="Remove one"
                  >
                    −
                  </button>
                  <span className="text-zinc-400 w-4 text-center">{c.qty}</span>
                  <span className="flex-1 truncate">{c.item.name}</span>
                  <span className="text-zinc-400 shrink-0">{formatEur(c.item.price * c.qty)}</span>
                </div>
              ))
            )}
          </div>

          {/* Totals + modifiers + checkout */}
          <div className="border-t border-zinc-800 p-4 space-y-3 shrink-0">
            <div className="flex justify-between text-sm text-zinc-400">
              <span>Subtotal</span>
              <span>{formatEur(subtotal)}</span>
            </div>

            <div className="space-y-1.5">
              {MODIFIERS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => toggleModifier(m.key)}
                  disabled={busy || cart.length === 0}
                  className={`w-full text-xs py-2 px-3 rounded-lg text-left transition-colors disabled:opacity-30 ${
                    modifier === m.key
                      ? "bg-amber-900 text-amber-300 border border-amber-700"
                      : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {m.label} {m.pct < 100 ? `(${m.pct}% off)` : "(100% — void)"}
                </button>
              ))}
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-sm text-amber-400">
                <span>Discount</span>
                <span>−{formatEur(discount)}</span>
              </div>
            )}

            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatEur(total)}</span>
            </div>

            {/* Charge / Cancel */}
            {status === "collecting" ? (
              <button
                onClick={handleCancelCollect}
                className="w-full py-4 rounded-xl font-bold text-base bg-red-900 text-red-200 hover:bg-red-800 transition-colors"
              >
                Cancel Payment
              </button>
            ) : (
              <button
                onClick={handleCharge}
                disabled={!canCharge}
                className="w-full py-4 rounded-xl font-bold text-lg bg-white text-black hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                {status === "processing" || status === "cancelling"
                  ? status === "processing" ? "Processing…" : "Cancelling…"
                  : status === "success" ? "Done!"
                  : "Charge"}
              </button>
            )}

            {/* Cash and Comp tender buttons */}
            {status === "ready" && cart.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => { setCashInput(""); setCashModal(true) }}
                  className="flex-1 py-2 rounded-lg border border-zinc-600 text-zinc-400 hover:text-white hover:border-zinc-400 text-sm transition-colors"
                >
                  Cash
                </button>
                <button
                  onClick={handleCompTender}
                  className="flex-1 py-2 rounded-lg border border-zinc-600 text-zinc-400 hover:text-white hover:border-zinc-400 text-sm transition-colors"
                >
                  Comp
                </button>
              </div>
            )}

            {cart.length > 0 && !busy && status !== "success" && (
              <button
                onClick={clearCart}
                className="w-full py-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                Clear cart
              </button>
            )}

            {status === "error" && (
              <button
                onClick={initTerminal}
                className="w-full py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white text-sm transition-colors"
              >
                Reconnect reader
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cash tender modal */}
      {cashModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-xs space-y-4">
            <h2 className="font-semibold text-center">Cash Payment</h2>
            <div className="text-center">
              <p className="text-zinc-500 text-xs">Total due</p>
              <p className="text-3xl font-bold">{formatEur(total)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-zinc-500">Cash received (€)</p>
              <input
                type="number"
                min="0"
                step="0.01"
                value={cashInput}
                onChange={(e) => setCashInput(e.target.value)}
                autoFocus
                placeholder="0.00"
                className="w-full bg-zinc-800 text-white text-xl font-mono text-center rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-white"
              />
            </div>
            {cashInput && !isNaN(parseFloat(cashInput)) && (
              <div className={`text-center text-sm font-medium ${
                parseFloat(cashInput) * 100 >= total ? "text-green-400" : "text-red-400"
              }`}>
                {parseFloat(cashInput) * 100 >= total
                  ? `Change: ${formatEur(Math.round(parseFloat(cashInput) * 100) - total)}`
                  : `Short by ${formatEur(total - Math.round(parseFloat(cashInput) * 100))}`
                }
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setCashModal(false)}
                className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCashTender}
                disabled={!cashInput || isNaN(parseFloat(cashInput)) || parseFloat(cashInput) * 100 < total}
                className="flex-1 py-3 rounded-xl bg-white text-black font-bold hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Record
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
