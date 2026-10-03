import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { notify, notifyAdminEmail } from "@/lib/notify";
import { sendPushToAdmins } from "@/lib/webpush";
import { estJourFerie } from "@/lib/joursFeries";

export const dynamic = "force-dynamic";

// GET : liste des demandes.
// - collaborateur -> uniquement les siennes
// - employeur/admin -> toutes (filtrable par ?statut=EN_ATTENTE)
// - comptable -> toutes, lecture seule
export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const statut = searchParams.get("statut");

  const where = {};
  if (statut) where.statut = statut;
  if (session.user.role === "COLLABORATEUR") where.userId = session.user.id;

  const requests = await prisma.leaveRequest.findMany({
    where,
    include: {
      user: { select: { id: true, nom: true, prenom: true, service: true } },
      leaveType: true,
      valideur: { select: { nom: true, prenom: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}

// POST : creation d'une demande (standard ou exceptionnelle) par le collaborateur connecte.
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await req.json();
  const {
    leaveTypeId, motifId, dateDebut, dateFin, demiJournee, demiJourneePeriode,
    motif, exceptionnelle,
    enfantMaladeMoinsUnAnHandicapAld,
    enfantMaladeTroisEnfantsOuPlus,
  } = body;

  if (!leaveTypeId || !dateDebut) {
    return NextResponse.json({ error: "Type de congé et date de début obligatoires." }, { status: 400 });
  }

  const leaveType = await prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
  if (!leaveType || !leaveType.demandable) {
    return NextResponse.json({ error: "Ce type de congé n'est pas disponible en auto-déclaration." }, { status: 400 });
  }

  const debut = new Date(dateDebut);
  let fin;
  let motifFixe = null;

  // Motif a duree fixe (ex: ASA "Mariage" = 4 jours) : la date de fin est
  // imposee par le motif, pas choisie librement par le collaborateur.
  if (motifId) {
    motifFixe = await prisma.leaveTypeMotif.findUnique({ where: { id: motifId } });
    if (!motifFixe || motifFixe.leaveTypeId !== leaveTypeId) {
      return NextResponse.json({ error: "Motif invalide pour ce type de congé." }, { status: 400 });
    }
    fin = new Date(debut);

    // Les ASA fixes sont décomptées en jours ouvrables : le dimanche et les
    // jours fériés habituellement non travaillés ne consomment pas le quota.
    // Le samedi reste donc compté, même si l'entreprise travaille du lundi au vendredi.
    if (leaveType.code === "ASA" && motifFixe.libelle !== "Enfant malade") {
      let joursRestants = Math.ceil(motifFixe.jours);
      while (joursRestants > 0) {
        if (fin.getDay() !== 0 && !estJourFerie(fin)) joursRestants -= 1;
        if (joursRestants > 0) fin.setDate(fin.getDate() + 1);
      }
    } else {
      fin.setDate(fin.getDate() + Math.ceil(motifFixe.jours) - 1);
    }
  } else {
    if (!dateFin) return NextResponse.json({ error: "Date de fin obligatoire." }, { status: 400 });
    fin = new Date(dateFin);
  }

  if (fin < debut) {
    return NextResponse.json({ error: "La date de fin doit être postérieure à la date de début." }, { status: 400 });
  }
  if (exceptionnelle && (!motif || motif.trim().length < 5)) {
    return NextResponse.json({ error: "Un motif est obligatoire pour une demande exceptionnelle." }, { status: 400 });
  }

  if (demiJournee && debut.toDateString() !== fin.toDateString()) {
    return NextResponse.json(
      { error: "Une demi-journée doit être demandée sur une seule date." },
      { status: 400 }
    );
  }

  let regleEnfantMalade = null;
  const estEnfantMalade = motifFixe?.libelle === "Enfant malade";

  if (estEnfantMalade) {
    const collaborateur = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { dateEntree: true },
    });
    if (!collaborateur?.dateEntree) {
      return NextResponse.json(
        { error: "Votre date d'entrée doit être renseignée pour calculer vos droits enfant malade." },
        { status: 400 }
      );
    }

    const annee = debut.getFullYear();
    const debutAnnee = new Date(annee, 0, 1);
    const finAnnee = new Date(annee, 11, 31, 23, 59, 59, 999);
    const unAn = new Date(collaborateur.dateEntree);
    unAn.setFullYear(unAn.getFullYear() + 1);
    const ancienneteUnAn = debut >= unAn;

    const casConventionnelMajore = !!enfantMaladeMoinsUnAnHandicapAld;
    const casLegalTroisEnfants = !!enfantMaladeTroisEnfantsOuPlus;
    const plafondTotal = casConventionnelMajore || casLegalTroisEnfants ? 5 : 3;
    const plafondRemunere = ancienneteUnAn ? (casConventionnelMajore ? 5 : 3) : 0;

    const dejaDemandees = await prisma.leaveRequest.findMany({
      where: {
        userId: session.user.id,
        motifFixe: { libelle: "Enfant malade" },
        statut: { in: ["EN_ATTENTE", "VALIDE"] },
        dateDebut: { gte: debutAnnee, lte: finAnnee },
      },
      select: { dateDebut: true, dateFin: true, demiJournee: true, joursRemuneres: true, joursNonRemuneres: true },
    });

    const compterJoursSemaine = (d1, d2) => {
      let total = 0;
      const d = new Date(d1);
      while (d <= d2) {
        const jour = d.getDay();
        if (jour !== 0 && jour !== 6) total += 1;
        d.setDate(d.getDate() + 1);
      }
      return total;
    };

    const joursNouvelleDemande = demiJournee ? 0.5 : compterJoursSemaine(debut, fin);
    const joursDejaPris = dejaDemandees.reduce((total, r) => {
      if (r.joursRemuneres != null || r.joursNonRemuneres != null) {
        return total + Number(r.joursRemuneres || 0) + Number(r.joursNonRemuneres || 0);
      }
      return total + (r.demiJournee ? 0.5 : compterJoursSemaine(r.dateDebut, r.dateFin));
    }, 0);

    if (joursNouvelleDemande <= 0) {
      return NextResponse.json({ error: "La demande enfant malade doit contenir au moins un jour ouvré." }, { status: 400 });
    }
    if (joursDejaPris + joursNouvelleDemande > plafondTotal) {
      return NextResponse.json(
        { error: `Plafond enfant malade dépassé : ${plafondTotal} jour(s) maximum sur l'année ${annee}.` },
        { status: 400 }
      );
    }

    const joursRemuneresDeja = dejaDemandees.reduce(
      (total, r) => total + Number(r.joursRemuneres || 0),
      0
    );
    const joursRemuneres = Math.max(
      0,
      Math.min(joursNouvelleDemande, plafondRemunere - joursRemuneresDeja)
    );
    const joursNonRemuneres = Math.max(0, joursNouvelleDemande - joursRemuneres);

    regleEnfantMalade = {
      enfantMaladeCasMajore: casConventionnelMajore || casLegalTroisEnfants,
      enfantMaladeMoinsUnAnHandicapAld: casConventionnelMajore,
      enfantMaladeTroisEnfantsOuPlus: casLegalTroisEnfants,
      absenceRemuneree: joursNonRemuneres === 0,
      joursRemuneres,
      joursNonRemuneres,
    };
  }

  const request = await prisma.leaveRequest.create({
    data: {
      userId: session.user.id,
      leaveTypeId,
      motifId: motifFixe?.id || null,
      dateDebut: debut,
      dateFin: fin,
      demiJournee: !!demiJournee,
      demiJourneePeriode: demiJournee ? demiJourneePeriode || null : null,
      motif: motif || (motifFixe ? motifFixe.libelle : null),
      exceptionnelle: !!exceptionnelle,
      ...(regleEnfantMalade || {}),
      statut: "EN_ATTENTE",
    },
    include: { leaveType: true, motifFixe: true },
  });

  await logAudit(session.user.id, "DEMANDE_CREEE", `${leaveType.code} du ${dateDebut} au ${dateFin}`);

  // Notifie les valideurs (employeur + admin)
  const validateurs = await prisma.user.findMany({ where: { role: { in: ["EMPLOYEUR", "ADMIN"] }, statutCompte: "ACTIF" } });
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  for (const v of validateurs) {
    await notify(
      v.id,
      "Nouvelle demande",
      `${user.prenom} ${user.nom} a soumis une demande de ${leaveType.libelle}${exceptionnelle ? " (exceptionnelle)" : ""}.`
    );
  }

  await notifyAdminEmail(
    "Nouvelle demande de congé",
    `${user.prenom} ${user.nom} a soumis une demande de ${leaveType.libelle}${exceptionnelle ? " (exceptionnelle)" : ""}, du ${dateDebut} au ${dateFin}.`
  );

  await sendPushToAdmins(
    "Nouvelle demande de congé",
    `${user.prenom} ${user.nom} — ${leaveType.libelle}${exceptionnelle ? " (exceptionnelle)" : ""}`
  );

  return NextResponse.json(request, { status: 201 });
}
