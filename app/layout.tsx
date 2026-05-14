import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Queer Night — Drink Tickets",
  description: "American Pavilion, Cannes Film Festival",
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
