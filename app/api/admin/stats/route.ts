import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get("date")

  const day = date ? new Date(date) : new Date()
  const start = new Date(day); start.setHours(0, 0, 0, 0)
  const end = new Date(day); end.setHours(23, 59, 59, 999)

  const [orders, shifts, auditLogs] = await Promise.all([
    prisma.posOrder.findMany({ where: { createdAt: { gte: start, lte: end } }, orderBy: { createdAt: "asc" } }),
    prisma.posShift.findMany({ where: { openedAt: { gte: start, lte: end } }, orderBy: { openedAt: "desc" } }),
    prisma.posAuditLog.findMany({ where: { createdAt: { gte: start, lte: end } }, orderBy: { createdAt: "desc" }, take: 50 }),
  ])

  const active = orders.filter((o) => !o.voided)
  const revenue = active.reduce((s, o) => s + o.total, 0)
  const discounts = orders.reduce((s, o) => s + o.discount, 0)
  const voids = orders.filter((o) => o.voided).length
  const byTender = { card: 0, cash: 0, comp: 0 }
  active.forEach((o) => { byTender[o.tender as keyof typeof byTender] = (byTender[o.tender as keyof typeof byTender] ?? 0) + o.total })

  // Top items
  const itemCounts: Record<string, { name: string; qty: number; revenue: number }> = {}
  active.forEach((o) => {
    try {
      const items = JSON.parse(o.items) as { id: string; name: string; price: number; qty: number }[]
      items.forEach((item) => {
        if (!itemCounts[item.id]) itemCounts[item.id] = { name: item.name, qty: 0, revenue: 0 }
        itemCounts[item.id].qty += item.qty
        itemCounts[item.id].revenue += item.price * item.qty
      })
    } catch { /* skip malformed */ }
  })
  const topItems = Object.values(itemCounts).sort((a, b) => b.qty - a.qty).slice(0, 10)

  // Hourly revenue buckets
  const hourly: number[] = Array(24).fill(0)
  active.forEach((o) => {
    const h = new Date(o.createdAt).getHours()
    hourly[h] += o.total
  })

  return NextResponse.json({
    date: start.toISOString().slice(0, 10),
    summary: { transactions: active.length, revenue, discounts, voids, byTender },
    topItems,
    hourly,
    shifts,
    auditLogs,
  })
}
