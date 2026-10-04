CREATE TABLE "OsefBotKnowledge" (
  "id" TEXT NOT NULL,
  "questionReference" TEXT NOT NULL,
  "reponse" TEXT NOT NULL,
  "formulations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "actionLabel" TEXT,
  "actionHref" TEXT,
  "actif" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OsefBotKnowledge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OsefBotKnowledge_actif_updatedAt_idx"
ON "OsefBotKnowledge"("actif", "updatedAt");

CREATE INDEX "OsefBotKnowledge_createdById_idx"
ON "OsefBotKnowledge"("createdById");

ALTER TABLE "OsefBotKnowledge"
ADD CONSTRAINT "OsefBotKnowledge_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
