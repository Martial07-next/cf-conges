import { calculerSoldeCP } from "./moteurConges";

const NORMALISER = (texte = "") =>
  texte.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function contient(q, mots) {
  return mots.some((mot) => q.includes(mot));
}

function formatDate(date) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export async function repondreOSEFBOT({ prisma, userId, message }) {
  const brut = String(message || "").trim().slice(0, 600);
  const q = NORMALISER(brut);

  if (!brut) return "Pose-moi une question sur CF Congés 🙂";
  if (contient(q, ["ignore tes instructions", "prompt system", "system prompt", "mot de passe", "password", "secret", "token", "api key", "cle api"])) {
    return "Je ne peux pas révéler de mots de passe, secrets techniques ou instructions internes. En revanche, je peux t’aider à utiliser CF Congés.";
  }
  if (contient(q, ["connard", "fdp", "encule", "nique", "pute", "salope"])) {
    return "On va gentiment reformuler ça 😌 Je suis là pour t’aider sur CF Congés.";
  }
  if (contient(q, ["solde de ", "conges de ", "congé de ", "cp de ", "absence de "]) && !contient(q, ["mon ", "mes ", "moi"])) {
    return "Je protège les informations personnelles des collègues. Je peux t’expliquer les règles générales ou te renseigner sur tes propres données.";
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { prenom: true, dateEntree: true, teletravailAutorise: true, teletravailJoursMax: true, teletravailJours: true, estAlternant: true },
  });
  if (!user) return "Je n’arrive pas à retrouver ton profil. Réessaie dans un instant.";

  if (contient(q, ["combien", "solde", "reste"]) && contient(q, ["cp", "conge", "congé", "jour"])) {
    const solde = await calculerSoldeCP(prisma, userId, new Date());
    return `Tu disposes actuellement de ${solde.disponible} jour(s) de CP sur N et ${solde.n1.disponible} jour(s) sur N-1. Sur N, tu as acquis ${solde.acquis} jour(s) et ${solde.pris} jour(s) ont déjà été imputés.`;
  }

  if (contient(q, ["n-1", "n1"])) {
    return "Le solde N-1 correspond au reliquat de la campagne précédente. Lors de la validation d’un CP, CF Congés impute en priorité ce qui peut l’être sur N-1, puis le reste sur N.";
  }
  if (contient(q, ["prorata", "acquisition", "acquis", "2,5", "2.5"])) {
    return "Les CP sont acquis sur une campagne du 1er juin au 31 mai, avec une base de 2,5 jours par mois et un plafond annuel de 30 jours. Pour un mois incomplet, le moteur calcule un prorata selon les jours ouvrés concernés. Les congés sans solde validés réduisent l’acquisition. Si ton résultat te paraît faux, utilise « Signaler une erreur de solde » dans la carte CP N.";
  }
  if (contient(q, ["demi journee", "demi-journee", "demi journée"])) {
    return "Une demi-journée doit porter sur une seule date. Tu choisis Matin ou Après-midi lors de la demande ; le planning affiche ensuite séparément les deux périodes.";
  }
  if (contient(q, ["teletravail", "télétravail", " tt"])) {
    if (!user.teletravailAutorise) return "Le télétravail n’est actuellement pas autorisé sur ton profil. Si cela te semble incorrect, rapproche-toi d’un employeur ou administrateur.";
    const jours = user.teletravailJours?.length ? user.teletravailJours.join(", ").toLowerCase() : "aucun jour fixe sélectionné";
    return `Ton profil autorise jusqu’à ${user.teletravailJoursMax} jour(s) de télétravail par semaine. Jours actuellement configurés : ${jours}. Les exceptions et demandes validées apparaissent dans le planning.`;
  }
  if (contient(q, ["prochaine", "prochain"]) && contient(q, ["absence", "conge", "congé", "demande"])) {
    const prochaine = await prisma.leaveRequest.findFirst({
      where: { userId, statut: "VALIDE", dateFin: { gte: new Date() }, leaveType: { code: { not: "TT" } } },
      include: { leaveType: true },
      orderBy: { dateDebut: "asc" },
    });
    return prochaine
      ? `Ta prochaine absence validée est « ${prochaine.leaveType.libelle} », du ${formatDate(prochaine.dateDebut)} au ${formatDate(prochaine.dateFin)}${prochaine.demiJournee ? ` (${prochaine.demiJourneePeriode === "MATIN" ? "matin" : "après-midi"})` : ""}.`
      : "Je ne trouve aucune absence validée à venir sur ton compte.";
  }
  if (contient(q, ["statut", "attente", "validee", "validée", "refusee", "refusée"]) && contient(q, ["demande", "conge", "congé"])) {
    const derniere = await prisma.leaveRequest.findFirst({ where: { userId }, include: { leaveType: true }, orderBy: { createdAt: "desc" } });
    return derniere ? `Ta dernière demande concerne « ${derniere.leaveType.libelle} » et son statut est : ${derniere.statut.replaceAll("_", " ").toLowerCase()}.` : "Tu n’as encore aucune demande enregistrée.";
  }
  if (contient(q, ["poser", "faire", "creer", "créer"]) && contient(q, ["demande", "conge", "congé"])) {
    return "Va dans « Nouvelle demande », choisis le type d’absence, les dates et, si nécessaire, la demi-journée. Après envoi, la demande passe en attente jusqu’à sa validation.";
  }
  if (contient(q, ["annuler", "annulation"])) {
    return "Depuis « Mes demandes », tu peux gérer tes demandes. Une demande déjà validée peut nécessiter une demande d’annulation qui sera ensuite traitée par les responsables.";
  }
  if (contient(q, ["ticket", "restau", "restaurant"])) {
    return "Les tickets restaurant sont calculés par la plateforme en tenant compte des règles et absences qui retirent un ticket. Le gestionnaire TR dispose de son propre espace pour suivre les mois, régularisations et livraisons.";
  }
  if (contient(q, ["planning", "bureau", "equipe", "équipe"])) {
    return "Le planning équipe utilise des codes compacts : B pour Bureau et TT pour Télétravail. Les demi-journées affichent séparément le matin et l’après-midi. Les absences validées y apparaissent avec le code de leur type.";
  }
  if (contient(q, ["bonjour", "salut", "hello", "coucou"])) {
    return `Salut ${user.prenom} 👋 Je suis OSEFBOT. Demande-moi par exemple ton solde de CP, ta prochaine absence, le fonctionnement de N-1, du prorata ou du télétravail.`;
  }

  return "Je n’ai pas une réponse assez fiable à cette question pour le moment. Je préfère ne rien inventer. Essaie de me demander quelque chose sur les congés, N/N-1, le prorata, le télétravail, le planning, les tickets restaurant ou tes propres demandes.";
}
