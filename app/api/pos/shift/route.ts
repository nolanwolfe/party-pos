import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// GET: current open shift (or null)
export async function GET() {
  const shift = await prisma.posShift.findFirst({
    where: { closedAt: null },
    orderBy: { openedAt: "desc" },
  })
  return NextResponse.json({ shift })
}

// POST: open a new shift
export async function POST(req: NextRequest) {
  const { openedBy } = await req.json().catch(() => ({}))

  const existing = await prisma.posShift.findFirst({ where: { closedAt: null } })
  if (existing) return NextResponse.json({ error: "A shift is already open" }, { status: 409 })

  const shift = await prisma.posShift.create({ data: { openedBy: openedBy ?? "staff" } })
  return NextResponse.json({ shift })
}

// PATCH: close current shift
export async function PATCH(req: NextRequest) {
  const { closedBy, notes } = await req.json().catch(() => ({}))

  const shift = await prisma.posShift.findFirst({ where: { closedAt: null } })
  if (!shift) return NextResponse.json({ error: "No open shift" }, { status: 404 })

  // Summarize orders in this shift period
  const orders = await prisma.posOrder.findMany({
    where: { voided: false, createdAt: { gte: shift.openedAt } },
  })
  const revenue = orders.reduce((s, o) => s + o.total, 0)

  const closed = await prisma.posShift.update({
    where: { id: shift.id },
    data: {
      closedAt: new Date(),
      closedBy: closedBy ?? "staff",
      orderCount: orders.length,
      totalRevenue: revenue,
      notes: notes ?? null,
    },
  })

  return NextResponse.json({ shift: closed, orderCount: orders.length, revenue })
}
