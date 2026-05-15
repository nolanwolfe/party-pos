import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get("date")

  const day = date ? new Date(date) : new Date()
  const start = new Date(day)
  start.setHours(0, 0, 0, 0)
  const end = new Date(day)
  end.setHours(23, 59, 59, 999)

  const orders = await prisma.posOrder.findMany({
    where: { createdAt: { gte: start, lte: end } },
    orderBy: { createdAt: "asc" },
  })

  const rows = [
    ["Time", "Tender", "Items", "Modifier", "Subtotal (€)", "Discount (€)", "Total (€)", "Card Last4", "Voided", "Stripe ID"],
    ...orders.map((o) => {
      const items = (() => {
        try {
          return (JSON.parse(o.items) as { name: string; qty: number }[])
            .map((i) => `${i.qty}x ${i.name}`)
            .join("; ")
        } catch { return o.items }
      })()
      return [
        new Date(o.createdAt).toLocaleTimeString("fr-FR"),
        o.tender,
        items,
        o.modifier ?? "",
        (o.subtotal / 100).toFixed(2),
        (o.discount / 100).toFixed(2),
        (o.total / 100).toFixed(2),
        o.last4 ?? "",
        o.voided ? "yes" : "no",
        o.stripeId ?? "",
      ]
    }),
  ]

  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")
  const filename = `ampav-pos-${start.toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
