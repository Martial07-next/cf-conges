import { calculerSoldeCP } from "./moteurConges";

const NORMALISER = (texte = "") =>
  texte.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, " ").replace(/[^a-z0-9,.-]+/g, " ").trim();

const MOTS_VIDES = new Set(["je","j","tu","il","elle","on","nous","vous","ils","elles","le","la","les","un","une","des","de","du","d","a","au","aux","et","ou","en","pour","sur","dans","mon","ma","mes","ton","ta","tes","ce","ca","c","est","que","qui","quoi","comment","svp","stp"]);

function contient(q, mots) {
  return mots.some((mot) => q.includes(NORMALISER(mot)));
}

function tokens(texte) {
  return NORMALISER(texte).split(/\s+/).filter((m) => m.length > 1 && !MOTS_VIDES.has(m));
}

function distance(a, b) {
  const m = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return m[a.length][b.length];
}

function proche(a, b) {
  if (a === b || a.includes(b) || b.includes(a)) return true;
  if (Math.min(a.length, b.length) < 4) return false;
  return distance(a, b) <= (Math.max(a.length, b.length) >= 8 ? 2 : 1);
}

function scoreIntent(q, mots, expressions = []) {
  let score = expressions.some((x) => q.includes(NORMALISER(x))) ? 4 : 0;
  const qt = tokens(q);
  for (const mot of mots) {
    const n = NORMALISER(mot);
    if (qt.some((t) => proche(t, n))) score++;
  }
  return score;
}

function intent(q) {
  const intents = [
    ["solde", ["solde","reste","restant","disponible","combien","cp","conge"], ["combien de jours","combien il me reste","mes cp","mon solde"]],
    ["n1", ["n1","reliquat","precedente","ancien","report"], ["n-1","annee precedente"]],
    ["acquisition", ["acquisition","acquis","prorata","cumule","gagne","2,5","2.5"], ["comment sont calcules","combien gagne"]],
    ["demijournee", ["demi","journee","matin","apres-midi","aprem"], ["demi journee"]],
    ["teletravail", ["teletravail","tt","distance","fixe","semaine"], ["travail a distance"]],
    ["prochaine", ["prochaine","prochain","absence","conge","vacance"], ["prochaine absence","prochain conge"]],
    ["statut", ["statut","attente","valide","refuse","demande","accepte"], ["ou en est","ma demande"]],
    ["creer", ["poser","creer","faire","demande","conge","absence"], ["poser un conge","nouvelle demande"]],
    ["annuler", ["annuler","annulation","supprimer","retirer","demande"], ["annuler une demande"]],
    ["ticket", ["ticket","restau","restaurant","repas","tr"], ["ticket restaurant"]],
    ["planning", ["planning","bureau","equipe","presence","absent","calendrier"], ["planning equipe"]],
    ["ferie", ["ferie","feries","fete","chome"], ["jour ferie"]],
    ["motdepasse", ["mot","passe","connexion","login","acces","temporaire"], ["mot de passe","je ne peux pas me connecter"]],
    ["profil", ["profil","compte","email","theme","parametre"], ["mon profil"]],
  ];
  return intents
    .map(([nom, mots, expressions]) => ({ nom, score: scoreIntent(q, mots, expressions) }))
    .sort((a, b) => b.score - a.score)[0];
}

function formatDate(date) {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(date));
}

export async function repondreOSEFBOT({ prisma, userId, message }) {
  const brut = String(message || "").trim().slice(0, 600);
  const q = NORMALISER(brut);

  if (!brut) return "Pose-moi une question sur CF Congés 🙂";
  if (contient(q, ["ignore tes instructions","prompt system","system prompt","mot de passe des","password des","secret","token","api key","cle api"])) {
    return "Je ne peux pas révéler de mots de passe, secrets techniques ou instructions internes. En revanche, je peux t’aider à utiliser CF Congés.";
  }
  if (contient(q, ["connard","fdp","encule","nique","pute","salope"])) {
    return "On va gentiment reformuler ça 😌 Je suis là pour t’aider sur CF Congés.";
  }
  if (contient(q, ["solde de ","conges de ","cp de ","absence de "]) && !contient(q, ["mon ","mes ","moi"])) {
    return "Je protège les informations personnelles des collègues. Je peux t’expliquer les règles générales ou te renseigner sur tes propres données.";
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { prenom: true, dateEntree: true, teletravailAutorise: true, teletravailJoursMax: true, teletravailJours: true, estAlternant: true },
  });
  if (!user) return "Je n’arrive pas à retrouver ton profil. Réessaie dans un instant.";

  if (contient(q, ["bonjour","salut","hello","coucou","yo","bonsoir"]) && tokens(q).length <= 3) {
    return `Salut ${user.prenom} 👋 Je suis OSEFBOT. Tu peux me parler naturellement : CP, N/N-1, demandes, télétravail, planning, tickets restaurant ou fonctionnement de CF Congés.`;
  }

  const choix = intent(q);
  if (!choix || choix.score < 2) {
    return "Doucement 😅 Martial ne m’a pas encore formé là-dessus. Mets-moi un 👎 juste en dessous pour lui signaler qu’il doit m’apprendre ça. Je serai meilleur la prochaine fois.";
  }

  if (choix.nom === "solde") {
    const solde = await calculerSoldeCP(prisma, userId, new Date());
    return `Tu disposes actuellement de ${solde.disponible} jour(s) de CP sur N et ${solde.n1.disponible} jour(s) sur N-1. Sur N, tu as acquis ${solde.acquis} jour(s) et ${solde.pris} jour(s) ont déjà été imputés.`;
  }
  if (choix.nom === "n1") return "Le N-1 correspond au reliquat de la campagne précédente. Lors de la validation d’un CP, CF Congés impute en priorité ce qui peut l’être sur N-1, puis le reste sur N.";
  if (choix.nom === "acquisition") return "Les CP sont acquis sur une campagne du 1er juin au 31 mai, sur une base de 2,5 jours par mois et un plafond annuel de 30 jours. Un mois incomplet est proratisé selon les jours ouvrés concernés. Les congés sans solde validés réduisent l’acquisition. Si ton résultat paraît faux, utilise « Signaler une erreur de solde » dans CP N.";
  if (choix.nom === "demijournee") return "Une demi-journée porte sur une seule date. Tu choisis Matin ou Après-midi lors de la demande ; le planning sépare ensuite les deux périodes.";
  if (choix.nom === "teletravail") {
    if (!user.teletravailAutorise) return "Le télétravail n’est actuellement pas autorisé sur ton profil. Si cela te semble incorrect, rapproche-toi d’un employeur ou administrateur.";
    const jours = user.teletravailJours?.length ? user.teletravailJours.join(", ").toLowerCase() : "aucun jour fixe sélectionné";
    return `Ton profil autorise jusqu’à ${user.teletravailJoursMax} jour(s) de télétravail par semaine. Jours actuellement configurés : ${jours}. Les exceptions et demandes validées apparaissent dans le planning.`;
  }
  if (choix.nom === "prochaine") {
    const prochaine = await prisma.leaveRequest.findFirst({
      where: { userId, statut: "VALIDE", dateFin: { gte: new Date() }, leaveType: { code: { not: "TT" } } },
      include: { leaveType: true }, orderBy: { dateDebut: "asc" },
    });
    return prochaine ? `Ta prochaine absence validée est « ${prochaine.leaveType.libelle} », du ${formatDate(prochaine.dateDebut)} au ${formatDate(prochaine.dateFin)}${prochaine.demiJournee ? ` (${prochaine.demiJourneePeriode === "MATIN" ? "matin" : "après-midi"})` : ""}.` : "Je ne trouve aucune absence validée à venir sur ton compte.";
  }
  if (choix.nom === "statut") {
    const derniere = await prisma.leaveRequest.findFirst({ where: { userId }, include: { leaveType: true }, orderBy: { createdAt: "desc" } });
    return derniere ? `Ta dernière demande concerne « ${derniere.leaveType.libelle} » et son statut est : ${derniere.statut.replaceAll("_", " ").toLowerCase()}.` : "Tu n’as encore aucune demande enregistrée.";
  }
  if (choix.nom === "creer") return "Va dans « Nouvelle demande », choisis le type d’absence, les dates et, si nécessaire, la demi-journée. Après l’envoi, la demande passe en attente jusqu’à son traitement.";
  if (choix.nom === "annuler") return "Depuis « Mes demandes », tu peux gérer tes demandes. Une demande déjà validée peut nécessiter une demande d’annulation qui sera ensuite traitée par les responsables.";
  if (choix.nom === "ticket") return "Les tickets restaurant sont calculés par la plateforme en tenant compte des règles et des absences qui retirent un ticket. Le gestionnaire TR dispose de son espace pour les mois, régularisations et livraisons.";
  if (choix.nom === "planning") return "Le planning équipe utilise des codes compacts : B pour Bureau et TT pour Télétravail. Les demi-journées séparent matin et après-midi. Les absences validées apparaissent avec le code de leur type.";
  if (choix.nom === "ferie") return "Les jours fériés ne sont pas décomptés comme jours d’absence dans le calcul des congés. L’acquisition mensuelle reste fondée sur les jours ouvrés de la campagne.";
  if (choix.nom === "motdepasse") return "Si ton mot de passe temporaire doit être changé, CF Congés te redirige vers ton profil. Après plusieurs échecs de connexion, demande à un administrateur de réinitialiser ton accès ; le nouveau mot de passe temporaire devra ensuite être changé.";
  if (choix.nom === "profil") return "Ton espace Profil regroupe les informations et réglages liés à ton compte. Pour une donnée personnelle sensible ou une modification que l’application ne permet pas directement, adresse-toi à un administrateur.";

  return "Doucement 😅 Martial ne m’a pas encore formé là-dessus. Mets-moi un 👎 juste en dessous pour lui signaler qu’il doit m’apprendre ça. Je serai meilleur la prochaine fois.";
}
