import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { PACKAGES, PackageKey } from "@/lib/config"

export async function POST(req: NextRequest) {
  const { package: pkg } = await req.json()

  if (!PACKAGES[pkg as PackageKey]) {
    return NextResponse.json({ error: "Invalid package" }, { status: 400 })
  }

  const item = PACKAGES[pkg as PackageKey]
  const baseUrl = `https://${req.headers.get("host")}`

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    billing_address_collection: "auto",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: item.price,
          product_data: {
            name: `Queer Night — ${item.label}`,
            description: `${item.drinks} drink ticket${item.drinks > 1 ? "s" : ""} · AmPav Cannes`,
          },
        },
      },
    ],
    success_url: `${baseUrl}/success`,
    cancel_url: `${baseUrl}/cancel`,
    metadata: {
      package: pkg,
    },
  })

  return NextResponse.json({ url: session.url })
}
