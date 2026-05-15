import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { pickedUp } = await req.json()

  const [order] = await Promise.all([
    prisma.order.update({
      where: { id },
      data: { pickedUp },
    }),
    prisma.pickupLog.create({
      data: {
        orderId: id,
        action: pickedUp ? "checked" : "unchecked",
      },
    }),
  ])

  return NextResponse.json(order)
}
