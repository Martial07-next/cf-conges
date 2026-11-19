-- Droit aux tickets restaurant, réglable par personne (Administration →
-- Utilisateurs → Visibilité → « Tickets restaurant »). Activé par défaut.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ticketsRestau" BOOLEAN NOT NULL DEFAULT true;

-- Situation actuelle conservée : pas de tickets pour les Employeurs / RH,
-- le pôle Direction et les personnes masquées du planning équipe.
UPDATE "User" SET "ticketsRestau" = false
WHERE "role" = 'EMPLOYEUR' OR "pole" = 'Direction' OR "visiblePlanning" = false;
