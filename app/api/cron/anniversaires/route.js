import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET : appelee chaque matin par Vercel Cron. Verifie si un collaborateur
// fete son anniversaire de naissance ou son anniversaire d'anciennete
// (annee(s) depuis dateEntree) aujourd'hui, et previent le reste de
// l'equipe le cas echeant.
export async function GET(req) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const aujourdhui = new Date();
  const jour = aujourdhui.getDate();
  const mois = aujourdhui.getMonth();

  const users = await prisma.user.findMany({
    where: { statutCompte: "ACTIF", visiblePlanning: true },
  });

  const feteNaissance = users.filter((u) => {
    if (!u.dateNaissance) return false;
    const d = new Date(u.dateNaissance);
    return d.getDate() === jour && d.getMonth() === mois;
  });

  const feteAnciennete = users.filter((u) => {
    if (!u.dateEntree) return false;
    const d = new Date(u.dateEntree);
    if (d.getDate() !== jour || d.getMonth() !== mois) return false;
    const annees = aujourdhui.getFullYear() - d.getFullYear();
    return annees > 0;
  });

  let notificationsEnvoyees = 0;

  for (const feteUser of feteNaissance) {
    const destinataires = users.filter((u) => u.id !== feteUser.id);
    await Promise.all(
      destinataires.map((d) =>
        notify(d.id, "Anniversaire 🎂", `C'est l'anniversaire de ${feteUser.prenom} ${feteUser.nom} aujourd'hui !`)
      )
    );
    notificationsEnvoyees += destinataires.length;
  }

  for (const feteUser of feteAnciennete) {
    const annees = aujourdhui.getFullYear() - new Date(feteUser.dateEntree).getFullYear();
    const destinataires = users.filter((u) => u.id !== feteUser.id);
    await Promise.all(
      destinataires.map((d) =>
        notify(
          d.id,
          "Anniversaire d'ancienneté 🎉",
          `${feteUser.prenom} ${feteUser.nom} fête aujourd'hui ${annees} an${annees > 1 ? "s" : ""} chez CF Réseaux !`
        )
      )
    );
    notificationsEnvoyees += destinataires.length;
  }

  await logAudit(
    null,
    "ANNIVERSAIRES_VERIFIES",
    `${feteNaissance.length} naissance(s), ${feteAnciennete.length} ancienneté(s), ${notificationsEnvoyees} notification(s) envoyée(s)`
  );

  return NextResponse.json({
    ok: true,
    naissances: feteNaissance.map((u) => `${u.prenom} ${u.nom}`),
    anciennetes: feteAnciennete.map((u) => `${u.prenom} ${u.nom}`),
    notificationsEnvoyees,
  });
}
