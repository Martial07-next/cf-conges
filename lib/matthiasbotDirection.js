// MatthiasBot : questions réservées à la direction (Employeur / RH,
// administrateur, pôle Direction, accès « Validation & accès ») : solde, âge
// ou date de naissance d'un collègue, classement des soldes, demandes en
// attente avec leur solde. Les autres collaborateurs gardent la protection
// des données personnelles (lib/matthiasbotEquipe.js).
import { canAccess } from "./permissions";
import { estDirection } from "./agendaDirection";
import { calculerSoldeCP } from "./moteurConges";
import { chargerCollegues, colleguesCites, nomComplet } from "./matthiasbotEquipe";
import { soldesPourDemandes } from "./soldeDemande";
import { joursAbsenceEntre } from "./campagneConges";

const NORMALISER = (texte = "") =>
  texte.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, " ").replace(/([a-z])-([a-z])/g, "$1 $2").replace(/[^a-z0-9/.-]+/g, " ").trim();

const j = (n) => `${String(Math.round(n * 100) / 100).replace(".", ",")} j`;
const auHasard = (liste) => liste[Math.floor(Math.random() * liste.length)];

export function estPrivilegie(user) {
  const u = { ...user, onglets: user.ongletsActifs ?? user.onglets };
  return user.role === "EMPLOYEUR" || user.role === "ADMIN" || estDirection(user) || canAccess(u, "employeur");
}

// Quand l'Employeur / RH demande son propre solde.
export function reponseBossSolde(prenom = "") {
  return auHasard([
    `C’est toi la boss${prenom ? ` ${prenom}` : ""}, pas besoin de congés 😎👑 (Et puis officiellement, l’Employeur / RH ne cumule pas de CP.)`,
    "Des congés ? Pour la boss ? 😏 Tu décides de tout, même de tes vacances. Côté appli, l’Employeur / RH n’a pas de solde de CP.",
    "La boss n’a pas de solde, elle a un empire 👑 Mais si tu veux, je te donne celui de n’importe qui dans l’équipe : « combien de congés reste à Sam ? »",
  ]);
}

const QUESTION_SOLDE = /\b(solde|soldes|cp|conge|conges|jours de conge|jours restant|reste|restant|restants|dispo|disponible|disponibles|acquis|pris)\b/;
const PRESENCE = /\b(ou est|ou sera|est en conge|sera en conge|etait en conge|revient|rentre|demain|aujourd hui|lundi|mardi|mercredi|jeudi|vendredi|cette semaine)\b/;

async function soldeDe(prisma, u) {
  const s = await calculerSoldeCP(prisma, u.id, new Date());
  const enAttente = await prisma.leaveRequest.findMany({
    where: { userId: u.id, statut: "EN_ATTENTE", leaveType: { code: "CP" } },
    select: { dateDebut: true, dateFin: true, demiJournee: true },
  });
  const joursAttente = enAttente.reduce((t, r) => t + joursAbsenceEntre(new Date(r.dateDebut), new Date(r.dateFin)) * (r.demiJournee ? 0.5 : 1), 0);
  return { s, total: s.disponible + s.n1.disponible, enAttente: enAttente.length, joursAttente };
}

function age(dateNaissance) {
  const n = new Date(dateNaissance);
  const auj = new Date();
  let a = auj.getFullYear() - n.getUTCFullYear();
  if (auj.getMonth() < n.getUTCMonth() || (auj.getMonth() === n.getUTCMonth() && auj.getDate() < n.getUTCDate())) a--;
  return a;
}

// Renvoie { reponse, navigation } ou null.
export async function repondreDirection({ prisma, q: brut, moi }) {
  if (!estPrivilegie(moi)) return null;
  const q = NORMALISER(brut).replace(/\b(matthias ?bot|osef ?bot)\b/g, " ");

  // Demandes en attente, avec leur solde.
  if (
    /\b(a valider|quoi valider|qu est ce que je dois valider|en attente de validation)\b/.test(q) ||
    (/\bdemandes?\b/.test(q) && /\b(en attente|a traiter|a valider|pas encore validee?s?)\b/.test(q))
  ) {
    const demandes = await prisma.leaveRequest.findMany({
      where: { statut: "EN_ATTENTE" },
      include: { user: true, leaveType: true },
      orderBy: { createdAt: "asc" },
      take: 20,
    });
    if (!demandes.length) return { reponse: "Aucune demande en attente, tout est traité 🎉", navigation: { href: "/employeur", label: "Ouvrir Validation & accès" } };
    const soldes = await soldesPourDemandes(prisma, demandes);
    const lignes = demandes.map((r) => {
      const info = soldes.get(r.id);
      const date = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
      const periode = `${date.format(new Date(r.dateDebut))}${r.dateFin && new Date(r.dateFin).getTime() !== new Date(r.dateDebut).getTime() ? ` → ${date.format(new Date(r.dateFin))}` : ""}`;
      const verdict = !info?.applicable ? "" : info.suffisant ? ` · ✓ solde ok (reste ${j(info.reste)})` : ` · ✕ solde insuffisant (manque ${j(-info.reste)})`;
      return `• ${nomComplet(r.user)} : ${r.leaveType.libelle}, ${periode} (${j(info?.jours || 0)})${verdict}`;
    });
    return { reponse: `${demandes.length} demande${demandes.length > 1 ? "s" : ""} en attente :\n${lignes.join("\n")}`, navigation: { href: "/employeur", label: "Ouvrir Validation & accès" } };
  }

  const collegues = await chargerCollegues(prisma);

  // Classement des soldes (« qui a le plus de congés ? », « les soldes du pôle X »).
  if (/\b(soldes|qui a le plus|qui a le moins|classement|tous les soldes|liste des soldes|solde de tout le monde|soldes de l equipe|solde de l equipe)\b/.test(q) && QUESTION_SOLDE.test(q)) {
    const pole = collegues.map((u) => u.pole).filter(Boolean).find((p) => q.includes(NORMALISER(p)));
    const groupe = collegues.filter((u) => u.role !== "EMPLOYEUR" && u.dateEntree && (!pole || u.pole === pole));
    const soldes = await Promise.all(groupe.map(async (u) => ({ u, ...(await soldeDe(prisma, u)) })));
    soldes.sort((a, b) => (/\bmoins\b/.test(q) ? a.total - b.total : b.total - a.total));
    const lignes = soldes.slice(0, 15).map((x) => `• ${nomComplet(x.u)} : ${j(x.total)} (N ${j(x.s.disponible)} · N-1 ${j(x.s.n1.disponible)})${x.enAttente ? ` · ${x.enAttente} en attente` : ""}`);
    const titre = /\bmoins\b/.test(q) ? "Les plus petits soldes" : "Soldes de CP disponibles";
    return { reponse: `${titre}${pole ? ` (${pole})` : ""} :\n${lignes.join("\n")}`, navigation: { href: "/comptable", label: "Ouvrir l’espace comptable" } };
  }

  const cites = colleguesCites(q, collegues).filter((u) => u.id !== moi.id);
  if (cites.length > 1 && QUESTION_SOLDE.test(q)) {
    return { reponse: `Je connais plusieurs personnes qui correspondent : ${cites.slice(0, 5).map(nomComplet).join(", ")}. Précise le nom de famille 🙂`, navigation: null };
  }
  if (cites.length !== 1) return null;
  const u = cites[0];

  // Âge / date de naissance.
  if (/\b(age|quel age|date de naissance|ne quand|nee quand|ne le|nee le|annee de naissance)\b/.test(q)) {
    if (!u.dateNaissance) return { reponse: `La date de naissance de ${nomComplet(u)} n’est pas renseignée.`, navigation: null };
    const d = new Date(u.dateNaissance);
    const date = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
    return { reponse: `${nomComplet(u)} est né(e) le ${date} : ${age(u.dateNaissance)} ans 🎂`, navigation: null };
  }

  // Solde de CP d'un collègue.
  if (QUESTION_SOLDE.test(q) && !PRESENCE.test(q)) {
    if (u.role === "EMPLOYEUR") return { reponse: `${nomComplet(u)} est Employeur / RH : pas de solde de CP 😎`, navigation: null };
    if (!u.dateEntree) return { reponse: `Je ne peux pas calculer le solde de ${nomComplet(u)} : sa date d’entrée n’est pas renseignée.`, navigation: null };
    const { s, total, enAttente, joursAttente } = await soldeDe(prisma, u);
    const apres = total - joursAttente;
    const attente = enAttente
      ? `\n• En attente de validation : ${enAttente} demande${enAttente > 1 ? "s" : ""} (${j(joursAttente)}) → ${apres >= 0 ? `il resterait ${j(apres)}` : `il manquerait ${j(-apres)} ⚠️`}`
      : "";
    return {
      reponse: `${nomComplet(u)} a ${j(total)} de CP disponibles aujourd’hui :\n• N : ${j(s.disponible)} (acquis ${j(s.acquis)}, pris ${j(s.pris)})\n• N-1 : ${j(s.n1.disponible)}${attente}`,
      navigation: { href: "/comptable", label: "Voir l’espace comptable" },
    };
  }
  return null;
}
