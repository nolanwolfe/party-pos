import type { Metadata } from "next"
import Image from "next/image"
import { PACKAGES, EVENT_DATE, EVENT_LOCATION } from "@/lib/config"

export const metadata: Metadata = {
  title: "Queer Night — Drink Tickets",
}

export default function SalesPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "linear-gradient(135deg, #c026d3 0%, #7c3aed 40%, #2563eb 70%, #16a34a 100%)" }}>
      <div className="w-full max-w-sm space-y-6">

        {/* Banner */}
        <div className="w-full rounded-2xl overflow-hidden shadow-2xl">
          <Image
            src="/queernight-banner.jpg"
            alt="Queer Night 2026"
            width={800}
            height={300}
            className="w-full h-auto"
            priority
          />
        </div>

        <div className="text-center space-y-2">
          <p className="text-white font-semibold text-sm tracking-wide">9:00 PM · {EVENT_DATE} · {EVENT_LOCATION}</p>
<p className="text-white/70 text-sm">Free to all Festival and Marché badge holders</p>
        </div>

        {/* Package links */}
        <div className="space-y-3">
          {Object.entries(PACKAGES).map(([key, pkg]) => (
            <a
              key={key}
              href={pkg.paymentLink}
              target="_top"
              className="w-full rounded-xl border-2 border-white/30 bg-white/10 backdrop-blur-sm hover:border-white hover:bg-white/20 transition-all p-5 flex items-center justify-between"
            >
              <div>
                <p className="font-semibold text-white text-lg">{pkg.label}</p>
                <p className="text-white/70 text-sm">{pkg.drinks} drink ticket{pkg.drinks > 1 ? "s" : ""}</p>
              </div>
              <span className="text-2xl font-bold text-white">{pkg.display}</span>
            </a>
          ))}
        </div>

        <p className="text-center text-white/50 text-xs">
          Secure payment via Stripe · Apple Pay accepted
        </p>

        <div className="text-white/70 text-sm space-y-1">
          <p><span className="font-semibold text-white">1x Ticket</span> = Soft Drinks, Beer, &amp; Wine</p>
          <p><span className="font-semibold text-white">2x Tickets</span> = Mixed Drinks</p>
        </div>

        <p className="text-white/40 text-xs text-center leading-relaxed">
          *Drink tickets can be picked up from AmPav Staff after entry but do not guarantee expedited entry. No refunds for unused tickets.
        </p>
      </div>
    </main>
  )
}
