import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Date de création de CF Réseaux : 1er juillet 2021.
const CREATION_SOCIETE = new Date(Date.UTC(2021, 6, 1));

function pluriel(n, mot) {
  return `${n} ${mot}${n > 1 ? "s" : ""}`;
}

function formatDateFr(d) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
}

// Vrai si la date tombe le même jour et le même mois qu'aujourd'hui, au moins
// un an plus tôt. Renvoie le nombre d'années écoulées, sinon 0.
function anneesSiAnniversaire(date, aujourdhui) {
  if (!date) return 0;
  const d = new Date(date);
  if (d.getUTCDate() !== aujourdhui.getUTCDate() || d.getUTCMonth() !== aujourdhui.getUTCMonth()) return 0;
  return Math.max(0, aujourdhui.getUTCFullYear() - d.getUTCFullYear());
}

// GET : appelee chaque matin par Vercel Cron. Verifie si un collaborateur
// fete son anniversaire de naissance ou son anniversaire d'anciennete
// (annee(s) depuis dateEntree) aujourd'hui, ou si c'est l'anniversaire de
// CF Reseaux, et previent l'equipe le cas echeant.
export async function GET(req) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const aujourdhui = new Date();

  const users = await prisma.user.findMany({
    where: { statutCompte: "ACTIF" },
  });

  const feteNaissance = users.filter((u) => anneesSiAnniversaire(u.dateNaissance, aujourdhui) > 0);
  const feteAnciennete = users.filter((u) => anneesSiAnniversaire(u.dateEntree, aujourdhui) > 0);
  const ansSociete = anneesSiAnniversaire(CREATION_SOCIETE, aujourdhui);

  let notificationsEnvoyees = 0;

  if (ansSociete > 0) {
    await Promise.all(
      users.map((d) =>
        notify(
          d.id,
          "Anniversaire de CF Réseaux 🎉",
          `CF Réseaux fête aujourd'hui ses ${pluriel(ansSociete, "an")} ! L'aventure a commencé le ${formatDateFr(CREATION_SOCIETE)}.`
        )
      )
    );
    notificationsEnvoyees += users.length;
  }

  for (const feteUser of feteNaissance) {
    const age = anneesSiAnniversaire(feteUser.dateNaissance, aujourdhui);
    const destinataires = users.filter((u) => u.id !== feteUser.id);
    await Promise.all(
      destinataires.map((d) =>
        notify(d.id, "Anniversaire 🎂", `C'est l'anniversaire de ${feteUser.prenom} ${feteUser.nom} aujourd'hui : ${pluriel(age, "an")} !`)
      )
    );
    notificationsEnvoyees += destinataires.length;
  }

  for (const feteUser of feteAnciennete) {
    const annees = anneesSiAnniversaire(feteUser.dateEntree, aujourdhui);
    const destinataires = users.filter((u) => u.id !== feteUser.id);
    await Promise.all(
      destinataires.map((d) =>
        notify(
          d.id,
          "Anniversaire d'ancienneté 🎉",
          `${feteUser.prenom} ${feteUser.nom} est chez CF Réseaux depuis ${pluriel(annees, "an")} aujourd'hui (entrée le ${formatDateFr(feteUser.dateEntree)}) !`
        )
      )
    );
    notificationsEnvoyees += destinataires.length;
  }

  await logAudit(
    null,
    "ANNIVERSAIRES_VERIFIES",
    `${feteNaissance.length} naissance(s), ${feteAnciennete.length} ancienneté(s)${ansSociete > 0 ? `, ${ansSociete} an(s) de CF Réseaux` : ""}, ${notificationsEnvoyees} notification(s) envoyée(s)`
  );

  return NextResponse.json({
    ok: true,
    societe: ansSociete > 0 ? ansSociete : null,
    naissances: feteNaissance.map((u) => `${u.prenom} ${u.nom}`),
    anciennetes: feteAnciennete.map((u) => `${u.prenom} ${u.nom}`),
    notificationsEnvoyees,
  });
}
