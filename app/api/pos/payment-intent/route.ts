import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { cartSubtotal, applyModifier, type CartItem, type ModifierKey } from "@/lib/pos-config"

export async function POST(req: NextRequest) {
  const { items, modifier }: { items: CartItem[]; modifier: ModifierKey | null } = await req.json()
  const idempotencyKey = req.headers.get("Idempotency-Key") ?? undefined

  if (!items?.length) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 })
  }

  const subtotal = cartSubtotal(items)
  const { discount, total } = applyModifier(subtotal, modifier)

  if (total < 50) {
    return NextResponse.json({ error: "Total too low" }, { status: 400 })
  }

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: total,
      currency: "eur",
      payment_method_types: ["card_present"],
      capture_method: "manual",
      metadata: {
        source: "pos",
        items: JSON.stringify(items.map((c) => ({ id: c.item.id, name: c.item.name, price: c.item.price, qty: c.qty }))),
        modifier: modifier ?? "",
        subtotal: String(subtotal),
        discount: String(discount),
      },
    },
    idempotencyKey ? { idempotencyKey } : undefined,
  )

  return NextResponse.json({ clientSecret: paymentIntent.client_secret, id: paymentIntent.id, subtotal, discount, total })
}
