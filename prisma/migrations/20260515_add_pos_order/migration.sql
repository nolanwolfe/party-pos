-- CreateTable
CREATE TABLE "PosOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "items" TEXT NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "modifier" TEXT,
    "discount" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "tender" TEXT NOT NULL DEFAULT 'card',
    "stripeId" TEXT,
    "last4" TEXT,
    "cashTendered" INTEGER,
    "voided" BOOLEAN NOT NULL DEFAULT false,
    "voidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "PosOrder_stripeId_key" ON "PosOrder"("stripeId");
