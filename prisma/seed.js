const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// Duplique volontairement lib/permissions.js (ESM) car ce script tourne en
// CommonJS pur via `node prisma/seed.js`, sans passage par le bundler Next.js.
function defaultOngletsForRole(role) {
  if (role === "ADMIN") return ["comptable", "employeur", "admin"];
  if (role === "EMPLOYEUR") return ["employeur"];
  if (role === "COMPTABLE") return ["comptable"];
  return [];
}

// Types de conges/statuts repris du fichier Excel (onglet "Notice"), couleurs
// derivees de la charte CF Reseaux. Plafond CP a 30 j = 2.5 j x 12 mois
// (periode d'acquisition mai -> avril, cf. cron d'acquisition mensuelle).
const LEAVE_TYPES = [
  { code: "CP", libelle: "Congé payé", couleur: "#6CB64D", comptabiliseSolde: true, demandable: true, plafondAnnuel: 30, ordre: 1 },
  { code: "RH", libelle: "Repos (RTT)", couleur: "#8FD16F", comptabiliseSolde: true, demandable: true, plafondAnnuel: 10, ordre: 2 },
  { code: "C", libelle: "Congé sans solde", couleur: "#9CA3AF", comptabiliseSolde: false, demandable: true, plafondAnnuel: null, ordre: 3 },
  { code: "TT", libelle: "Télétravail", couleur: "#4C8DBF", comptabiliseSolde: false, demandable: true, plafondAnnuel: null, ordre: 4 },
  { code: "ARM", libelle: "Arrêt maladie", couleur: "#E8A23D", comptabiliseSolde: false, demandable: true, plafondAnnuel: null, ordre: 5 },
  { code: "ASA", libelle: "Autorisation spéciale d'absence", couleur: "#FFF200", comptabiliseSolde: false, demandable: true, plafondAnnuel: null, ordre: 6 },
  { code: "at", libelle: "Accident de travail", couleur: "#E2857A", comptabiliseSolde: false, demandable: true, plafondAnnuel: null, ordre: 7 },
  { code: "ext", libelle: "Extérieur (visite, formation…)", couleur: "#9B7FD1", comptabiliseSolde: false, demandable: true, plafondAnnuel: null, ordre: 8 },
  { code: "ec", libelle: "École", couleur: "#63B3C9", comptabiliseSolde: false, demandable: true, plafondAnnuel: null, ordre: 9 },
  { code: "abs", libelle: "Absence sans justification", couleur: "#C4453A", comptabiliseSolde: false, demandable: false, plafondAnnuel: null, ordre: 10 },
  { code: "JT", libelle: "Jour travaillé", couleur: "#16231A", comptabiliseSolde: false, demandable: false, plafondAnnuel: null, ordre: 11 },
  { code: "F", libelle: "Férié", couleur: "#EFEDE0", comptabiliseSolde: false, demandable: false, plafondAnnuel: null, ordre: 12 },
  { code: "x", libelle: "Indisponible", couleur: "#D9D6C7", comptabiliseSolde: false, demandable: false, plafondAnnuel: null, ordre: 13 },
];

// Motifs a duree fixe pour les ASA (congés pour événements familiaux, Code du
// travail art. L3142-4 et loi 2023 sur le deuil d'un enfant). Modifiable
// ensuite dans Admin > Types de congés > ASA.
const ASA_MOTIFS = [
  { libelle: "Mariage ou PACS du collaborateur", jours: 4, ordre: 1 },
  { libelle: "Mariage d'un enfant", jours: 1, ordre: 2 },
  { libelle: "Naissance ou adoption", jours: 3, ordre: 3 },
  { libelle: "Décès du conjoint / partenaire de PACS", jours: 3, ordre: 4 },
  { libelle: "Décès d'un parent (père, mère)", jours: 3, ordre: 5 },
  { libelle: "Décès d'un enfant", jours: 7, ordre: 6 },
  { libelle: "Décès d'un frère ou d'une sœur", jours: 3, ordre: 7 },
  { libelle: "Annonce de handicap d'un enfant", jours: 2, ordre: 8 },
];

// Le seul compte cree par le seed : l'administrateur / createur de la plateforme.
// Changez le mot de passe des la premiere connexion (Profil > Changer de mot de passe).
const ADMIN = {
  nom: "EROUART",
  prenom: "Martial",
  email: "merouart@cf-reseaux.fr",
  password: "ChangeMoiMaintenant2026!",
  service: "Communication",
};

async function main() {
  console.log("Seed CF Reseaux — démarrage (base vierge)...");

  const typeByCode = {};
  for (const t of LEAVE_TYPES) {
    const created = await prisma.leaveType.upsert({
      where: { code: t.code },
      update: t,
      create: t,
    });
    typeByCode[t.code] = created;
  }

  const asaType = typeByCode.ASA;
  for (const m of ASA_MOTIFS) {
    const existing = await prisma.leaveTypeMotif.findFirst({
      where: { leaveTypeId: asaType.id, libelle: m.libelle },
    });
    if (!existing) {
      await prisma.leaveTypeMotif.create({
        data: { leaveTypeId: asaType.id, libelle: m.libelle, jours: m.jours, ordre: m.ordre },
      });
    }
  }

  const passwordHash = await bcrypt.hash(ADMIN.password, 10);
  const admin = await prisma.user.upsert({
    where: { email: ADMIN.email },
    update: {},
    create: {
      nom: ADMIN.nom,
      prenom: ADMIN.prenom,
      email: ADMIN.email,
      motDePasseHash: passwordHash,
      role: "ADMIN",
      service: ADMIN.service,
      statutCompte: "ACTIF",
      ongletsActifs: defaultOngletsForRole("ADMIN"),
      dateEntree: new Date(),
    },
  });

  console.log("Seed terminé — base vierge, prête à être configurée.");
  console.log(`Compte administrateur : ${admin.email} / mot de passe : ${ADMIN.password}`);
  console.log("→ Changez ce mot de passe dès la première connexion.");
  console.log("→ Ajoutez vos collaborateurs depuis Admin > Utilisateurs > Ajouter un collaborateur.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
