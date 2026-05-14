import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"

export async function POST(req: NextRequest) {
  const { paymentIntentId } = await req.json()
  const pi = await stripe.paymentIntents.capture(paymentIntentId)
  return NextResponse.json({ status: pi.status })
}
