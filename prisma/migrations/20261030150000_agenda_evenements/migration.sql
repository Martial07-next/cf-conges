-- Agenda Direction simplifié : on ne saisit plus que les exceptions.
-- Remplace les tables par demi-journée et semaine type.
DROP TABLE IF EXISTS "AgendaDirectionModele";
DROP TABLE IF EXISTS "AgendaDirection";

CREATE TABLE IF NOT EXISTS "AgendaEvenement" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "dateDebut" TIMESTAMP(3) NOT NULL,
  "dateFin" TIMESTAMP(3) NOT NULL,
  "demiJournee" BOOLEAN NOT NULL DEFAULT false,
  "periode" TEXT,
  "statut" TEXT NOT NULL,
  "lieu" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgendaEvenement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AgendaEvenement_dateDebut_dateFin_idx" ON "AgendaEvenement"("dateDebut", "dateFin");

ALTER TABLE "AgendaEvenement"
  ADD CONSTRAINT "AgendaEvenement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Même protection que les autres tables (API publique Supabase fermée).
ALTER TABLE "AgendaEvenement" ENABLE ROW LEVEL SECURITY;
