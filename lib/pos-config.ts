export type MenuItem = {
  id: string
  name: string
  price: number // cents (EUR)
  display: string
}

export type CartItem = {
  item: MenuItem
  qty: number
}

export const BAR_ITEMS: MenuItem[] = [
  { id: "sparkling_white", name: "Sparkling White", price: 1200, display: "€12" },
  { id: "still_white", name: "Still White", price: 4000, display: "€40" },
]

export const CUISINE_ITEMS: MenuItem[] = [
  { id: "croissant", name: "Croissant", price: 400, display: "€4" },
  { id: "pain_chocolat", name: "Pain au chocolat", price: 450, display: "€4.50" },
  { id: "jambon_beurre", name: "Jambon-beurre", price: 900, display: "€9" },
  { id: "quiche", name: "Quiche slice", price: 700, display: "€7" },
  { id: "salade_nicoise", name: "Salade niçoise", price: 1400, display: "€14" },
  { id: "plat_du_jour", name: "Plat du jour", price: 1800, display: "€18" },
  { id: "espresso", name: "Espresso", price: 300, display: "€3" },
  { id: "cappuccino", name: "Cappuccino", price: 500, display: "€5" },
  { id: "sparkling_water", name: "Sparkling water", price: 400, display: "€4" },
  { id: "still_water", name: "Still water", price: 300, display: "€3" },
]

export type ModifierKey = "student" | "day_old" | "staff_void"

export const MODIFIERS: { key: ModifierKey; label: string; pct: number }[] = [
  { key: "student", label: "Student Discount", pct: 20 },
  { key: "day_old", label: "Day Old Sandwich", pct: 50 },
  { key: "staff_void", label: "Staff Void", pct: 100 },
]

export function cartSubtotal(cart: CartItem[]): number {
  return cart.reduce((sum, c) => sum + c.item.price * c.qty, 0)
}

export function applyModifier(subtotal: number, modifier: ModifierKey | null): { discount: number; total: number } {
  const mod = MODIFIERS.find((m) => m.key === modifier)
  const discount = mod ? Math.round(subtotal * (mod.pct / 100)) : 0
  return { discount, total: subtotal - discount }
}

export function formatEur(cents: number): string {
  if (cents % 100 === 0) return `€${cents / 100}`
  return `€${(cents / 100).toFixed(2)}`
}
