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
    ["tt_configurer", ["teletravail","tt","fixe","automatique","automatiquement","ajouter","configurer","choisir"], ["ajouter mes teletravail","ajouter mes tt","teletravail automatiquement","jours fixes","configurer mon teletravail","choisir mes jours de teletravail"]],
    ["tt_deplacer", ["teletravail","tt","deplacer","changer","modifier","echanger","exception"], ["deplacer un teletravail","changer mon jour de teletravail","modifier un tt","echanger un jour"]],
    ["tt_retirer", ["teletravail","tt","retirer","supprimer","annuler","prendre"], ["retirer un teletravail","ne pas prendre mon teletravail","supprimer un tt"]],
    ["justificatif", ["justificatif","fichier","piece","document","joindre","ajouter","upload"], ["ajouter un justificatif","joindre un document","mettre plusieurs justificatifs"]],
    ["asa", ["asa","speciale","autorisation","mariage","deces","enfant","malade","rqth","demenagement"], ["autorisation speciale absence","absence speciale","enfant malade"]],
    ["demijournee", ["demi","journee","matin","apres-midi","aprem"], ["demi journee","poser une demi journee"]],
    ["plusieursjours", ["plusieurs","jours","periode","dates","semaine"], ["poser plusieurs jours","demande sur plusieurs jours"]],
    ["creer", ["poser","creer","faire","demande","conge","absence"], ["poser un conge","nouvelle demande","faire une demande"]],
    ["annuler", ["annuler","annulation","supprimer","retirer","demande"], ["annuler une demande","annuler un conge"]],
    ["statut", ["statut","attente","valide","refuse","demande","accepte"], ["ou en est","ma demande","suivre ma demande"]],
    ["solde_detail", ["detail","historique","calcul","solde","comprendre"], ["detail de mon solde","historique du calcul","pourquoi mon solde"]],
    ["n1", ["n1","reliquat","precedente","ancien","report"], ["n-1","annee precedente","solde n1"]],
    ["acquisition", ["acquisition","acquis","prorata","cumule","gagne","2,5","2.5"], ["comment sont calcules","combien gagne"]],
    ["solde", ["solde","reste","restant","disponible","combien","cp","conge"], ["combien de jours","combien il me reste","mes cp","mon solde"]],
    ["planning_vue", ["planning","jour","semaine","mois","vue","calendrier"], ["vue jour","vue semaine","vue mois","changer la vue du planning"]],
    ["planning_codes", ["planning","code","abreviation","couleur","tt","bureau","ext"], ["codes du planning","couleurs du planning","que veut dire b"]],
    ["planning", ["planning","bureau","equipe","presence","absent","calendrier"], ["planning equipe"]],
    ["ecole", ["ecole","alternant","alternance","tuteur","cours"], ["ajouter mes jours ecole","mes alternants","planning ecole"]],
    ["ticket", ["ticket","restau","restaurant","repas","tr"], ["ticket restaurant","mes tickets"]],
    ["notification", ["notification","notifications","alerte","lue","vider"], ["vider mes notifications","marquer comme lu"]],
    ["motdepasse", ["mot","passe","connexion","login","acces","temporaire"], ["mot de passe","changer mon mot de passe","je ne peux pas me connecter"]],
    ["profil", ["profil","compte","email","theme","parametre"], ["mon profil"]],
    ["ferie", ["ferie","feries","fete","chome"], ["jour ferie"]],
    ["prochaine", ["prochaine","prochain","absence","conge","vacance"], ["prochaine absence","prochain conge"]],
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

  if (choix.nom === "tt_configurer") {
    if (!user.teletravailAutorise) return "Le télétravail n’est pas activé sur ton profil. Tu ne peux donc pas encore définir de jours fixes. Demande à un administrateur ou à un employeur de vérifier ton autorisation.";
    const max = user.teletravailJoursMax || 0;
    return `Pour ajouter automatiquement tes télétravails : va dans « Profil », puis « Mes jours de télétravail ». Sélectionne les jours fixes que tu souhaites, par exemple mardi et jeudi. CF Congés les planifiera ensuite automatiquement pour les semaines à venir, sans modifier les semaines déjà passées. Ton profil autorise actuellement jusqu’à ${max} jour(s) fixe(s) par semaine.`;
  }
  if (choix.nom === "tt_deplacer") {
    if (!user.teletravailAutorise) return "Le télétravail n’est pas activé sur ton profil.";
    return "Va dans « Profil » puis « Mes prochains télétravails ». Sur le jour concerné, clique sur « Modifier », choisis un autre jour disponible de la même semaine puis confirme le changement. Cela déplace uniquement cette occurrence : tes jours fixes habituels restent inchangés.";
  }
  if (choix.nom === "tt_retirer") {
    if (!user.teletravailAutorise) return "Le télétravail n’est pas activé sur ton profil.";
    return "Va dans « Profil » puis « Mes prochains télétravails ». Sur le jour que tu ne souhaites pas prendre, clique sur « Ne pas le prendre ». Seule cette occurrence est retirée : ton jour fixe reste configuré pour les semaines suivantes.";
  }
  if (choix.nom === "justificatif") return "Pour joindre un justificatif, ouvre « Nouvelle demande » et choisis le motif concerné. Lorsqu’un justificatif est prévu, un espace « Justificatifs » apparaît sous le motif et dans sa fiche 👁. Tu peux ajouter plusieurs fichiers PDF, JPG, PNG ou WebP, jusqu’à 10 Mo par fichier, et les retirer avant d’envoyer la demande.";
  if (choix.nom === "asa") return "Dans « Nouvelle demande », sélectionne le type d’autorisation spéciale d’absence puis le motif correspondant à ta situation. La fiche 👁 du motif indique sa durée, sa rémunération, les conditions et le justificatif attendu. Certaines règles dépendent de ton ancienneté ou de ta situation : CF Congés contrôle ces conditions au moment de la demande.";
  if (choix.nom === "plusieursjours") return "Dans « Nouvelle demande », choisis « Plusieurs jours », puis renseigne la date de début et la date de fin. CF Congés calculera ensuite la période selon le type d’absence choisi.";
  if (choix.nom === "demijournee") return "Dans « Nouvelle demande », choisis une date unique puis active l’option demi-journée et sélectionne « Matin » ou « Après-midi ». Dans le planning, l’autre moitié reste « Bureau » sauf si une autre demande existe sur cette même journée.";
  if (choix.nom === "planning_vue") return "Dans « Planning équipe », utilise les boutons de vue pour passer entre Jour, Semaine et Mois. La vue Jour détaille une date, la vue Semaine affiche les jours de la semaine et la vue Mois donne une vision globale. Tu peux aussi naviguer dans les dates avec les commandes du planning.";
  if (choix.nom === "planning_codes") return "Dans le planning, B signifie Bureau et TT Télétravail. Les autres absences utilisent le code et la couleur configurés pour leur type, par exemple CP ou EXT. Pour une demi-journée, la case est séparée entre Matin et Après-midi ; clique dessus pour voir le libellé complet.";
  if (choix.nom === "ecole") {
    if (!user.estAlternant) return "L’espace « École » est réservé aux alternants. Les tuteurs ayant des alternants disposent à la place de « Mes alternants » pour suivre leur rythme école / entreprise.";
    return "Va dans « École » depuis le menu. Cet espace te permet de gérer ton rythme école / entreprise et tes périodes d’école. Ton tuteur peut ensuite retrouver ton planning depuis son espace « Mes alternants ».";
  }
  if (choix.nom === "notification") return "Va dans « Notifications ». Tu peux ouvrir tes alertes, utiliser « Tout marquer comme lu » pour retirer le statut non lu, ou « Vider mes notifications » pour supprimer uniquement tes propres notifications. Le compteur du menu indique celles qui restent non lues.";
  if (choix.nom === "solde_detail") return "Va dans « Mon solde » pour voir le détail du calcul de tes CP : CP N disponibles, CP N-1, total disponible et historique mois par mois / demande par demande. Si le résultat te semble incorrect, utilise le signalement d’erreur de solde depuis le tableau de bord.";

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
  if (choix.nom === "creer") return "Va dans « Nouvelle demande ». Choisis le type d’absence, puis le mode de date, le motif lorsqu’il est demandé et les éventuels justificatifs. Vérifie les informations puis envoie la demande. Tu peux ensuite suivre son statut dans « Mes demandes ».";
  if (choix.nom === "annuler") return "Va dans « Mes demandes ». Une demande encore en attente peut être annulée directement. Pour une demande déjà validée, utilise la demande d’annulation lorsqu’elle est disponible : elle devra ensuite être traitée par les responsables.";
  if (choix.nom === "ticket") return "Tes tickets restaurant sont visibles depuis ton espace dédié et le tableau de bord. CF Congés les calcule en tenant compte des règles applicables et des absences qui retirent un ticket. Le gestionnaire TR dispose de son propre espace pour les mois, régularisations et livraisons.";
  if (choix.nom === "planning") return "Le planning équipe utilise des codes compacts : B pour Bureau et TT pour Télétravail. Les demi-journées séparent matin et après-midi. Les absences validées apparaissent avec le code de leur type.";
  if (choix.nom === "ferie") return "Les jours fériés ne sont pas décomptés comme jours d’absence dans le calcul des congés. L’acquisition mensuelle reste fondée sur les jours ouvrés de la campagne.";
  if (choix.nom === "motdepasse") return "Pour un changement volontaire, va dans « Profil » puis « Changer de mot de passe » et renseigne ton mot de passe actuel. Si un administrateur t’a donné un mot de passe temporaire, une fenêtre obligatoire s’ouvre sur le tableau de bord pour le remplacer. Après plusieurs échecs de connexion, demande une réinitialisation à un administrateur.";
  if (choix.nom === "profil") return "Dans « Profil », tu retrouves tes informations de compte, le changement de mot de passe, tes préférences et, lorsque le télétravail est autorisé sur ton profil, la configuration de tes jours fixes et de tes prochaines occurrences. Les informations administratives non modifiables doivent être corrigées par un administrateur.";

  return "Doucement 😅 Martial ne m’a pas encore formé là-dessus. Mets-moi un 👎 juste en dessous pour lui signaler qu’il doit m’apprendre ça. Je serai meilleur la prochaine fois.";
}
