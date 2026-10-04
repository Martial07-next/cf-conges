ALTER TABLE "OsefBotFeedback"
ADD COLUMN "knowledgeId" TEXT;

CREATE INDEX "OsefBotFeedback_knowledgeId_utile_idx"
ON "OsefBotFeedback"("knowledgeId", "utile");

ALTER TABLE "OsefBotFeedback"
ADD CONSTRAINT "OsefBotFeedback_knowledgeId_fkey"
FOREIGN KEY ("knowledgeId") REFERENCES "OsefBotKnowledge"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
