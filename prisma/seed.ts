import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  await prisma.order.createMany({
    data: [
      {
        id: "seed_1",
        stripeId: "cs_test_seed_001",
        name: "Jessica Laurent",
        email: "jessica@example.com",
        package: "bundle_5",
        amount: 2000,
        source: "presale",
        pickedUp: false,
      },
      {
        id: "seed_2",
        stripeId: "cs_test_seed_002",
        name: "Marcus Chen",
        email: "marcus@example.com",
        package: "single_1",
        amount: 500,
        source: "presale",
        pickedUp: true,
      },
      {
        id: "seed_3",
        stripeId: "pi_test_seed_003",
        name: "Walk-in",
        email: "",
        package: "bundle_5",
        amount: 2000,
        source: "terminal",
        pickedUp: false,
      },
    ],
  })
  console.log("Seeded 3 test orders.")
}

main().catch(console.error).finally(() => prisma.$disconnect())
