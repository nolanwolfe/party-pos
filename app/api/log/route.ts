import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  const logs = await prisma.pickupLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      order: {
        select: { name: true, package: true, last4: true },
      },
    },
  })
  return NextResponse.json(logs)
}
