import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/db"
import { PACKAGES, PackageKey } from "@/lib/config"

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: "Webhook signature failed" }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const pkg = (session.metadata?.package ?? "") as PackageKey
    const item = PACKAGES[pkg]
    if (!item) return NextResponse.json({ ok: true })

    const name = session.customer_details?.name ?? "Guest"
    const email = session.customer_details?.email ?? ""

    await prisma.order.upsert({
      where: { stripeId: session.id },
      update: {},
      create: {
        stripeId: session.id,
        name,
        email,
        package: pkg,
        amount: item.price,
        source: "presale",
      },
    })
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent
    if (pi.metadata?.source !== "terminal") return NextResponse.json({ ok: true })

    await prisma.order.upsert({
      where: { stripeId: pi.id },
      update: {},
      create: {
        stripeId: pi.id,
        name: pi.metadata?.name ?? "Walk-in",
        email: pi.metadata?.email ?? "",
        package: pi.metadata?.package ?? "unknown",
        amount: pi.amount,
        source: "terminal",
      },
    })
  }

  return NextResponse.json({ ok: true })
}
