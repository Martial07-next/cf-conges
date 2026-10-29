-- Décision de la direction : autoriser (ou non) le travail un jour férié.
CREATE TABLE IF NOT EXISTS "JourFerieOuverture" (
  "id" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "ouvert" BOOLEAN NOT NULL,
  "decideParId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JourFerieOuverture_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "JourFerieOuverture_date_key" ON "JourFerieOuverture"("date");

-- Même protection que les autres tables (API publique Supabase fermée).
ALTER TABLE "JourFerieOuverture" ENABLE ROW LEVEL SECURITY;
