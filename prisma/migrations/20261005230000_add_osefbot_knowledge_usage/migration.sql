ALTER TABLE "OsefBotKnowledge"
ADD COLUMN "nombreUtilisations" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "derniereUtilisation" TIMESTAMP(3);
