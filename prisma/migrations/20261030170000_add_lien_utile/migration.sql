-- Liens utiles du tableau de bord, gérés par l'administrateur.
CREATE TABLE IF NOT EXISTS "LienUtile" (
  "id" TEXT NOT NULL,
  "titre" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "description" TEXT,
  "categorie" TEXT NOT NULL DEFAULT 'SITE',
  "ordre" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LienUtile_pkey" PRIMARY KEY ("id")
);

-- Même protection que les autres tables (API publique Supabase fermée).
ALTER TABLE "LienUtile" ENABLE ROW LEVEL SECURITY;
