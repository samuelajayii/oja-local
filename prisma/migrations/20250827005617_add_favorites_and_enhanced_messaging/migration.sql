/*
  Warnings:

  - Added the required column `receiverId` to the `messages` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."listings" ADD COLUMN     "location" TEXT;

-- AlterTable
ALTER TABLE "public"."messages" ADD COLUMN     "isRead" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "receiverId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "location" TEXT;

-- CreateTable
CREATE TABLE "public"."favorites" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "favorites_userId_listingId_key" ON "public"."favorites"("userId", "listingId");

-- CreateIndex
CREATE INDEX "listings_status_createdAt_idx" ON "public"."listings"("status", "createdAt");

-- CreateIndex
CREATE INDEX "listings_categoryId_idx" ON "public"."listings"("categoryId");

-- CreateIndex
CREATE INDEX "listings_userId_idx" ON "public"."listings"("userId");

-- CreateIndex
CREATE INDEX "messages_receiverId_isRead_idx" ON "public"."messages"("receiverId", "isRead");

-- CreateIndex
CREATE INDEX "messages_listingId_idx" ON "public"."messages"("listingId");

-- AddForeignKey
ALTER TABLE "public"."favorites" ADD CONSTRAINT "favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."favorites" ADD CONSTRAINT "favorites_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "public"."listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
