import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccessAny } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { calculerDetailTicketsRestauMois } from "@/lib/ticketsRestau";

export const dynamic = "force-dynamic";

const MOIS_LONGS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const JOURS_COURTS = ["Lun", "Mar", "Mer", "Jeu", "Ven"];
const VALEUR_TICKET = 10;
// Répartition de chaque ticket de 10 € : 4 € à la charge du salarié (retenus
// sur sa fiche de paie), 6 € à la charge de l'employeur.
const PART_SALARIE = 4;
const PART_EMPLOYEUR = 6;

const STYLE_ENTETE = {
  font: { bold: true, color: { argb: "FFFFFFFF" } },
  fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF17241B" } },
  alignment: { vertical: "middle", horizontal: "center", wrapText: true },
};

// Meme regle que la page /tr : visible a partir du mois d'embauche, jusqu'a
// la fin du mois de depart.
function visibleSurLeMois(u, annee, mois) {
  const debutMois = new Date(annee, mois, 1);
  const finMois = new Date(annee, mois + 1, 0, 23, 59, 59);
  if (u.statutCompte !== "ACTIF" && !u.dateSortie) return false;
  if (u.dateEntree) {
    const entree = new Date(u.dateEntree);
    if (finMois < new Date(entree.getFullYear(), entree.getMonth(), 1)) return false;
  }
  if (!u.dateSortie) return true;
  const sortie = new Date(u.dateSortie);
  return debutMois <= new Date(sortie.getFullYear(), sortie.getMonth() + 1, 0, 23, 59, 59);
}

function libelleCellule(info) {
  switch (info?.etat) {
    case "ticket":
      return "✓";
    case "conge":
      return info.leaveType.code;
    case "ferie":
      return "Férié";
    case "ferie_travaille":
      return "FT";
    case "regularise":
      return "Rég.";
    default:
      return "";
  }
}

// GET ?mois=YYYY-MM : export Excel des tickets restaurant d'un mois deja
// marque comme livre, a transmettre a la comptable. Reserve au gestionnaire
// TR, a l'employeur et a l'administrateur.
export async function GET(req) {
  const session = await getServerSession(authOptions);
  const autorise =
    session?.user &&
    (["EMPLOYEUR", "ADMIN"].includes(session.user.role) || canAccessAny(session.user, ["tr", "employeur", "admin"]));
  if (!autorise) {
    return NextResponse.json({ error: "Accès réservé." }, { status: 403 });
  }

  const moisParam = new URL(req.url).searchParams.get("mois");
  if (!moisParam || !/^\d{4}-\d{2}$/.test(moisParam)) {
    return NextResponse.json({ error: "Mois invalide." }, { status: 400 });
  }
  const [annee, m] = moisParam.split("-").map(Number);
  const mois = m - 1;
  if (mois < 0 || mois > 11) {
    return NextResponse.json({ error: "Mois invalide." }, { status: 400 });
  }

  const livraison = await prisma.ticketRestauLivraison.findUnique({ where: { annee_mois: { annee, mois } } });
  if (!livraison) {
    return NextResponse.json({ error: "Ce mois n'a pas encore été marqué comme livré." }, { status: 400 });
  }

  const usersBruts = await prisma.user.findMany({
    where: { visiblePlanning: true },
    orderBy: [{ ordre: "asc" }, { nom: "asc" }],
  });
  const users = usersBruts.filter((u) => visibleSurLeMois(u, annee, mois));
  const { jours, details } = await calculerDetailTicketsRestauMois(users, annee, mois);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CF Réseaux Congés";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(`TR ${MOIS_LONGS[mois]} ${annee}`);

  sheet.addRow([`Tickets restaurant ${MOIS_LONGS[mois]} ${annee}`]).font = { bold: true, size: 13 };
  sheet.addRow([
    `Livré le ${new Date(livraison.livreLe).toLocaleDateString("fr-FR")}, ${VALEUR_TICKET} € par ticket : ${PART_SALARIE} € à la charge du salarié (retenue sur fiche de paie), ${PART_EMPLOYEUR} € à la charge de l'employeur`,
  ]);
  sheet.addRow([]);

  const entete = sheet.addRow([
    "Collaborateur",
    ...jours.map((j) => `${JOURS_COURTS[j.getDay() - 1]} ${j.getDate()}`),
    "Nombre de tickets",
    "Valeur totale (€)",
    `Retenue salarié (${PART_SALARIE} €)`,
    `Part employeur (${PART_EMPLOYEUR} €)`,
  ]);
  entete.eachCell((cell) => (cell.style = STYLE_ENTETE));

  let totalTickets = 0;
  for (const u of users) {
    const total = jours.filter((j) => details[u.id][j.toDateString()]?.etat === "ticket").length;
    totalTickets += total;
    const ligne = sheet.addRow([
      `${u.prenom} ${u.nom}`,
      ...jours.map((j) => libelleCellule(details[u.id][j.toDateString()])),
      total,
      total * VALEUR_TICKET,
      total * PART_SALARIE,
      total * PART_EMPLOYEUR,
    ]);
    ligne.eachCell((cell, col) => {
      if (col > 1) cell.alignment = { horizontal: "center" };
    });
  }

  const ligneTotal = sheet.addRow([
    "Total",
    ...jours.map(() => ""),
    totalTickets,
    totalTickets * VALEUR_TICKET,
    totalTickets * PART_SALARIE,
    totalTickets * PART_EMPLOYEUR,
  ]);
  ligneTotal.font = { bold: true };
  ligneTotal.eachCell((cell, col) => {
    if (col > 1) cell.alignment = { horizontal: "center" };
  });

  // Montants en euros (appliqué avant le récapitulatif, qui fixe ses
  // propres formats cellule par cellule).
  for (let c = jours.length + 3; c <= jours.length + 5; c++) {
    sheet.getColumn(c).width = 18;
    sheet.getColumn(c).numFmt = '#,##0.00 "€"';
  }

  // Récapitulatif pour la comptable
  sheet.addRow([]);
  sheet.addRow(["Récapitulatif paie"]).font = { bold: true, size: 12 };
  const recap = [
    ["Nombre total de tickets", totalTickets, false],
    [`Valeur totale (${VALEUR_TICKET} € / ticket)`, totalTickets * VALEUR_TICKET, true],
    [`Total à retenir sur les fiches de paie des salariés (${PART_SALARIE} € / ticket)`, totalTickets * PART_SALARIE, true],
    [`Total à la charge de l'entreprise (${PART_EMPLOYEUR} € / ticket)`, totalTickets * PART_EMPLOYEUR, true],
  ];
  // Libellé étalé sur toute la largeur du tableau, montant dans la colonne
  // "Valeur totale" pour rester lisible.
  const colLibelleFin = jours.length + 2;
  const colMontant = jours.length + 3;
  for (const [libelle, valeur, enEuros] of recap) {
    const ligne = sheet.addRow([]);
    ligne.getCell(1).value = libelle;
    sheet.mergeCells(ligne.number, 1, ligne.number, colLibelleFin);
    const cellule = ligne.getCell(colMontant);
    cellule.value = valeur;
    cellule.font = { bold: true };
    cellule.alignment = { horizontal: "right" };
    cellule.numFmt = enEuros ? '#,##0.00 "€"' : "0";
  }

  sheet.addRow([]);
  sheet.addRow(["Légende : ✓ ticket gagné · code = congé · Férié · FT = férié travaillé · Rég. = ticket régularisé (retiré)"]);

  sheet.getColumn(1).width = 26;
  for (let i = 0; i < jours.length; i++) sheet.getColumn(i + 2).width = 7;
  sheet.getColumn(jours.length + 2).width = 18;
  sheet.views = [{ state: "frozen", xSplit: 1, ySplit: 4 }];

  await logAudit(session.user.id, "EXPORT_TR", `${MOIS_LONGS[mois]} ${annee}`);

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="tickets-restaurant-${moisParam}.xlsx"`,
    },
  });
}
