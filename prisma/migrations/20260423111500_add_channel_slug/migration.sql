-- AlterTable
ALTER TABLE "CodeSnippet" ADD COLUMN "channel_slug" TEXT;

-- CreateIndex
CREATE INDEX "CodeSnippet_channel_slug_createdAt_idx" ON "CodeSnippet"("channel_slug", "createdAt");
