"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { PACKAGES, PackageKey } from "@/lib/config"

type LogEntry = {
  id: string
  action: string
  createdAt: string
  order: {
    name: string
    package: string
    last4: string | null
  }
}

export default function LogPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/log")
      .then((r) => r.json())
      .then((d) => { setLogs(d); setLoading(false) })
  }, [])

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Pickup Log</h1>
            <p className="text-zinc-400 text-sm">Every check and uncheck, newest first</p>
          </div>
          <Link
            href="/"
            className="text-sm text-zinc-400 hover:text-white border border-zinc-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            ← Dashboard
          </Link>
        </div>

        {loading ? (
          <p className="text-zinc-500 text-center py-12">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="text-zinc-500 text-center py-12">No activity yet.</p>
        ) : (
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900 text-zinc-400 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Time</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Package</th>
                  <th className="px-4 py-3 text-left">Card</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-900 transition-colors">
                    <td className="px-4 py-3 text-zinc-400 text-xs">
                      {new Date(log.createdAt).toLocaleString("en-US", {
                        month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit"
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium">{log.order.name}</td>
                    <td className="px-4 py-3 text-zinc-400">
                      {PACKAGES[log.order.package as PackageKey]?.label ?? log.order.package}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 font-mono">
                      {log.order.last4 ? <>•••• {log.order.last4}</> : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        log.action === "checked"
                          ? "bg-green-950 text-green-400"
                          : "bg-red-950 text-red-400"
                      }`}>
                        {log.action === "checked" ? "✓ Picked up" : "✕ Unmarked"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </main>
  )
}
