const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const YEAR = 2026;
const DEMO_PASSWORD = "CfReseaux2026!"; // meme mot de passe demo pour tous les comptes de test

// Types de conges/statuts repris du fichier Excel (onglet "Notice"), couleurs
// derivees de la charte CF Reseaux (vert clair pour le positif, jaune pour
// l'attente/exceptionnel, rouge doux pour le non justifie).
const LEAVE_TYPES = [
  { code: "CP", libelle: "Congé payé", couleur: "#6CB64D", comptabiliseSolde: true, demandable: true, plafondAnnuel: 25, ordre: 1 },
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

// Les 15 collaborateurs du planning CF Reseaux (source: Book1.xlsx, onglet
// "Pilotage 2026"), avec les jours deja consommes cette annee.
const USERS = [
  { nom: "GRÉBERT", prenom: "Matthieu", role: "COLLABORATEUR", service: "Bureau d'études", pris: { CP: 10, JT: 20, F: 1 } },
  { nom: "LANCELLE", prenom: "Aurélie", role: "EMPLOYEUR", service: "Direction", pris: { C: 20, JT: 10, F: 1 } },
  { nom: "GOUTANT", prenom: "Léa", role: "COLLABORATEUR", service: "Formation", pris: { CP: 10, JT: 25, F: 1 } },
  { nom: "RADKOWSKI", prenom: "Camille", role: "COMPTABLE", service: "Comptabilité", pris: { CP: 10, JT: 30, F: 1 } },
  { nom: "ASI", prenom: "Vaïna", role: "COLLABORATEUR", service: "Formation", pris: { CP: 10, JT: 20, F: 1 } },
  { nom: "MILLEVILLE", prenom: "Léa", role: "COLLABORATEUR", service: "Formation", pris: { CP: 15, JT: 11, ASA: 4, F: 1 } },
  { nom: "EROUART", prenom: "Martial", role: "ADMIN", service: "Communication", email: "merouart@cf-reseaux.fr", pris: { C: 10, JT: 20, ec: 20, F: 1 } },
  { nom: "PION", prenom: "Thierry", role: "COLLABORATEUR", service: "Bureau d'études", pris: { CP: 5, JT: 25, F: 1 } },
  { nom: "DUBARRE", prenom: "Antoine", role: "COLLABORATEUR", service: "Bureau d'études", pris: { CP: 10, JT: 20, F: 1 } },
  { nom: "GUERREIRO", prenom: "Alexis", role: "COLLABORATEUR", service: "Réinsertion", pris: { JT: 30, F: 1 } },
  { nom: "SAJDA", prenom: "Gérard", role: "COLLABORATEUR", service: "Réinsertion", statutCompte: "DESACTIVE", pris: { x: 30, F: 1 } },
  { nom: "MASCLET", prenom: "Valentin", role: "COLLABORATEUR", service: "Bureau d'études", pris: { CP: 15, JT: 15, F: 1 } },
  { nom: "DE FARIA", prenom: "Carlos", role: "COLLABORATEUR", service: "Réinsertion", statutCompte: "DESACTIVE", pris: { x: 30, F: 1 } },
  { nom: "ADEGNON", prenom: "Kodjo Thomas", role: "COLLABORATEUR", service: "Bureau d'études", pris: { CP: 16, TT: 10, ASA: 4, F: 1 } },
  { nom: "QUATTROCIOCCHI", prenom: "Maxim", role: "COLLABORATEUR", service: "Formation", statutCompte: "EN_ATTENTE", pris: { x: 30, F: 1 } },
];

function slugEmail(prenom, nom) {
  const clean = (s) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z]/g, ".");
  return `${clean(prenom)}.${clean(nom)}@cf-reseaux.fr`;
}

async function main() {
  console.log("Seed CF Reseaux — démarrage...");

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // 1) Types de congés
  const typeByCode = {};
  for (const t of LEAVE_TYPES) {
    const created = await prisma.leaveType.upsert({
      where: { code: t.code },
      update: t,
      create: t,
    });
    typeByCode[t.code] = created;
  }

  // 2) Utilisateurs + soldes
  const createdUsers = {};
  for (const u of USERS) {
    const email = u.email || slugEmail(u.prenom, u.nom);
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        nom: u.nom,
        prenom: u.prenom,
        email,
        motDePasseHash: passwordHash,
        role: u.role,
        service: u.service,
        statutCompte: u.statutCompte || "ACTIF",
        dateEntree: new Date(`${YEAR - 2}-09-01`),
      },
    });
    createdUsers[`${u.nom} ${u.prenom}`] = user;

    for (const [code, pris] of Object.entries(u.pris || {})) {
      const type = typeByCode[code];
      if (!type) continue;
      await prisma.leaveBalance.upsert({
        where: { userId_leaveTypeId_annee: { userId: user.id, leaveTypeId: type.id, annee: YEAR } },
        update: { joursPris: pris },
        create: {
          userId: user.id,
          leaveTypeId: type.id,
          annee: YEAR,
          joursAcquis: type.plafondAnnuel || 0,
          joursPris: pris,
        },
      });
    }
  }

  // Rattachement hierarchique simple : tout le monde reporte a Aurélie LANCELLE (Employeur)
  const manager = createdUsers["LANCELLE Aurélie"];
  for (const [key, user] of Object.entries(createdUsers)) {
    if (user.id === manager.id) continue;
    await prisma.user.update({ where: { id: user.id }, data: { managerId: manager.id } });
  }

  // 3) Quelques demandes de démonstration pour illustrer le workflow
  const matthieu = createdUsers["GRÉBERT Matthieu"];
  const camille = createdUsers["RADKOWSKI Camille"];
  const valentin = createdUsers["MASCLET Valentin"];
  const admin = createdUsers["EROUART Martial"];

  const existingRequests = await prisma.leaveRequest.count();
  if (existingRequests === 0) {
    await prisma.leaveRequest.create({
      data: {
        userId: matthieu.id,
        leaveTypeId: typeByCode.CP.id,
        dateDebut: new Date(`${YEAR}-08-10`),
        dateFin: new Date(`${YEAR}-08-14`),
        motif: "Vacances d'été en famille",
        statut: "EN_ATTENTE",
      },
    });

    await prisma.leaveRequest.create({
      data: {
        userId: camille.id,
        leaveTypeId: typeByCode.ASA.id,
        dateDebut: new Date(`${YEAR}-08-03`),
        dateFin: new Date(`${YEAR}-08-03`),
        demiJournee: true,
        motif: "Rendez-vous médical enfant",
        exceptionnelle: true,
        statut: "EN_ATTENTE",
      },
    });

    await prisma.leaveRequest.create({
      data: {
        userId: valentin.id,
        leaveTypeId: typeByCode.CP.id,
        dateDebut: new Date(`${YEAR}-07-27`),
        dateFin: new Date(`${YEAR}-07-31`),
        motif: "Congés d'été",
        statut: "VALIDE",
        valideParId: manager.id,
        dateValidation: new Date(`${YEAR}-07-15`),
      },
    });

    await prisma.leaveRequest.create({
      data: {
        userId: admin.id,
        leaveTypeId: typeByCode.C.id,
        dateDebut: new Date(`${YEAR}-09-01`),
        dateFin: new Date(`${YEAR}-09-02`),
        motif: "Déménagement",
        statut: "REFUSE",
        valideParId: manager.id,
        dateValidation: new Date(`${YEAR}-08-20`),
        commentaireRefus: "Période chargée pour le service, merci de reproposer des dates en octobre.",
      },
    });

    await prisma.notification.create({
      data: { userId: manager.id, type: "Nouvelle demande", message: "Matthieu GRÉBERT a soumis une demande de CP." },
    });
    await prisma.notification.create({
      data: { userId: valentin.id, type: "Demande validée", message: "Votre demande de CP du 27 au 31 juillet a été validée." },
    });
  }

  console.log("Seed terminé.");
  console.log(`${USERS.length} comptes créés — mot de passe de démonstration pour tous : ${DEMO_PASSWORD}`);
  console.log(`Compte administrateur : ${admin.email}`);
  console.log(`Compte employeur (validation) : ${manager.email}`);
  console.log(`Compte comptable : ${camille.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
