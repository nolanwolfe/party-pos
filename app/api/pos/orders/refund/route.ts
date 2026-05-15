import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  const { orderId } = await req.json()

  const order = await prisma.posOrder.findUnique({ where: { id: orderId } })
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })
  if (order.voided) return NextResponse.json({ error: "Already voided" }, { status: 409 })

  if (order.stripeId) {
    await stripe.refunds.create({ payment_intent: order.stripeId })
  }

  await prisma.posOrder.update({
    where: { id: orderId },
    data: { voided: true, voidedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
