import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès interdit." }, { status: 403 });
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "OsefBotFeedback" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "question" TEXT NOT NULL,
        "reponse" TEXT NOT NULL,
        "utile" BOOLEAN,
        "commentaire" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "ratedAt" TIMESTAMP(3),
        CONSTRAINT "OsefBotFeedback_pkey" PRIMARY KEY ("id")
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "OsefBotFeedback_utile_createdAt_idx"
      ON "OsefBotFeedback"("utile", "createdAt")
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "OsefBotFeedback_userId_createdAt_idx"
      ON "OsefBotFeedback"("userId", "createdAt")
    `);

    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'OsefBotFeedback_userId_fkey'
        ) THEN
          ALTER TABLE "OsefBotFeedback"
          ADD CONSTRAINT "OsefBotFeedback_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "User"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END
      $$
    `);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Migration OSEFBOT:", error);
    return NextResponse.json(
      { error: "Impossible de préparer la table OSEFBOT." },
      { status: 500 }
    );
  }
}
