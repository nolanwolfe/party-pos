import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Queer Night — Drink Tickets",
  description: "American Pavilion, Cannes Film Festival",
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🍸</text></svg>" },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-black text-white">{children}</body>
    </html>
  )
}
