import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const JOURS_TELETRAVAIL = [
  "LUNDI",
  "MARDI",
  "MERCREDI",
  "JEUDI",
  "VENDREDI",
];

function aujourdHuiFrance() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
  return new Date(`${values.year}-${values.month}-${values.day}T00:00:00.000Z`);
}

// PATCH : mise a jour du profil personnel (mot de passe, preference de notifications).
// Volontairement separe de /api/users/[id] qui gere les droits d'acces et roles.
export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await req.json();
  const data = {};

  if (body.recevoirEmails !== undefined) {
    data.recevoirEmails = !!body.recevoirEmails;
  }
  if (body.theme !== undefined && ["clair", "sombre"].includes(body.theme)) {
    data.theme = body.theme;
  }
    if (body.teletravailJours !== undefined) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { teletravailJoursFixes: { where: { dateFin: null } } },
    });
    if (!user.teletravailAutorise) {
      return NextResponse.json({ error: "Le télétravail n'est pas autorisé pour votre compte." }, { status: 403 });
    }
    if (!Array.isArray(body.teletravailJours)) {
      return NextResponse.json({ error: "Jours de télétravail invalides." }, { status: 400 });
    }
    const jours = [...new Set(body.teletravailJours)];
    if (!jours.every((jour) => JOURS_TELETRAVAIL.includes(jour))) {
      return NextResponse.json({ error: "Jour de télétravail invalide." }, { status: 400 });
    }
    if (jours.length > user.teletravailJoursMax) {
      return NextResponse.json({ error: `Vous ne pouvez choisir que ${user.teletravailJoursMax} jour(s) par semaine.` }, { status: 400 });
    }

    // Chaque ajout débute aujourd'hui ; chaque retrait est clos hier. Les
    // semaines déjà passées gardent donc exactement leur historique.
    const aujourdHui = aujourdHuiFrance();
    const hier = new Date(aujourdHui);
    hier.setUTCDate(hier.getUTCDate() - 1);
    const joursOuverts = new Set(user.teletravailJoursFixes.map((row) => row.jour));
    const retraits = user.teletravailJoursFixes
      .filter((row) => !jours.includes(row.jour))
      .map((row) =>
        prisma.teletravailJourFixe.update({
          where: { id: row.id },
          data: { dateFin: hier },
        })
      );
    const ajouts = jours
      .filter((jour) => !joursOuverts.has(jour))
      .map((jour) =>
        prisma.teletravailJourFixe.create({
          data: { userId: user.id, jour, dateDebut: aujourdHui },
        })
      );

    await prisma.$transaction([...retraits, ...ajouts]);
    // Conservé pour ne pas casser les autres parties de l'application qui
    // n'auraient pas encore été déployées avec le nouveau modèle.
    data.teletravailJours = jours;
  }
    if (body.tuteurId !== undefined) {
    const moi = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!moi.estAlternant) {
      return NextResponse.json({ error: "Réservé aux comptes alternants." }, { status: 403 });
    }
    data.tuteurId = body.tuteurId || null;
  }

  if (body.newPassword) {
    if (!body.currentPassword) {
      return NextResponse.json({ error: "Mot de passe actuel requis." }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    const valid = await bcrypt.compare(body.currentPassword, user.motDePasseHash);
    if (!valid) {
      return NextResponse.json({ error: "Mot de passe actuel incorrect." }, { status: 400 });
    }
    if (body.newPassword.length < 8) {
      return NextResponse.json({ error: "Le nouveau mot de passe doit contenir au moins 8 caractères." }, { status: 400 });
    }
    data.motDePasseHash = await bcrypt.hash(body.newPassword, 10);
    data.doitChangerMotDePasse = false;
  }

  const updated = await prisma.user.update({ where: { id: session.user.id }, data });
  await logAudit(session.user.id, "PROFIL_MODIFIE", session.user.email);

  return NextResponse.json({ ok: true, recevoirEmails: updated.recevoirEmails });
}
