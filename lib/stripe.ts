import Stripe from "stripe"

export const stripe = new (Stripe as any)(process.env.STRIPE_SECRET_KEY!) as Stripe
