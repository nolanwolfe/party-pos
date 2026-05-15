import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

const SAMPLE_ORDERS = [
  { name: "Jamie Rivera", email: "jamie@example.com", package: "bundle_5", amount: 2000, source: "presale" },
  { name: "Alex Chen", email: "alex@example.com", package: "single_1", amount: 500, source: "presale" },
  { name: "Sam Okafor", email: "sam@example.com", package: "bundle_5", amount: 2000, source: "presale" },
  { name: "Morgan Lee", email: "morgan@example.com", package: "single_1", amount: 500, source: "terminal" },
  { name: "Taylor Brooks", email: "taylor@example.com", package: "bundle_5", amount: 2000, source: "terminal" },
  { name: "Jordan Patel", email: "jordan@example.com", package: "single_1", amount: 500, source: "presale" },
  { name: "Casey Kim", email: "casey@example.com", package: "bundle_5", amount: 2000, source: "presale" },
  { name: "Riley Nguyen", email: "riley@example.com", package: "single_1", amount: 500, source: "terminal" },
]

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))

  if (body.seed) {
    const created = await Promise.all(
      SAMPLE_ORDERS.map((o) =>
        prisma.order.create({
          data: { ...o, stripeId: `test_${Date.now()}_${Math.random().toString(36).slice(2)}` },
        })
      )
    )
    return NextResponse.json({ created: created.length })
  }

  const { name, email, pkg, source } = body
  if (!name || !pkg) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

  const packages: Record<string, number> = { bundle_5: 2000, single_1: 500 }
  const amount = packages[pkg]
  if (!amount) return NextResponse.json({ error: "Invalid package" }, { status: 400 })

  const order = await prisma.order.create({
    data: {
      name,
      email: email || "",
      package: pkg,
      amount,
      source: source || "presale",
      stripeId: `test_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    },
  })

  return NextResponse.json(order)
}

export async function DELETE() {
  const { count } = await prisma.order.deleteMany({
    where: { stripeId: { startsWith: "test_" } },
  })
  return NextResponse.json({ deleted: count })
}
