"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { formatEur } from "@/lib/pos-config"

type Order = {
  items: { id: string; name: string; price: number; qty: number }[]
  subtotal: number
  modifier: string | null
  discount: number
  total: number
  tender: string
  createdAt: string
}

const MODIFIER_LABELS: Record<string, string> = {
  student: "Student Discount (20%)",
  day_old: "Day Old Sandwich (50%)",
  staff_void: "Staff Void (100%)",
}

function ReceiptContent() {
  const params = useSearchParams()
  const [order, setOrder] = useState<Order | null>(null)

  useEffect(() => {
    const raw = params.get("data")
    if (!raw) return
    try { setOrder(JSON.parse(decodeURIComponent(raw))) } catch { /* ignore */ }
  }, [params])

  useEffect(() => {
    if (order) setTimeout(() => window.print(), 400)
  }, [order])

  if (!order) return <p className="text-center py-12 text-zinc-500">No receipt data.</p>

  return (
    <div className="font-mono text-sm max-w-xs mx-auto py-8 px-4 space-y-3 text-black">
      <div className="text-center space-y-0.5">
        <p className="font-bold text-base">American Pavilion</p>
        <p>Cannes Film Festival 2026</p>
        <p className="text-xs text-zinc-500">{new Date(order.createdAt).toLocaleString("fr-FR")}</p>
      </div>

      <hr className="border-zinc-400" />

      <div className="space-y-1">
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between">
            <span>{item.qty}× {item.name}</span>
            <span>{formatEur(item.price * item.qty)}</span>
          </div>
        ))}
      </div>

      <hr className="border-zinc-400" />

      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatEur(order.subtotal)}</span>
        </div>
        {order.discount > 0 && (
          <div className="flex justify-between text-zinc-600">
            <span>{MODIFIER_LABELS[order.modifier ?? ""] ?? order.modifier}</span>
            <span>−{formatEur(order.discount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold">
          <span>Total</span>
          <span>{formatEur(order.total)}</span>
        </div>
        <div className="flex justify-between text-zinc-500 text-xs">
          <span>Tender</span>
          <span className="capitalize">{order.tender}</span>
        </div>
      </div>

      <hr className="border-zinc-400" />

      <p className="text-center text-xs text-zinc-500">Thank you — enjoy the festival!</p>
    </div>
  )
}

export default function ReceiptPage() {
  return (
    <Suspense fallback={<p className="text-center py-12 text-zinc-400">Loading…</p>}>
      <ReceiptContent />
    </Suspense>
  )
}
