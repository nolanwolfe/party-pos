import Link from "next/link"

export default function CancelPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-black text-center">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-white">Order cancelled</h1>
        <p className="text-zinc-400">No charge was made.</p>
        <Link
          href="/"
          className="inline-block mt-4 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-colors"
        >
          Try again
        </Link>
      </div>
    </main>
  )
}
