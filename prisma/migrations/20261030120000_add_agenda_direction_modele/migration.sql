-- Semaine type de l'agenda des Employeurs / RH et du pôle Direction.
CREATE TABLE IF NOT EXISTS "AgendaDirectionModele" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "jour" INTEGER NOT NULL,
  "periode" TEXT NOT NULL,
  "statut" TEXT NOT NULL,
  "lieu" TEXT,
  "note" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgendaDirectionModele_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AgendaDirectionModele_userId_jour_periode_key" ON "AgendaDirectionModele"("userId", "jour", "periode");

ALTER TABLE "AgendaDirectionModele"
  ADD CONSTRAINT "AgendaDirectionModele_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Même protection que les autres tables (API publique Supabase fermée).
ALTER TABLE "AgendaDirectionModele" ENABLE ROW LEVEL SECURITY;
