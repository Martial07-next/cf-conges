CREATE TABLE "OsefBotFeedback" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "reponse" TEXT NOT NULL,
  "utile" BOOLEAN,
  "commentaire" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ratedAt" TIMESTAMP(3),
  CONSTRAINT "OsefBotFeedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OsefBotFeedback_utile_createdAt_idx" ON "OsefBotFeedback"("utile", "createdAt");
CREATE INDEX "OsefBotFeedback_userId_createdAt_idx" ON "OsefBotFeedback"("userId", "createdAt");

ALTER TABLE "OsefBotFeedback" ADD CONSTRAINT "OsefBotFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
