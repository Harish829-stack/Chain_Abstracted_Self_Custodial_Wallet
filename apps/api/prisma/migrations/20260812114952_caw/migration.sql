-- CreateEnum
CREATE TYPE "VM" AS ENUM ('EVM', 'SOLANA');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('CREATED', 'SIGNING', 'SIGNED', 'BROADCAST', 'PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auth_provider_id" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_addresses" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "vm" "VM" NOT NULL,
    "chain_id" TEXT NOT NULL,
    "address" TEXT NOT NULL,

    CONSTRAINT "wallet_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "chain_id" TEXT NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'CREATED',
    "tx_hash" TEXT,
    "metadata" JSONB,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_provider_id_key" ON "users"("auth_provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_addresses_wallet_id_vm_chain_id_key" ON "wallet_addresses"("wallet_id", "vm", "chain_id");

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_addresses" ADD CONSTRAINT "wallet_addresses_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
