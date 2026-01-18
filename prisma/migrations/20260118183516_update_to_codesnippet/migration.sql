/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "CodeSnippet" (
    "id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "rawCode" TEXT NOT NULL,
    "formattedCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeSnippet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CodeSnippet_createdAt_idx" ON "CodeSnippet"("createdAt");
