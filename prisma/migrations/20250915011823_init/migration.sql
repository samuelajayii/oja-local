-- CreateEnum
CREATE TYPE "public"."ContentStatus" AS ENUM ('APPROVED', 'PENDING_REVIEW', 'REJECTED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "public"."AnalysisType" AS ENUM ('MODERATION', 'TEXT_EXTRACTION', 'CATEGORIZATION', 'COMPREHENSIVE');

-- CreateEnum
CREATE TYPE "public"."ConversationStatus" AS ENUM ('ACTIVE', 'TRANSACTION_PENDING', 'TRANSACTION_COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."TransactionStatus" AS ENUM ('PENDING', 'SELLER_CONFIRMED', 'BUYER_CONFIRMED', 'COMPLETED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."NotificationType" ADD VALUE 'TRANSACTION_CONFIRMED';
ALTER TYPE "public"."NotificationType" ADD VALUE 'TRANSACTION_COMPLETED';
ALTER TYPE "public"."NotificationType" ADD VALUE 'CONTENT_FLAGGED';
ALTER TYPE "public"."NotificationType" ADD VALUE 'ANALYSIS_COMPLETE';

-- AlterTable
ALTER TABLE "public"."conversations" ADD COLUMN     "status" "public"."ConversationStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "public"."listings" ADD COLUMN     "aiCategoryConfidence" DECIMAL(65,30),
ADD COLUMN     "contentStatus" "public"."ContentStatus" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN     "extractedText" TEXT,
ADD COLUMN     "moderationFlags" TEXT[],
ADD COLUMN     "visionAnalysis" JSONB;

-- CreateTable
CREATE TABLE "public"."image_analyses" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "analysisType" "public"."AnalysisType" NOT NULL,
    "analysisResult" JSONB NOT NULL,
    "safeContent" BOOLEAN NOT NULL DEFAULT true,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "confidenceScore" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "image_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transactions" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "agreedPrice" DECIMAL(65,30) NOT NULL,
    "status" "public"."TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "sellerConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "buyerConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "image_analyses_listingId_idx" ON "public"."image_analyses"("listingId");

-- CreateIndex
CREATE INDEX "image_analyses_safeContent_idx" ON "public"."image_analyses"("safeContent");

-- CreateIndex
CREATE INDEX "image_analyses_needsReview_idx" ON "public"."image_analyses"("needsReview");

-- CreateIndex
CREATE INDEX "image_analyses_analysisType_idx" ON "public"."image_analyses"("analysisType");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_listingId_key" ON "public"."transactions"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_conversationId_key" ON "public"."transactions"("conversationId");

-- CreateIndex
CREATE INDEX "transactions_sellerId_idx" ON "public"."transactions"("sellerId");

-- CreateIndex
CREATE INDEX "transactions_buyerId_idx" ON "public"."transactions"("buyerId");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "public"."transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_createdAt_idx" ON "public"."transactions"("createdAt");

-- CreateIndex
CREATE INDEX "listings_contentStatus_idx" ON "public"."listings"("contentStatus");

-- AddForeignKey
ALTER TABLE "public"."image_analyses" ADD CONSTRAINT "image_analyses_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "public"."listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "public"."listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
