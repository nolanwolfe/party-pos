import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { cartSubtotal, applyModifier, type CartItem, type ModifierKey } from "@/lib/pos-config"

type TenderType = "cash" | "comp"

export async function POST(req: NextRequest) {
  const {
    items,
    modifier,
    tender,
    cashTendered,
  }: {
    items: CartItem[]
    modifier: ModifierKey | null
    tender: TenderType
    cashTendered?: number
  } = await req.json()

  if (!items?.length) return NextResponse.json({ error: "Cart is empty" }, { status: 400 })
  if (tender !== "cash" && tender !== "comp") return NextResponse.json({ error: "Invalid tender" }, { status: 400 })

  const subtotal = cartSubtotal(items)
  const { discount, total } = applyModifier(subtotal, modifier)

  const order = await prisma.posOrder.create({
    data: {
      items: JSON.stringify(items.map((c) => ({ id: c.item.id, name: c.item.name, price: c.item.price, qty: c.qty }))),
      subtotal,
      modifier: modifier ?? null,
      discount,
      total: tender === "comp" ? 0 : total,
      tender,
      cashTendered: tender === "cash" ? (cashTendered ?? null) : null,
    },
  })

  const change = tender === "cash" && cashTendered != null ? cashTendered - total : null

  return NextResponse.json({ ok: true, orderId: order.id, total, change })
}
