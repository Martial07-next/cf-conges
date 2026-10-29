-- Agenda libre des Employeurs / RH et du pôle Direction (par demi-journée).
CREATE TABLE IF NOT EXISTS "AgendaDirection" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "periode" TEXT NOT NULL,
  "statut" TEXT NOT NULL,
  "lieu" TEXT,
  "note" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgendaDirection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AgendaDirection_userId_date_periode_key" ON "AgendaDirection"("userId", "date", "periode");
CREATE INDEX IF NOT EXISTS "AgendaDirection_date_idx" ON "AgendaDirection"("date");

ALTER TABLE "AgendaDirection"
  ADD CONSTRAINT "AgendaDirection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Même protection que les autres tables (API publique Supabase fermée).
ALTER TABLE "AgendaDirection" ENABLE ROW LEVEL SECURITY;
