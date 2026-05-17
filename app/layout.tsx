import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Queer Night — Fulfillment Dashboard",
  description: "American Pavilion, Cannes Film Festival",
  openGraph: {
    title: "Queer Night — Fulfillment Dashboard",
    description: "American Pavilion, Cannes Film Festival",
    images: [{ url: "https://party.timaeus.ai/queernight-banner.jpg", width: 800, height: 300 }],
  },
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
