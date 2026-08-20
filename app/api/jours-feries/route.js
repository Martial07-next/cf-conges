import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { joursFeries } from "@/lib/joursFeries";

// GET : renvoie le prochain jour ferie a venir dans les 14 jours pour lequel
// le collaborateur n'a pas encore repondu, ou null. Utilise pour la pop-up
// du tableau de bord.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const aujourdhui = new Date(new Date().toDateString());
  const dansDeuxSemaines = new Date(aujourdhui);
  dansDeuxSemaines.setDate(dansDeuxSemaines.getDate() + 14);

  const candidats = [...joursFeries(aujourdhui.getFullYear()), ...joursFeries(aujourdhui.getFullYear() + 1)].filter(
    (f) => f.date >= aujourdhui && f.date <= dansDeuxSemaines
  );

  for (const f of candidats) {
    const existant = await prisma.jourFerieDecision.findUnique({
      where: { userId_date: { userId: session.user.id, date: f.date } },
    });
    if (!existant) {
      return NextResponse.json({
        date: `${f.date.getFullYear()}-${String(f.date.getMonth() + 1).padStart(2, "0")}-${String(f.date.getDate()).padStart(2, "0")}`,
        libelle: f.libelle,
      });
    }
  }

  return NextResponse.json(null);
}

// POST { date, souhaiteTravailler } : le collaborateur repond a la pop-up.
// "Non" est immediatement acquis (aucune validation necessaire). "Oui"
// declenche une demande a valider par l'employeur/admin.
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { date, souhaiteTravailler } = await req.json();
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || typeof souhaiteTravailler !== "boolean") {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }
  const [y, m, d] = date.split("-").map(Number);
  const jour = new Date(y, m - 1, d);

  const decision = await prisma.jourFerieDecision.upsert({
    where: { userId_date: { userId: session.user.id, date: jour } },
    update: { souhaiteTravailler, statut: souhaiteTravailler ? "EN_ATTENTE" : "VALIDE" },
    create: {
      userId: session.user.id,
      date: jour,
      souhaiteTravailler,
      statut: souhaiteTravailler ? "EN_ATTENTE" : "VALIDE",
    },
  });

  await logAudit(session.user.id, "JOUR_FERIE_DECISION", `${date} : ${souhaiteTravailler ? "souhaite travailler" : "férié chômé"}`);

  if (souhaiteTravailler) {
    const destinataires = await prisma.user.findMany({
      where: { OR: [{ role: "ADMIN" }, { role: "EMPLOYEUR" }] },
      select: { id: true },
    });
    await Promise.all(
      destinataires.map((dst) =>
        notify(
          dst.id,
          "Demande de jour férié travaillé",
          `${session.user.name} souhaite travailler le ${jour.toLocaleDateString("fr-FR")} (jour férié).`
        )
      )
    );
  }

  return NextResponse.json(decision);
}

// PATCH { id, action, commentaireRefus } : l'employeur/admin valide ou refuse
// une demande de jour férié travaillé.
export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!canAccess(session?.user, "employeur")) {
    return NextResponse.json({ error: "Réservé à l'employeur ou à l'administrateur." }, { status: 403 });
  }

  const { id, action, commentaireRefus } = await req.json();
  const decision = await prisma.jourFerieDecision.findUnique({ where: { id }, include: { user: true } });
  if (!decision) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  if (decision.statut !== "EN_ATTENTE") {
    return NextResponse.json({ error: "Cette demande a déjà été traitée." }, { status: 400 });
  }

  const nouveauStatut = action === "valider" ? "VALIDE" : "REFUSE";
  const updated = await prisma.jourFerieDecision.update({
    where: { id },
    data: { statut: nouveauStatut, commentaireRefus: action === "refuser" ? commentaireRefus || null : null },
  });

  await logAudit(session.user.id, "JOUR_FERIE_DECISION_TRAITEE", `${decision.user.email} — ${nouveauStatut}`);

  await notify(
    decision.userId,
    action === "valider" ? "Jour férié travaillé accepté" : "Jour férié travaillé refusé",
    action === "valider"
      ? `Votre demande de travailler le ${new Date(decision.date).toLocaleDateString("fr-FR")} a été acceptée.`
      : `Votre demande de travailler le ${new Date(decision.date).toLocaleDateString("fr-FR")} a été refusée. Ce jour reste férié chômé.`
  );

  return NextResponse.json(updated);
}
