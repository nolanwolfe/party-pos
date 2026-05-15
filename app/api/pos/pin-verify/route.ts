import { NextRequest, NextResponse } from "next/server"
import { verifyPin } from "@/lib/pins"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  const { pin, action, detail } = await req.json()

  const entry = verifyPin(String(pin ?? ""))
  if (!entry) return NextResponse.json({ ok: false, error: "Invalid PIN" }, { status: 401 })

  // Log the verified action
  await prisma.posAuditLog.create({
    data: { action, actor: entry.label, detail: detail ? JSON.stringify(detail) : null },
  })

  return NextResponse.json({ ok: true, label: entry.label, role: entry.role })
}
