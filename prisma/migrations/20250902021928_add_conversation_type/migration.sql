-- CreateEnum
CREATE TYPE "public"."MessageType" AS ENUM ('REGULAR', 'CONVERSATION_STARTER');

-- AlterTable
ALTER TABLE "public"."messages" ADD COLUMN     "conversationType" "public"."MessageType" NOT NULL DEFAULT 'REGULAR';
