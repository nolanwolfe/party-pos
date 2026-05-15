import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  const { paymentIntentId }: { paymentIntentId: string } = await req.json()

  const pi = await stripe.paymentIntents.capture(paymentIntentId)

  const last4 = pi.charges?.data?.[0]?.payment_method_details?.card_present?.last4 ?? null

  await prisma.posOrder.create({
    data: {
      items: pi.metadata.items ?? "[]",
      subtotal: parseInt(pi.metadata.subtotal ?? "0"),
      modifier: pi.metadata.modifier || null,
      discount: parseInt(pi.metadata.discount ?? "0"),
      total: pi.amount,
      tender: "card",
      stripeId: pi.id,
      last4,
    },
  })

  return NextResponse.json({ status: pi.status })
}
