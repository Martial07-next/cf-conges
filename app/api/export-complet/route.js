import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccessAny } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { estJourFerie } from "@/lib/joursFeries";
import { calculerTicketsRestau } from "@/lib/ticketsRestau";

const JOURS_CODE = ["DIMANCHE", "LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI"];
const MOIS_LONGS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}
function formatDateFr(d) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const STYLE_ENTETE = {
  font: { bold: true, color: { argb: "FFFFFFFF" } },
  fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF17241B" } },
  alignment: { vertical: "middle", horizontal: "center" },
};

// GET ?annee=YYYY : genere un classeur Excel a 3 feuilles (Planning equipe,
// Conges avec recap des soldes, Tickets restaurant) pour l'annee complete.
// Reserve a comptable/employeur/admin.
export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessAny(session.user, ["comptable", "employeur", "admin"])) {
    return NextResponse.json({ error: "Accès réservé." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const annee = Number(searchParams.get("annee")) || new Date().getFullYear();
  const debutAnnee = new Date(annee, 0, 1);
  const finAnnee = new Date(annee, 11, 31, 23, 59, 59);

  const [users, leaveRequestsAnnee, overrides, feriesAcceptes, balances] = await Promise.all([
    prisma.user.findMany({
      where: { statutCompte: "ACTIF", visiblePlanning: true },
      orderBy: { nom: "asc" },
    }),
    prisma.leaveRequest.findMany({
      where: { statut: "VALIDE", dateDebut: { lte: finAnnee }, dateFin: { gte: debutAnnee } },
      include: { leaveType: true },
    }),
    prisma.teletravailOverride.findMany({ where: { date: { gte: debutAnnee, lte: finAnnee } } }),
    prisma.jourFerieDecision.findMany({
      where: { date: { gte: debutAnnee, lte: finAnnee }, statut: "VALIDE", souhaiteTravailler: true },
    }),
    prisma.leaveBalance.findMany({
      where: { annee },
      include: { user: true, leaveType: true },
      orderBy: [{ user: { nom: "asc" } }, { leaveType: { ordre: "asc" } }],
    }),
  ]);

  const feriesTravaillesSet = new Set(feriesAcceptes.map((f) => `${f.userId}_${toISODate(new Date(f.date))}`));

  function estAvantEmbauche(u, jour) {
    return !!u.dateEntree && jour < new Date(u.dateEntree);
  }
  function estApresDepart(u, jour) {
    return !!u.dateSortie && jour > new Date(u.dateSortie);
  }
  function findRequest(userId, jour) {
    return leaveRequestsAnnee.find((r) => r.userId === userId && jour >= r.dateDebut && jour <= r.dateFin);
  }
  function findTeletravail(u, jour) {
    const key = toISODate(jour);
    const ajout = overrides.find((o) => o.userId === u.id && toISODate(new Date(o.date)) === key && o.type === "AJOUT");
    if (ajout) return true;
    const retrait = overrides.find((o) => o.userId === u.id && toISODate(new Date(o.date)) === key && o.type === "RETRAIT");
    if (retrait) return false;
    if (!u.teletravailAutorise || !u.teletravailJours?.length) return false;
    return u.teletravailJours.includes(JOURS_CODE[jour.getDay()]);
  }

  // Case du planning pour un utilisateur/jour donne, meme priorite que
  // l'ecran : avant embauche/apres depart > week-end (WK) > conge > ferie > TT > JT.
  function caseDuJour(u, jour) {
    if (estAvantEmbauche(u, jour) || estApresDepart(u, jour)) return "";
    const weekend = jour.getDay() === 0 || jour.getDay() === 6;
    if (weekend) return "WK";
    const req = findRequest(u.id, jour);
    if (req) return req.leaveType.code + (req.demiJournee ? (req.demiJourneePeriode === "APREM" ? " (AM)" : " (M)") : "");
    const ferie = estJourFerie(jour);
    if (ferie && !feriesTravaillesSet.has(`${u.id}_${toISODate(jour)}`)) return "Férié";
    if (ferie) return "FT";
    if (findTeletravail(u, jour)) return "TT";
    return "JT";
  }

  const joursAnnee = Math.round((finAnnee - debutAnnee) / (1000 * 60 * 60 * 24)) + 1;
  const joursListe = Array.from({ length: joursAnnee }, (_, i) => new Date(annee, 0, 1 + i));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CF Réseaux Congés";
  workbook.created = new Date();

  // ==================== FEUILLE 1 — PLANNING EQUIPE ====================
  const shPlanning = workbook.addWorksheet(`Planning ${annee}`);
  shPlanning.views = [{ state: "frozen", xSplit: 1, ySplit: 1 }];

  const enteteJours = ["Collaborateur", ...joursListe.map((j) => `${String(j.getDate()).padStart(2, "0")}/${String(j.getMonth() + 1).padStart(2, "0")}`)];
  shPlanning.addRow(enteteJours);
  shPlanning.getRow(1).eachCell((cell) => (cell.style = STYLE_ENTETE));
  shPlanning.getColumn(1).width = 24;
  for (let i = 2; i <= enteteJours.length; i++) shPlanning.getColumn(i).width = 7;

  for (const u of users) {
    const ligne = [`${u.prenom} ${u.nom}`, ...joursListe.map((j) => caseDuJour(u, j))];
    const row = shPlanning.addRow(ligne);
    row.eachCell((cell, colNumber) => {
      if (colNumber === 1) return;
      cell.alignment = { horizontal: "center" };
      const v = cell.value;
      if (v === "WK") cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8863C" } };
      else if (v === "Férié") cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E5E5" } };
      else if (v === "FT") cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF200" } };
      else if (v === "TT") cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB3E5FC" } };
      else if (v === "JT") cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0AFE6B" } };
      else if (v) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFD9CC" } };
    });
  }

  // ==================== FEUILLE 2 — CONGES (recap + detail) ====================
  const shConges = workbook.addWorksheet("Congés");
  shConges.addRow([`Récapitulatif des soldes de congés — ${annee}`]).font = { bold: true, size: 13 };
  shConges.addRow([]);

  const enteteRecap = ["Nom", "Prénom", "Service", "Type", "Jours acquis", "Jours pris", "Jours restants"];
  const ligneEnteteRecap = shConges.addRow(enteteRecap);
  ligneEnteteRecap.eachCell((cell) => (cell.style = STYLE_ENTETE));

  for (const b of balances) {
    const restants = b.leaveType.comptabiliseSolde ? Math.max(0, b.joursAcquis - b.joursPris) : "";
    shConges.addRow([
      b.user.nom,
      b.user.prenom,
      b.user.service || "",
      b.leaveType.libelle,
      b.leaveType.comptabiliseSolde ? b.joursAcquis : "",
      b.joursPris,
      restants,
    ]);
  }

  shConges.addRow([]);
  shConges.addRow([]);
  shConges.addRow([`Détail des demandes de congé — ${annee}`]).font = { bold: true, size: 13 };
  shConges.addRow([]);

  const enteteDetail = ["Nom", "Prénom", "Type", "Du", "Au", "Demi-journée", "Statut", "Motif", "Validé par", "Date validation"];
  const ligneEnteteDetail = shConges.addRow(enteteDetail);
  ligneEnteteDetail.eachCell((cell) => (cell.style = STYLE_ENTETE));

  const demandesAnnee = await prisma.leaveRequest.findMany({
    where: { dateDebut: { lte: finAnnee }, dateFin: { gte: debutAnnee } },
    include: { user: true, leaveType: true, valideur: true },
    orderBy: [{ user: { nom: "asc" } }, { dateDebut: "asc" }],
  });

  for (const r of demandesAnnee) {
    shConges.addRow([
      r.user.nom,
      r.user.prenom,
      r.leaveType.libelle,
      formatDateFr(r.dateDebut),
      formatDateFr(r.dateFin),
      r.demiJournee ? (r.demiJourneePeriode === "APREM" ? "Après-midi" : "Matin") : "",
      r.statut,
      r.motif || "",
      r.valideur ? `${r.valideur.prenom} ${r.valideur.nom}` : "",
      r.dateValidation ? formatDateFr(r.dateValidation) : "",
    ]);
  }

  shConges.columns.forEach((col) => (col.width = 16));
  shConges.getColumn(8).width = 30;

  // ==================== FEUILLE 3 — TICKETS RESTAURANT ====================
  const shTR = workbook.addWorksheet("Tickets restaurant");
  const ticketsParUser = await calculerTicketsRestau(users, annee);

  const enteteTR = ["Collaborateur", ...MOIS_LONGS, "Total", "Valeur (€)"];
  const ligneEnteteTR = shTR.addRow(enteteTR);
  ligneEnteteTR.eachCell((cell) => (cell.style = STYLE_ENTETE));
  shTR.getColumn(1).width = 24;

  for (const u of users) {
    const mois = ticketsParUser[u.id] || Array(12).fill(0);
    const total = mois.reduce((a, b) => a + b, 0);
    shTR.addRow([`${u.prenom} ${u.nom}`, ...mois, total, Number((total * 10).toFixed(2))]);
  }

  await logAudit(session.user.id, "EXPORT_COMPLET", `année ${annee}`);

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="cf-reseaux-export-complet-${annee}.xlsx"`,
    },
  });
}
