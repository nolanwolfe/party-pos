import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const filter = searchParams.get("filter")

  const where =
    filter === "presale"
      ? { source: "presale" }
      : filter === "terminal"
      ? { source: "terminal" }
      : filter === "pending"
      ? { pickedUp: false }
      : {}

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      package: true,
      amount: true,
      source: true,
      last4: true,
      pickedUp: true,
      createdAt: true,
    },
  })

  return NextResponse.json(orders)
}
