import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get("date") // YYYY-MM-DD, defaults to today
  const showVoided = searchParams.get("voided") === "true"

  const day = date ? new Date(date) : new Date()
  const start = new Date(day)
  start.setHours(0, 0, 0, 0)
  const end = new Date(day)
  end.setHours(23, 59, 59, 999)

  const orders = await prisma.posOrder.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      ...(showVoided ? {} : {}), // always return all, client filters
    },
    orderBy: { createdAt: "desc" },
  })

  const activeOrders = orders.filter((o) => !o.voided)
  const revenue = activeOrders.reduce((sum, o) => sum + o.total, 0)
  const discounts = orders.reduce((sum, o) => sum + o.discount, 0)

  return NextResponse.json({ orders, revenue, discounts, count: activeOrders.length })
}
