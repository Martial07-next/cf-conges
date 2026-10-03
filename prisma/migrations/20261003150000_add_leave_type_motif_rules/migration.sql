-- Enrichit les motifs d'absence avec leurs règles métier.
-- IF NOT EXISTS rend cette migration rejouable sans écraser les données existantes.
ALTER TABLE "LeaveTypeMotif"
  ADD COLUMN IF NOT EXISTS "remunere" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "ancienneteMinMois" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "plafondAnnuelJours" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "justificatifRequis" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "joursTravailles" BOOLEAN NOT NULL DEFAULT false;
