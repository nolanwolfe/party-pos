import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const logs = await prisma.posAuditLog.findMany({
    where: { createdAt: { gte: today } },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return NextResponse.json({ logs })
}
