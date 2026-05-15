"use client"

import { useEffect, useState, useRef } from "react"
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
type TerminalStatus = "idle" | "connecting" | "ready" | "collecting" | "processing" | "success" | "error"

const CART_KEY = "ampav_pos_cart"
const MODIFIER_KEY = "ampav_pos_modifier"

function loadPersistedCart(): CartItem[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) ?? "[]")
  } catch {
    return []
  }
}

function loadPersistedModifier(): ModifierKey | null {
  if (typeof window === "undefined") return null
  const v = localStorage.getItem(MODIFIER_KEY)
  return (v as ModifierKey) ?? null
}

export default function PosPage() {
  const [tab, setTab] = useState<Tab>("bar")
  const [cart, setCart] = useState<CartItem[]>([])
  const [modifier, setModifier] = useState<ModifierKey | null>(null)
  const [status, setStatus] = useState<TerminalStatus>("idle")
  const [statusMsg, setStatusMsg] = useState("")
  const terminalRef = useRef<Terminal | null>(null)

  // Hydrate from localStorage after mount
  useEffect(() => {
    setCart(loadPersistedCart())
    setModifier(loadPersistedModifier())
    initTerminal()
  }, [])

  // Persist cart on change
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

      const connectResult = await terminal.connectReader(discoverResult.discoveredReaders[0])
      if ("error" in connectResult) throw new Error(connectResult.error.message)

      terminalRef.current = terminal
      setStatus("ready")
      setStatusMsg(`Connected · ${discoverResult.discoveredReaders[0].label || "S700"}`)
    } catch (err) {
      setStatus("error")
      setStatusMsg(err instanceof Error ? err.message : "Connection failed")
    }
  }

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id)
      if (existing) {
        return prev.map((c) => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c)
      }
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
  }

  function toggleModifier(key: ModifierKey) {
    setModifier((prev) => prev === key ? null : key)
  }

  const subtotal = cartSubtotal(cart)
  const { discount, total } = applyModifier(subtotal, modifier)
  const canCharge = status === "ready" && cart.length > 0 && total >= 50

  async function handleCharge() {
    if (!canCharge || !terminalRef.current) return
    const terminal = terminalRef.current

    setStatus("collecting")
    setStatusMsg("Tap or insert card on reader…")

    try {
      const piRes = await fetch("/api/pos/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart, modifier }),
      })
      const piData = await piRes.json()
      if (piData.error) throw new Error(piData.error)

      const { clientSecret, id } = piData

      const collectResult = await terminal.collectPaymentMethod(clientSecret)
      if ("error" in collectResult) throw new Error(collectResult.error.message)

      setStatus("processing")
      setStatusMsg("Processing…")

      const processResult = await terminal.processPayment(collectResult.paymentIntent)
      if ("error" in processResult) throw new Error(processResult.error.message)

      await fetch("/api/pos/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId: id }),
      })

      setStatus("success")
      setStatusMsg(`Paid ${formatEur(total)} — thank you!`)
      clearCart()
      setTimeout(() => {
        setStatus("ready")
        setStatusMsg(`Connected · ${terminalRef.current ? "S700" : "reader"}`)
      }, 3500)
    } catch (err) {
      setStatus("error")
      setStatusMsg(err instanceof Error ? err.message : "Payment failed")
      setTimeout(() => {
        setStatus("ready")
        setStatusMsg("Ready")
      }, 4000)
    }
  }

  const menuItems = tab === "bar" ? BAR_ITEMS : CUISINE_ITEMS
  const busy = status === "collecting" || status === "processing"

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 shrink-0">
        <div>
          <h1 className="text-lg font-semibold tracking-wide">American Pavilion</h1>
          <p className="text-zinc-500 text-xs">Point of Sale · Cannes 2026</p>
        </div>
        <div className={`text-xs px-3 py-1.5 rounded-full font-medium ${
          status === "ready" ? "bg-green-950 text-green-400"
          : status === "success" ? "bg-purple-950 text-purple-300"
          : status === "error" ? "bg-red-950 text-red-400"
          : "bg-zinc-800 text-zinc-400"
        }`}>
          {statusMsg || status}
        </div>
      </header>

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
                  tab === t
                    ? "text-white border-b-2 border-white"
                    : "text-zinc-500 hover:text-zinc-300"
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
            {/* Subtotal */}
            <div className="flex justify-between text-sm text-zinc-400">
              <span>Subtotal</span>
              <span>{formatEur(subtotal)}</span>
            </div>

            {/* Modifiers */}
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

            {/* Discount line */}
            {discount > 0 && (
              <div className="flex justify-between text-sm text-amber-400">
                <span>Discount</span>
                <span>−{formatEur(discount)}</span>
              </div>
            )}

            {/* Total */}
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatEur(total)}</span>
            </div>

            {/* Charge */}
            <button
              onClick={handleCharge}
              disabled={!canCharge}
              className="w-full py-4 rounded-xl font-bold text-lg bg-white text-black hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {busy
                ? status === "collecting" ? "Waiting for card…" : "Processing…"
                : status === "success" ? "Done!"
                : "Charge"}
            </button>

            {/* Clear */}
            {cart.length > 0 && !busy && (
              <button
                onClick={clearCart}
                className="w-full py-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                Clear cart
              </button>
            )}

            {/* Reconnect on error */}
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
    </main>
  )
}
