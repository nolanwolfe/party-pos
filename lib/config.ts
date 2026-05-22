export const PACKAGES = {
  bundle_5: {
    label: "5 Drink Bundle",
    drinks: 5,
    price: 2500,
    display: "€25",
    paymentLink: "https://buy.stripe.com/7sY00kfgW3SU9Ec7292VG09",
  },
  single_1: {
    label: "1 Drink Ticket",
    drinks: 1,
    price: 600,
    display: "€6",
    paymentLink: "https://buy.stripe.com/bJe14o3ye89acQo1HP2VG0a",
  },
} as const

// Maps Stripe payment link IDs to package keys
export const PAYMENT_LINK_PACKAGES: Record<string, string> = {
  plink_1TXkJJKeBvccJw2oKNAooP3E: "bundle_5",
  plink_1TXkTgKeBvccJw2o0joxCaQ0: "single_1",
}

export type PackageKey = keyof typeof PACKAGES

export const EVENT_NAME = "QUEER NIGHT"
export const EVENT_DATE = "Monday, May 18"
export const EVENT_LOCATION = "American Pavilion, Cannes"
