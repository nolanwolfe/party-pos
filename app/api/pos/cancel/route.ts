import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"

export async function POST(req: NextRequest) {
  const { paymentIntentId } = await req.json()
  if (!paymentIntentId) return NextResponse.json({ error: "Missing paymentIntentId" }, { status: 400 })

  try {
    await stripe.paymentIntents.cancel(paymentIntentId)
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    // Already canceled or captured — not an error for our purposes
    const msg = err instanceof Error ? err.message : "unknown"
    return NextResponse.json({ ok: false, reason: msg })
  }
}
