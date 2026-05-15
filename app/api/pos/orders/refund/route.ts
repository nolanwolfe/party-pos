import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/db"
import { verifyPin } from "@/lib/pins"

export async function POST(req: NextRequest) {
  const { orderId, pin } = await req.json()

  const actor = verifyPin(String(pin ?? ""))
  if (!actor) return NextResponse.json({ error: "Invalid PIN" }, { status: 401 })

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

  await prisma.posAuditLog.create({
    data: {
      action: "void",
      actor: actor.label,
      detail: JSON.stringify({ orderId, total: order.total, tender: order.tender }),
    },
  })

  return NextResponse.json({ ok: true })
}
