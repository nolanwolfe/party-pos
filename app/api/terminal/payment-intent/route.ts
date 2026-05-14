import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { PACKAGES, PackageKey } from "@/lib/config"

export async function POST(req: NextRequest) {
  const { package: pkg, name, email } = await req.json()

  if (!PACKAGES[pkg as PackageKey]) {
    return NextResponse.json({ error: "Invalid package" }, { status: 400 })
  }

  const item = PACKAGES[pkg as PackageKey]

  const paymentIntent = await stripe.paymentIntents.create({
    amount: item.price,
    currency: "usd",
    payment_method_types: ["card_present"],
    capture_method: "manual",
    metadata: {
      source: "terminal",
      package: pkg,
      name: name ?? "Walk-in",
      email: email ?? "",
    },
  })

  return NextResponse.json({ clientSecret: paymentIntent.client_secret, id: paymentIntent.id })
}
