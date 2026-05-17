import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/db"
import { PACKAGES, PackageKey, PAYMENT_LINK_PACKAGES } from "@/lib/config"

async function getCardDetails(paymentIntentId: string | null): Promise<{ last4: string | null; cardName: string | null }> {
  if (!paymentIntentId) return { last4: null, cardName: null }
  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge"],
    }) as Stripe.PaymentIntent & { latest_charge?: Stripe.Charge | null }
    const charge = pi.latest_charge ?? null
    const pmd = charge?.payment_method_details
    const last4 = pmd?.card_present?.last4 ?? pmd?.card?.last4 ?? null
    const cardName = pmd?.card_present?.cardholder_name ?? null
    return { last4, cardName }
  } catch {
    return { last4: null, cardName: null }
  }
}

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
    const name = (session.customer_details?.name ?? "Guest").trim()
    const email = session.customer_details?.email ?? ""
    const { last4 } = await getCardDetails(session.payment_intent as string | null)

    // Payment link purchase
    if (session.payment_link) {
      const pkg = PAYMENT_LINK_PACKAGES[session.payment_link as string]
      if (!pkg) return NextResponse.json({ ok: true })

      await prisma.order.upsert({
        where: { stripeId: session.id },
        update: {},
        create: {
          stripeId: session.id,
          name,
          email,
          package: pkg,
          amount: session.amount_total ?? PACKAGES[pkg as PackageKey].price,
          source: "presale",
          last4,
        },
      })
      return NextResponse.json({ ok: true })
    }

    // Custom checkout (has package metadata)
    const pkg = (session.metadata?.package ?? "") as PackageKey
    const item = PACKAGES[pkg]
    if (!item) return NextResponse.json({ ok: true })

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
        last4,
      },
    })
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent
    if (pi.metadata?.source !== "terminal") return NextResponse.json({ ok: true })

    const { last4, cardName } = await getCardDetails(pi.id)

    await prisma.order.upsert({
      where: { stripeId: pi.id },
      update: {},
      create: {
        stripeId: pi.id,
        name: pi.metadata?.name || cardName || "Walk-in",
        email: pi.metadata?.email ?? "",
        package: pi.metadata?.package ?? "unknown",
        amount: pi.amount,
        source: "terminal",
        last4,
      },
    })
  }

  return NextResponse.json({ ok: true })
}
