"use client"

import { useEffect, useState } from "react"
import { dequeue, removeFromQueue } from "./offline-queue"

export function useOnlineStatus() {
  const [online, setOnline] = useState(true)
  const [draining, setDraining] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  function refreshCount() {
    setPendingCount(dequeue().length)
  }

  useEffect(() => {
    setOnline(navigator.onLine)
    refreshCount()

    const onOnline = () => {
      setOnline(true)
      drainQueue()
    }
    const onOffline = () => setOnline(false)

    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)
    return () => {
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
    }
  }, [])

  async function drainQueue() {
    const queue = dequeue()
    if (!queue.length) { refreshCount(); return }
    setDraining(true)
    try {
      const res = await fetch("/api/pos/drain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: queue }),
      })
      if (res.ok) {
        const { saved } = await res.json()
        // Remove only the ones that were successfully saved
        // (saved count matches order, assume all-or-nothing per tx)
        queue.slice(0, saved).forEach((q) => removeFromQueue(q.id))
      }
    } catch {
      // Still offline or server error — leave queue intact
    } finally {
      setDraining(false)
      refreshCount()
    }
  }

  return { online, draining, pendingCount, drainQueue, refreshCount }
}
