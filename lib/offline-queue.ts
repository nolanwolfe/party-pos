// Offline queue for cash/comp transactions (card transactions can't be queued — Terminal requires online)
// Queued items are stored in localStorage and replayed when connectivity returns

const QUEUE_KEY = "ampav_offline_queue"

export type QueuedTransaction = {
  id: string
  items: { id: string; name: string; price: number; qty: number }[]
  modifier: string | null
  tender: "cash" | "comp"
  cashTendered?: number
  subtotal: number
  discount: number
  total: number
  queuedAt: string
}

export function enqueue(tx: Omit<QueuedTransaction, "id" | "queuedAt">): QueuedTransaction {
  const entry: QueuedTransaction = {
    ...tx,
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    queuedAt: new Date().toISOString(),
  }
  const queue = dequeue()
  queue.push(entry)
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  return entry
}

export function dequeue(): QueuedTransaction[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]")
  } catch {
    return []
  }
}

export function removeFromQueue(id: string) {
  const queue = dequeue().filter((q) => q.id !== id)
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY)
}
