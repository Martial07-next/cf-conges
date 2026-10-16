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

const COULEURS = {
  blanc: "FFFFFFFF",
  vertNuit: "FF17241B",
  texte: "FF1F2A22",
  texteDoux: "FF6B7280",
  fondClair: "FFF3F7F2",
  zebre: "FFF7FAF6",
  fondTotal: "FFE6EFE7",
  bordure: "FFE3E8E2",
  separateurSemaine: "FFB8C4BA",
  ambreFonce: "FFB45309",
  ambreClair: "FFFEF3C7",
  emeraudeFonce: "FF047857",
  emeraudeClair: "FFD1FAE5",
};

// Rendu des cases jour, proche de l'écran Gestionnaire TR.
const STYLE_ETAT = {
  ticket: { fond: "FFDCFCE7", texte: "FF047857" },
  conge: { fond: "FFFFEDD5", texte: "FF9A3412" },
  ferie: { fond: "FFF1F2F4", texte: "FF6B7280" },
  ferie_travaille: { fond: "FFFEF9C3", texte: "FF854D0E" },
  regularise: { fond: "FFFEE2E2", texte: "FFB91C1C" },
};

const FORMAT_EUROS = '#,##0.00 "€"';

function remplissage(argb) {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

// Bordures fines, et séparateur plus marqué au début de chaque semaine.
function bordures(col, jours) {
  const fin = { style: "thin", color: { argb: COULEURS.bordure } };
  const indexJour = col - 3;
  const debutSemaine = indexJour >= 0 && indexJour < jours.length && (indexJour === 0 || jours[indexJour].getDay() === 1);
  return {
    top: fin,
    bottom: fin,
    right: fin,
    left: debutSemaine || col === 3 + jours.length ? { style: "thin", color: { argb: COULEURS.separateurSemaine } } : fin,
  };
}

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
  const sheet = workbook.addWorksheet(`TR ${MOIS_LONGS[mois]} ${annee}`, {
    views: [{ state: "frozen", xSplit: 2, ySplit: 4, showGridLines: false }],
    pageSetup: {
      orientation: "landscape",
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
      printTitlesRow: "4:4",
    },
  });

  // Colonnes : Collaborateur | Pôle | jours ouvrés | Tickets | Valeur | Retenue salarié | Part employeur
  const colPremierJour = 3;
  const colTickets = colPremierJour + jours.length;
  const colValeur = colTickets + 1;
  const colSalarie = colTickets + 2;
  const colEmployeur = colTickets + 3;
  const derniereCol = colEmployeur;

  sheet.getColumn(1).width = 26;
  sheet.getColumn(2).width = 16;
  for (let c = colPremierJour; c < colTickets; c++) sheet.getColumn(c).width = 5.5;
  sheet.getColumn(colTickets).width = 10;
  for (const c of [colValeur, colSalarie, colEmployeur]) sheet.getColumn(c).width = 15;

  // ---- Titre
  const titre = sheet.getRow(1);
  titre.getCell(1).value = `Tickets restaurant · ${MOIS_LONGS[mois]} ${annee}`;
  sheet.mergeCells(1, 1, 1, derniereCol);
  titre.height = 32;
  titre.getCell(1).style = {
    font: { bold: true, size: 16, color: { argb: COULEURS.blanc } },
    fill: remplissage(COULEURS.vertNuit),
    alignment: { vertical: "middle", horizontal: "left", indent: 1 },
  };

  const sousTitre = sheet.getRow(2);
  sousTitre.getCell(1).value =
    `Livré le ${new Date(livraison.livreLe).toLocaleDateString("fr-FR")}   ·   ${VALEUR_TICKET} € par ticket : ` +
    `${PART_SALARIE} € retenus sur la fiche de paie du salarié, ${PART_EMPLOYEUR} € à la charge de l'employeur`;
  sheet.mergeCells(2, 1, 2, derniereCol);
  sousTitre.height = 20;
  sousTitre.getCell(1).style = {
    font: { italic: true, size: 10, color: { argb: COULEURS.texteDoux } },
    fill: remplissage(COULEURS.fondClair),
    alignment: { vertical: "middle", horizontal: "left", indent: 1 },
  };
  sheet.getRow(3).height = 8;

  // ---- En-tête du tableau
  const entete = sheet.getRow(4);
  entete.values = [
    "Collaborateur",
    "Pôle",
    ...jours.map((j) => `${JOURS_COURTS[j.getDay() - 1]}\n${j.getDate()}`),
    "Tickets",
    "Valeur totale",
    `Retenue salarié\n(${PART_SALARIE} € / ticket)`,
    `Part employeur\n(${PART_EMPLOYEUR} € / ticket)`,
  ];
  entete.height = 34;
  entete.eachCell((cell, col) => {
    cell.style = {
      font: { bold: true, size: 10, color: { argb: COULEURS.blanc } },
      fill: remplissage(col === colSalarie ? COULEURS.ambreFonce : col === colEmployeur ? COULEURS.emeraudeFonce : COULEURS.vertNuit),
      alignment: { vertical: "middle", horizontal: col <= 2 ? "left" : "center", wrapText: true, indent: col <= 2 ? 1 : 0 },
      border: bordures(col, jours),
    };
  });

  // ---- Lignes collaborateurs
  let totalTickets = 0;
  users.forEach((u, index) => {
    const total = jours.filter((j) => details[u.id][j.toDateString()]?.etat === "ticket").length;
    totalTickets += total;
    const ligne = sheet.addRow([
      `${u.prenom} ${u.nom}`,
      u.pole || "",
      ...jours.map((j) => libelleCellule(details[u.id][j.toDateString()])),
      total,
      total * VALEUR_TICKET,
      total * PART_SALARIE,
      total * PART_EMPLOYEUR,
    ]);
    ligne.height = 20;
    const fondLigne = index % 2 === 1 ? COULEURS.zebre : COULEURS.blanc;
    ligne.eachCell({ includeEmpty: true }, (cell, col) => {
      const style = {
        font: { size: 10, color: { argb: COULEURS.texte } },
        fill: remplissage(fondLigne),
        alignment: { vertical: "middle", horizontal: col <= 2 ? "left" : "center", indent: col <= 2 ? 1 : 0 },
        border: bordures(col, jours),
      };
      if (col === 1) style.font = { ...style.font, bold: true };
      if (col === 2) style.font = { ...style.font, color: { argb: COULEURS.texteDoux } };
      if (col >= colPremierJour && col < colTickets) {
        const etat = details[u.id][jours[col - colPremierJour].toDateString()]?.etat;
        const rendu = STYLE_ETAT[etat];
        if (rendu) {
          style.fill = remplissage(rendu.fond);
          style.font = { size: 9, bold: true, color: { argb: rendu.texte } };
        }
      }
      if (col === colTickets) style.font = { ...style.font, bold: true };
      if (col >= colValeur) {
        style.numFmt = FORMAT_EUROS;
        style.alignment = { vertical: "middle", horizontal: "right", indent: 1 };
      }
      if (col === colSalarie) style.fill = remplissage(COULEURS.ambreClair);
      if (col === colEmployeur) style.fill = remplissage(COULEURS.emeraudeClair);
      cell.style = style;
    });
  });

  // ---- Ligne de total
  const ligneTotal = sheet.addRow([
    "Total",
    "",
    ...jours.map(() => ""),
    totalTickets,
    totalTickets * VALEUR_TICKET,
    totalTickets * PART_SALARIE,
    totalTickets * PART_EMPLOYEUR,
  ]);
  ligneTotal.height = 24;
  sheet.mergeCells(ligneTotal.number, 1, ligneTotal.number, colTickets - 1);
  ligneTotal.eachCell({ includeEmpty: true }, (cell, col) => {
    cell.style = {
      font: { bold: true, size: 11, color: { argb: COULEURS.texte } },
      fill: remplissage(col === colSalarie ? COULEURS.ambreClair : col === colEmployeur ? COULEURS.emeraudeClair : COULEURS.fondTotal),
      alignment: { vertical: "middle", horizontal: col === 1 ? "left" : col >= colValeur ? "right" : "center", indent: col === 1 || col >= colValeur ? 1 : 0 },
      border: { top: { style: "medium", color: { argb: COULEURS.vertNuit } }, bottom: { style: "medium", color: { argb: COULEURS.vertNuit } } },
      numFmt: col >= colValeur ? FORMAT_EUROS : undefined,
    };
  });

  // ---- Récapitulatif paie (libellé étalé sur la largeur, montant à droite)
  sheet.addRow([]).height = 14;
  const titreRecap = sheet.addRow(["Récapitulatif paie"]);
  sheet.mergeCells(titreRecap.number, 1, titreRecap.number, colValeur);
  titreRecap.height = 24;
  titreRecap.getCell(1).style = {
    font: { bold: true, size: 12, color: { argb: COULEURS.blanc } },
    fill: remplissage(COULEURS.vertNuit),
    alignment: { vertical: "middle", horizontal: "left", indent: 1 },
  };

  const recap = [
    ["Nombre total de tickets", totalTickets, "0", COULEURS.blanc],
    [`Valeur totale (${VALEUR_TICKET} € / ticket)`, totalTickets * VALEUR_TICKET, FORMAT_EUROS, COULEURS.zebre],
    [`À retenir sur les fiches de paie des salariés (${PART_SALARIE} € / ticket)`, totalTickets * PART_SALARIE, FORMAT_EUROS, COULEURS.ambreClair],
    [`À la charge de l'entreprise (${PART_EMPLOYEUR} € / ticket)`, totalTickets * PART_EMPLOYEUR, FORMAT_EUROS, COULEURS.emeraudeClair],
  ];
  for (const [libelle, valeur, format, fond] of recap) {
    const ligne = sheet.addRow([]);
    ligne.height = 22;
    ligne.getCell(1).value = libelle;
    sheet.mergeCells(ligne.number, 1, ligne.number, colTickets);
    ligne.getCell(colValeur).value = valeur;
    const bord = { style: "thin", color: { argb: COULEURS.bordure } };
    ligne.getCell(1).style = {
      font: { size: 10, color: { argb: COULEURS.texte } },
      fill: remplissage(fond),
      alignment: { vertical: "middle", horizontal: "left", indent: 1 },
      border: { left: bord, bottom: bord },
    };
    ligne.getCell(colValeur).style = {
      font: { bold: true, size: 11, color: { argb: COULEURS.texte } },
      fill: remplissage(fond),
      alignment: { vertical: "middle", horizontal: "right", indent: 1 },
      border: { right: bord, bottom: bord },
      numFmt: format,
    };
  }

  // ---- Légende (pastilles aux mêmes couleurs que le tableau)
  sheet.addRow([]).height = 14;
  const legende = sheet.addRow(["Légende"]);
  legende.height = 20;
  legende.getCell(1).style = { font: { bold: true, size: 10, color: { argb: COULEURS.texteDoux } }, alignment: { vertical: "middle", indent: 1 } };
  const items = [
    ["✓", "Ticket", "ticket"],
    ["CP", "Congé", "conge"],
    ["Férié", "Férié", "ferie"],
    ["FT", "Férié travaillé", "ferie_travaille"],
    ["Rég.", "Retiré", "regularise"],
  ];
  let col = 2;
  for (const [code, texte, etat] of items) {
    const rendu = STYLE_ETAT[etat];
    const pastille = legende.getCell(col);
    pastille.value = code;
    pastille.style = {
      font: { size: 9, bold: true, color: { argb: rendu.texte } },
      fill: remplissage(rendu.fond),
      alignment: { vertical: "middle", horizontal: "center" },
    };
    const libelle = legende.getCell(col + 1);
    libelle.value = texte;
    libelle.style = { font: { size: 9, color: { argb: COULEURS.texteDoux } }, alignment: { vertical: "middle" } };
    col += col === 2 ? 3 : 4; // la 2e colonne (Pôle) est plus large que celles des jours
  }

  sheet.headerFooter.oddFooter = `&L&8CF Réseaux · Tickets restaurant ${MOIS_LONGS[mois]} ${annee}&R&8Page &P / &N`;

  await logAudit(session.user.id, "EXPORT_TR", `${MOIS_LONGS[mois]} ${annee}`);

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="tickets-restaurant-${moisParam}.xlsx"`,
    },
  });
}
