import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [totalOrders, todayOrders, totalRevenue] = await Promise.all([
      prisma.posOrder.count({ where: { voided: false } }),
      prisma.posOrder.count({ where: { voided: false, createdAt: { gte: today } } }),
      prisma.posOrder.aggregate({ where: { voided: false }, _sum: { total: true } }),
    ])

    return NextResponse.json({
      ok: true,
      db: "connected",
      totalOrders,
      todayOrders,
      totalRevenueCents: totalRevenue._sum.total ?? 0,
    })
  } catch (err) {
    return NextResponse.json({ ok: false, db: "error", error: String(err) }, { status: 500 })
  }
}
