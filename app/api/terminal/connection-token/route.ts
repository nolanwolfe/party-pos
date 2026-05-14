import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"

export async function POST() {
  const token = await stripe.terminal.connectionTokens.create()
  return NextResponse.json({ secret: token.secret })
}
