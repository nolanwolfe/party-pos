import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import type { QueuedTransaction } from "@/lib/offline-queue"

export async function POST(req: NextRequest) {
  const { transactions }: { transactions: QueuedTransaction[] } = await req.json()
  if (!transactions?.length) return NextResponse.json({ saved: 0 })

  let saved = 0
  const errors: string[] = []

  for (const tx of transactions) {
    try {
      await prisma.posOrder.create({
        data: {
          items: JSON.stringify(tx.items),
          subtotal: tx.subtotal,
          modifier: tx.modifier,
          discount: tx.discount,
          total: tx.total,
          tender: tx.tender,
          cashTendered: tx.cashTendered ?? null,
          createdAt: new Date(tx.queuedAt),
        },
      })
      saved++
    } catch (e) {
      errors.push(`${tx.id}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return NextResponse.json({ saved, errors })
}
