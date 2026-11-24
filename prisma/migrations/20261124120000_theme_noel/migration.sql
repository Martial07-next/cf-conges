-- Thème de Noël : nouvelle apparence, appliquée par défaut à tout le monde.
-- Les apparences « clair » et « sombre » restent disponibles dans le profil.
ALTER TABLE "User" ALTER COLUMN "theme" SET DEFAULT 'noel';
UPDATE "User" SET "theme" = 'noel';
