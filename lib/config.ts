export const PACKAGES = {
  bundle_5: {
    label: "5 Drink Bundle",
    drinks: 5,
    price: 2000,
    display: "$20",
  },
  single_1: {
    label: "1 Drink Ticket",
    drinks: 1,
    price: 500,
    display: "$5",
  },
} as const

export type PackageKey = keyof typeof PACKAGES

export const EVENT_NAME = "QUEER NIGHT"
export const EVENT_DATE = "Monday, May 19"
export const EVENT_LOCATION = "American Pavilion, Cannes"
