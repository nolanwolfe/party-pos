import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  const { orderId, email } = await req.json()
  if (!orderId || !email) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })

  try {
    let piId = order.stripeId

    // For checkout sessions, resolve to payment intent first
    if (order.stripeId.startsWith("cs_")) {
      const session = await stripe.checkout.sessions.retrieve(order.stripeId)
      piId = session.payment_intent as string
    }

    const pi = await stripe.paymentIntents.retrieve(piId, { expand: ["latest_charge"] })
    const charge = (pi as any).latest_charge
    if (!charge) return NextResponse.json({ error: "No charge found" }, { status: 400 })

    await stripe.charges.update(charge.id, { receipt_email: email })
    await fetch(`https://api.stripe.com/v1/charges/${charge.id}/send_receipt`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
