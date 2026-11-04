// MatthiasBot : identité, petite conversation et réponses sur toutes les
// fonctions de CF Congés. Chaque entrée est reconnue par des expressions
// (morceaux de phrase, sans accents) ; la plus pertinente l'emporte.
// reponse : texte, tableau (une variante au hasard) ou fonction (ctx) -> texte.
import { canAccess, estCadre } from "./permissions";
import { estDirection } from "./agendaDirection";
import { DELAI_MIN_JOURS } from "./regles";
import { dateFranceISO } from "./dateFrance";
import { calculerDetailTicketsRestauMois } from "./ticketsRestau";

const NORMALISER = (texte = "") =>
  texte.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, " ").replace(/[^a-z0-9]+/g, " ").trim();

const auHasard = (liste) => liste[Math.floor(Math.random() * liste.length)];

// Heure de Paris en minutes depuis minuit.
function minutesParis() {
  const [h, m] = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .format(new Date())
    .split(":")
    .map(Number);
  return h * 60 + m;
}
function duree(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h${m ? ` ${String(m).padStart(2, "0")}` : ""}` : `${m} min`;
}
function estWeekend() {
  const j = new Date(`${dateFranceISO()}T12:00:00Z`).getUTCDay();
  return j === 0 || j === 6;
}

// Journée type : 8h-12h puis 13h-16h.
function ouEnEstLaJournee() {
  if (estWeekend()) return "C’est le week-end 😎 Pas de journée de travail aujourd’hui, profite !";
  const t = minutesParis();
  if (t < 8 * 60) return `La journée commence à 8h, dans ${duree(8 * 60 - t)}. Le temps d’un café ☕`;
  if (t < 12 * 60) return `Pause déjeuner à 12h, dans ${duree(12 * 60 - t)} 🍽️ Puis reprise à 13h, et fin de journée à 16h.`;
  if (t < 13 * 60) return `C’est la pause déjeuner 🍽️ Reprise à 13h, dans ${duree(13 * 60 - t)}. Bon appétit !`;
  if (t < 16 * 60) return `Fin de journée à 16h, plus que ${duree(16 * 60 - t)} 💪`;
  return "La journée est terminée (8h-12h, 13h-16h) ✨ T’as bien travaillé, file te reposer !";
}

const BLAGUES = [
  "Pourquoi les congés payés sont-ils toujours de bonne humeur ? Parce qu’ils sont… acquis 😎",
  "Mon solde de blagues est à 2,5 par mois. Celle-là, je l’impute sur N-1 😅",
  "Un collaborateur demande : « Je peux poser le lundi ? » Le planning répond : « Tu veux dire le lundi de TOUS les week-ends ? » 🙃",
  "Le télétravail, c’est comme le Wi-Fi : on ne sait pas toujours où il est, mais on sait qu’il marche mieux le vendredi 📶",
  "Ma blague préférée ? « Je pose un pont. » Thierry : « Tu veux un viaduc aussi ? » 🌉",
  "Je ne prends jamais de congés : je n’ai pas de N-1, pas de N, juste un 1 et des 0 🤖",
];

const MOTIVATION = [
  "Courage ! Chaque journée de boulot te rapproche de tes prochains congés 🏖️",
  "Allez, on lâche rien 💪 Et si ça coince, le planning montre qui est dispo pour t’aider.",
  "Petit rappel : tu fais partie d’une super équipe. Et moi je suis toujours là pour répondre 😎",
  "Un café, une bonne playlist, et c’est reparti ☕🎧",
];

// ---------- Base de réponses ----------
// roles : (ctx) => bool pour limiter une réponse (sinon pour tous).
// lien : [href, libellé] (ou fonction ctx -> [href, libellé] | null).

export const REPONSES = [
  // Identité
  {
    id: "nom",
    expressions: ["pourquoi tu t appelles", "pourquoi matthias", "pourquoi ce nom", "pourquoi ton nom", "d ou vient ton nom", "pourquoi matthiasbot", "c est qui matthias", "qui est matthias", "ton nom vient", "signification de ton nom", "pourquoi on t appelle", "ton prenom"],
    reponse:
      "Parce que mon meilleur ami, c’est Martial 💚 Toute l’entreprise l’appelle « Matthias », et c’est surtout Thierry qui fait vivre ce surnom 😄 Comme Martial m’a officiellement désigné son super BFF 🏆, j’ai pris son surnom : MatthiasBot, c’est l’idée !",
  },
  {
    id: "martial",
    expressions: ["c est qui martial", "qui est martial", "tu connais martial", "parle moi de martial", "ton meilleur ami", "ton bff", "ton pote", "ta meilleure amie"],
    reponse: "Martial, alias « Matthias » pour toute l’entreprise (merci Thierry 😄), c’est mon meilleur ami et il m’a désigné son super BFF 🏆 C’est lui qui me fait grandir : chaque 👎 que tu me mets lui dit ce qu’il doit m’apprendre.",
  },
  {
    id: "thierry",
    expressions: ["pourquoi thierry", "thierry t appelle", "thierry dit matthias", "c est thierry qui", "thierry et matthias", "c est qui thierry", "qui est thierry", "tu connais thierry"],
    reponse: "Thierry, c’est le roi du surnom 👑 C’est surtout grâce à lui que Martial est devenu « Matthias » pour toute l’entreprise… et donc grâce à lui que je m’appelle MatthiasBot 😄",
  },
  {
    id: "ancien_nom",
    expressions: ["osefbot", "osef bot", "ancien nom", "tu t appelais"],
    reponse: "OSEFBOT, c’était mon ancien nom 😎 Maintenant c’est MatthiasBot : même cerveau, meilleur nom, et je connais l’équipe beaucoup mieux.",
  },
  {
    id: "qui_es_tu",
    expressions: ["qui es tu", "tu es qui", "t es qui", "presente toi", "presentes toi", "tu sers a quoi", "tu fais quoi dans la vie", "c est quoi matthiasbot", "a quoi tu sers", "que sais tu faire", "tu sais faire quoi", "qu est ce que tu sais faire"],
    reponse: (ctx) =>
      `Moi c’est MatthiasBot 🤖, l’assistant de CF Congés. Je peux te donner ${ctx.estEmployeur ? "l’état de l’équipe" : "ton solde de CP, le suivi de tes demandes"}, te dire qui est au bureau, en télétravail, en formation ou absent (aujourd’hui, demain, cette semaine…), quand revient un collègue, le prochain férié, et t’expliquer toutes les fonctions de l’appli. Tape /help pour la liste des commandes 😉`,
  },
  {
    id: "createur",
    expressions: ["qui t a cree", "qui t a fait", "qui t a code", "qui t a programme", "ton createur", "ton papa", "qui t a invente", "qui a fait cette appli", "qui a cree cf conges", "qui a fait le site"],
    reponse: "C’est Martial qui m’a créé, ainsi que CF Congés 💚 Et il continue de m’apprendre des choses grâce à vos retours 👍 / 👎 sous mes réponses.",
  },
  {
    id: "ia",
    expressions: ["tu es une ia", "t es une ia", "intelligence artificielle", "chatgpt", "chat gpt", "tu es un robot", "t es un robot", "tu es humain", "t es humain", "tu es vivant"],
    reponse: "Je suis un assistant maison 🤖 Pas de ChatGPT : je réponds avec les règles de CF Congés et les données du planning, et rien ne sort de l’entreprise 🔒 Par contre j’apprends grâce à vos 👍 / 👎.",
  },
  {
    id: "age_bot",
    expressions: ["tu as quel age", "t as quel age", "quel age as tu", "ton age"],
    reponse: "Je suis tout jeune, né en 2026 avec CF Congés 🍼 Mais j’ai déjà la mémoire de tout le planning !",
  },

  // Petite conversation
  {
    id: "blague",
    expressions: ["blague", "raconte moi", "fais moi rire", "une histoire drole", "un truc drole", "fais rire"],
    reponse: BLAGUES,
  },
  {
    id: "compliment",
    expressions: ["t es le meilleur", "tu es le meilleur", "t es trop fort", "tu es trop fort", "bravo", "bien joue", "je t aime", "je t adore", "t es genial", "tu es genial", "trop bien", "excellent", "t es top", "tu es top", "t es un boss"],
    reponse: ["Arrête, je vais rougir 🤖❤️ (si je pouvais)", "Merci 😎 Je transmets à Martial, il sera fier de son super BFF !", "Ça me fait plaisir 🙌 N’hésite pas à me mettre un 👍, ça aide Martial à savoir ce qui marche."],
  },
  {
    id: "critique",
    expressions: ["t es nul", "tu es nul", "t es bete", "tu es bete", "tu sers a rien", "inutile", "t es inutile", "tu comprends rien", "t es pas malin", "nul"],
    reponse: "Aïe 😅 Désolé si je n’ai pas compris. Mets-moi un 👎 sous la réponse (avec un petit commentaire) : Martial verra exactement ce que je dois apprendre. Et tape /help pour voir ce que je sais déjà faire.",
  },
  {
    id: "motivation",
    expressions: ["flemme", "j ai la flemme", "pas motive", "motivation", "motive moi", "je suis fatigue", "suis creve", "je m ennuie", "c est long", "journee longue", "j en peux plus", "dur aujourd hui", "dure la journee"],
    reponse: MOTIVATION,
  },
  {
    id: "fin_journee",
    expressions: ["fin de journee", "on finit a quelle heure", "on termine quand", "on finit quand", "heure de fin", "heure de sortie", "quand est ce qu on finit", "c est quand la pause", "pause dej", "pause dejeuner", "on mange a quelle heure", "a quelle heure on mange", "il reste combien de temps", "horaires", "horaire de travail", "a quelle heure on commence"],
    reponse: () => ouEnEstLaJournee(),
  },
  {
    id: "salutations_fin",
    expressions: ["bonne journee", "bonne soiree", "bonne nuit", "bon week end", "bon weekend", "a demain", "a plus", "bye", "au revoir", "a bientot", "bon appetit"],
    reponse: (ctx) => {
      if (ctx.q.includes("bon appetit")) return "Merci, bon appétit à toi aussi 🍽️ (moi je me nourris de requêtes 🤖)";
      if (ctx.q.includes("nuit")) return "Bonne nuit 🌙 Je garde le planning au chaud.";
      if (ctx.q.includes("week")) return "Bon week-end 😎 Profite bien, le planning t’attendra lundi.";
      return auHasard(["À bientôt 👋 Je reste dans mon coin, en bas à droite.", "Bonne continuation 😎", "Ciao 👋 Reviens quand tu veux !"]);
    },
  },
  {
    id: "meteo",
    expressions: ["meteo", "il fait beau", "il va pleuvoir", "quel temps", "temperature dehors"],
    reponse: "Je n’ai pas accès à la météo ☁️ Mais je peux te dire qui est en télétravail aujourd’hui (souvent un bon indicateur 😏).",
  },
  {
    id: "cafe",
    expressions: ["cafe", "machine a cafe", "un cafe"],
    reponse: "Je ne sais pas faire le café ☕ (Martial bosse dessus 😅). Par contre je sais qui est au bureau pour t’en offrir un : demande-moi « qui est au bureau ? »",
  },
  {
    id: "amour",
    expressions: ["tu es amoureux", "t as une copine", "t es en couple", "tu veux sortir avec moi", "tu es celibataire"],
    reponse: "Mon cœur appartient au planning équipe 💚 C’est une relation stable : on se voit tous les jours, de 8h à 16h.",
  },

  // Fonctions de l'appli
  {
    id: "repas_exterieur",
    expressions: ["repas a l exterieur", "manger a l exterieur", "mange a l exterieur", "mange dehors", "manger dehors", "manger avec les stagiaires", "repas avec les stagiaires", "j ai mange dehors", "repas exterieur", "restaurant avec"],
    reponse: "Si tu as mangé à l’extérieur (avec les stagiaires, en déplacement…), clique sur « J’ai mangé à l’extérieur » sur le tableau de bord, le jour même. Le ticket restaurant du jour est alors régularisé automatiquement. Tu peux annuler ton signalement depuis le même bouton si tu t’es trompé. Le bouton n’apparaît pas le week-end.",
    lien: ["/dashboard", "Ouvrir le tableau de bord"],
  },
  {
    id: "liens_utiles",
    expressions: ["liens utiles", "lien utile", "ajouter un lien", "les liens", "raccourcis"],
    reponse: (ctx) =>
      `Les « Liens utiles » sont accessibles depuis le bandeau du tableau de bord (bouton 🔗).${ctx.admin ? " En tant qu’administrateur, tu peux y ajouter, modifier ou supprimer des liens." : " Seul un administrateur peut en ajouter : demande-lui si un lien manque."}`,
    lien: ["/dashboard", "Ouvrir le tableau de bord"],
  },
  {
    id: "ferie_travaille",
    expressions: ["travailler un ferie", "travailler le ferie", "bosser un ferie", "bosser le ferie", "ferie travaille", "travailler un jour ferie", "je veux travailler le", "venir un jour ferie"],
    reponse: (ctx) =>
      ctx.direction || canAccess(ctx.user, "feries")
        ? "Pour un jour férié, c’est la Direction qui décide d’abord s’il est possible de travailler (page « Jours fériés »). Une fois le jour ouvert, chaque collaborateur reçoit une question « Veux-tu travailler ce jour-là ? », puis les réponses sont à valider dans « Jours fériés ». Un férié travaillé et validé donne droit au ticket restaurant."
        : "Pour un jour férié, la Direction décide d’abord s’il est possible de travailler. Si c’est le cas, une fenêtre te demande sur le tableau de bord si tu veux travailler ce jour-là. Ta réponse est ensuite validée par les responsables. Un férié travaillé et validé apparaît en « FT » dans le planning et donne droit au ticket restaurant.",
    lien: (ctx) => (ctx.direction || canAccess(ctx.user, "feries") ? ["/jours-feries", "Ouvrir Jours fériés"] : null),
  },
  {
    id: "mon_agenda",
    expressions: ["mon agenda", "agenda direction", "remplir mon agenda", "pinceau", "indiquer ou je suis", "dire que je suis en deplacement", "mettre un deplacement", "mettre une reunion", "indisponible dans l agenda"],
    reponse: (ctx) =>
      ctx.direction
        ? "Dans « Mon agenda », tu es présent par défaut : tu n’indiques que les exceptions. Choisis un statut (Télétravail, En déplacement, En réunion, Indisponible, Absent, Sur un autre site), Matin, Après-midi ou la journée, puis « peins » les jours concernés. Ajoute un lieu ou une note si besoin. Les jours passés sont verrouillés, et le planning comme l’Équipe en direct se mettent à jour tout de suite."
        : "« Mon agenda » est réservé aux Employeurs / RH et au pôle Direction, pour indiquer où ils sont (déplacement, réunion…). Toi, tu retrouves leur présence dans le planning équipe.",
    lien: (ctx) => (ctx.direction ? ["/mon-agenda", "Ouvrir mon agenda"] : ["/planning", "Ouvrir le planning"]),
  },
  {
    id: "formation_planning",
    expressions: ["case f", "le f dans le planning", "f dans le planning", "en formation dans le planning", "cf formations", "cf formation", "formateur en formation", "que veut dire f"],
    reponse: "Dans le planning, « F » (vert sur fond sombre) signifie « En formation » : la personne anime une session prévue dans le planning CF Formations. Clique sur la case pour voir l’intitulé, les horaires, la salle et le bouton « Voir la session de formation ». Le férié, lui, est noté « JF ».",
    lien: ["/planning", "Ouvrir le planning"],
  },
  {
    id: "codes_planning",
    expressions: ["que veut dire jf", "que veut dire ft", "que veut dire wk", "code jf", "code ft", "code wk", "codes du planning", "legende du planning", "que veut dire b", "que veut dire tt", "code du planning"],
    reponse: "Codes du planning : B = au bureau, TT = télétravail, F = en formation, JF = jour férié, FT = férié travaillé, WK = week-end. Les congés et absences ont le code de leur type (CP, RH…). Une case coupée en deux = matin / après-midi. Clique sur n’importe quelle case pour voir le détail de la journée.",
    lien: ["/planning", "Ouvrir le planning"],
  },
  {
    id: "planning_def",
    expressions: ["c est quoi le planning", "a quoi sert le planning", "le planning equipe c est quoi", "c est quoi le planning equipe", "comment lire le planning", "comment marche le planning"],
    reponse: "Le « Planning équipe » montre où est chacun : au bureau (B), en télétravail (TT), en formation (F), en congé ou absent, jours fériés (JF)… en vue Jour, Semaine ou Mois (le Mois sur ordinateur). Tu peux filtrer par pôle et cliquer sur n’importe quelle case pour voir le détail de la journée (matin / après-midi, lieu, joignable). Tu peux aussi me demander directement « qui est absent demain ? » 😉",
    lien: ["/planning", "Ouvrir le planning"],
  },
  {
    id: "equipe_direct",
    expressions: ["equipe en direct", "c est quoi en direct", "le widget en direct"],
    reponse: "« Équipe en direct », sur le tableau de bord, montre l’état de l’équipe à l’instant T : au bureau, télétravail, formation, absences, agenda de la Direction. Elle suit la journée (matin 8h-12h, après-midi 13h-16h) et se met à jour toute seule. Tu peux aussi me demander « qui est absent aujourd’hui ? ».",
    lien: ["/dashboard", "Ouvrir le tableau de bord"],
  },
  {
    id: "theme",
    expressions: ["mode sombre", "mode nuit", "dark mode", "theme sombre", "mode clair", "changer le theme", "fond noir", "fond sombre", "changer les couleurs"],
    reponse: "Va dans « Mon profil », onglet « Apparence », et choisis Clair ou Sombre. Le choix est enregistré sur ton compte : il te suit sur tous tes appareils, même après une déconnexion.",
    lien: ["/profil", "Ouvrir mon profil"],
  },
  {
    id: "push",
    expressions: ["notification sur mon telephone", "notifications sur mon telephone", "notif sur mon telephone", "activer les notifications", "notifications push", "push", "je recois pas les notif", "je ne recois pas les notifications", "pas de notification", "recevoir les notifications", "alerte sur mon portable"],
    reponse: "Va dans « Mon profil », onglet « Notifications », et active les notifications sur l’appareil où tu veux les recevoir (accepte la demande du navigateur). Sur iPhone, il faut d’abord installer l’appli sur l’écran d’accueil (Safari → Partager → « Sur l’écran d’accueil »), puis l’ouvrir depuis l’icône pour activer les notifications.",
    lien: ["/profil", "Ouvrir mon profil"],
  },
  {
    id: "installer",
    expressions: ["installer l appli", "installer l application", "ecran d accueil", "application mobile", "appli mobile", "telecharger l appli", "telecharger l application", "sur mon telephone", "icone sur mon telephone", "app store", "play store"],
    reponse: "CF Congés s’installe comme une appli, sans store 📱 Sur iPhone : ouvre le site dans Safari → bouton Partager → « Sur l’écran d’accueil ». Sur Android : menu ⋮ de Chrome → « Installer l’application » (ou « Ajouter à l’écran d’accueil »). L’icône « CF CONGÉS » apparaît alors comme une vraie appli.",
  },
  {
    id: "bug",
    expressions: ["signaler un bug", "signaler un probleme", "il y a un bug", "y a un bug", "ca bug", "ca marche pas", "ca ne marche pas", "ca fonctionne pas", "ca ne fonctionne pas", "erreur sur le site", "page blanche", "le site plante"],
    reponse: "Désolé pour ça 😕 Utilise le bouton rouge « Signaler un problème » (en haut à droite, ou dans le menu sur téléphone) : décris ce que tu faisais, et Martial reçoit directement le signalement.",
  },
  {
    id: "mdp_oublie",
    expressions: ["mot de passe oublie", "oublie mon mot de passe", "j ai oublie mon mdp", "mdp oublie", "reinitialiser mon mot de passe", "compte bloque", "compte verrouille", "je n arrive plus a me connecter"],
    reponse: "Demande à un administrateur de réinitialiser ton mot de passe : tu recevras un mot de passe temporaire, et une fenêtre te demandera d’en choisir un nouveau à la première connexion. Après plusieurs essais ratés, le compte se verrouille aussi : même solution.",
  },
  {
    id: "delai_annulation",
    expressions: ["delai pour annuler", "annuler a moins de", "21 jours", "trop tard pour annuler", "modifier un conge valide", "changer les dates de mon conge", "decaler mon conge", "deplacer mon conge", "annuler un conge valide", "annuler une demande validee", "annuler un conge accepte", "annuler mon conge valide", "annuler un conge deja valide", "annuler une demande acceptee"],
    reponse: `Une demande encore en attente s’annule directement dans « Mes demandes ». Pour un congé déjà validé, tu peux demander son annulation jusqu’à ${DELAI_MIN_JOURS} jours avant son début : ensuite, il faut voir directement avec ton responsable. Pour changer des dates, annule puis refais une demande.`,
    lien: ["/mes-demandes", "Voir mes demandes"],
  },
  {
    id: "qui_prevenu",
    expressions: ["qui est prevenu", "qui recoit ma demande", "mon responsable est prevenu", "est ce que mon chef est prevenu", "qui voit ma demande", "combien de temps pour valider", "delai de validation", "quand sera validee", "ma demande est validee quand"],
    reponse: "Dès que tu envoies une demande, les personnes qui peuvent la traiter sont notifiées : le référent de ton pôle et les Employeurs / RH. Tu reçois une notification dès qu’elle est validée ou refusée. Demande-moi « qui valide mes congés ? » pour savoir qui précisément.",
    lien: ["/mes-demandes", "Suivre mes demandes"],
  },
  {
    id: "refus",
    expressions: ["demande refusee", "pourquoi refuse", "pourquoi ma demande a ete refusee", "motif du refus", "conge refuse", "ils ont refuse"],
    reponse: "Le motif du refus est indiqué dans « Mes demandes », sur la demande concernée, et dans la notification reçue. Tu peux refaire une demande avec d’autres dates, ou en discuter avec ton responsable.",
    lien: ["/mes-demandes", "Voir mes demandes"],
  },
  {
    id: "arrondi",
    expressions: ["arrondi", "chiffre a virgule", "virgule", "pas un chiffre rond", "decimales", "arrondir"],
    reponse: "Pendant la campagne, ton compteur de CP reste précis (avec des décimales, au prorata). À la fin de la campagne, le 31 mai, le total acquis est arrondi au nombre entier supérieur (article L3141-7 du Code du travail) : par exemple 21,36 jours deviennent 22 jours.",
    lien: ["/mon-solde", "Voir mon solde"],
  },
  {
    id: "campagne",
    expressions: ["campagne", "1er juin", "premier juin", "31 mai", "remise a zero", "quand je recupere mes conges", "nouvelle annee de conges", "passage en n 1", "passer en n 1"],
    reponse: "La campagne de congés va du 1er juin au 31 mai. Tu acquiers 2,5 jours par mois, soit 30 jours sur une année complète. Le 1er juin, ce que tu as acquis devient ton N-1, utilisable sur la nouvelle campagne, et un nouveau compteur N démarre.",
    lien: ["/mon-solde", "Voir mon solde"],
  },
  {
    id: "erreur_solde",
    expressions: ["mon solde est faux", "erreur de solde", "solde faux", "solde incorrect", "pas le bon solde", "il manque des jours", "solde pas bon", "signaler une erreur"],
    reponse: "Sur le tableau de bord, dans la carte « Congé payé N », clique sur « Signaler une erreur de solde ». Explique ce qui te semble faux : la demande est envoyée aux responsables, qui vérifieront et corrigeront si besoin. Le détail du calcul est aussi dans « Mon solde ».",
    lien: ["/mon-solde", "Voir le détail du solde"],
  },
  {
    id: "weekend_conge",
    expressions: ["conge le week end", "conge le samedi", "poser un samedi", "le samedi compte", "les week ends comptent", "week end decompte", "samedi decompte"],
    reponse: "Les week-ends ne sont jamais décomptés : seuls les jours ouvrés (du lundi au vendredi) sont comptés dans une demande. Les jours fériés ne sont pas décomptés non plus.",
  },
  {
    id: "pont",
    expressions: ["faire le pont", "poser un pont", "un pont", "ponts"],
    reponse: "Pour faire le pont, pose simplement le ou les jours entre le férié et le week-end dans « Nouvelle demande » : le férié n’est pas décompté. Demande-moi « prochain férié » pour repérer les bonnes occasions 😉",
    lien: ["/demande", "Nouvelle demande"],
  },
  {
    id: "arret",
    expressions: ["arret maladie", "je suis malade", "arret de travail", "accident du travail", "accident de travail"],
    reponse: "Pour un arrêt maladie ou un accident du travail, fais une demande avec le type correspondant dans « Nouvelle demande » et joins le justificatif (PDF ou photo). Ça ne consomme pas tes CP. Dans le planning, tes collègues voient seulement que tu es absent. Prends soin de toi 🙏",
    lien: ["/demande", "Nouvelle demande"],
  },
  {
    id: "confidentialite",
    expressions: ["qui voit mes absences", "qui voit mon planning", "qui voit mon solde", "mes donnees", "confidentiel", "vie privee", "est ce que les autres voient", "les collegues voient"],
    reponse: "Dans le planning équipe, tout le monde voit si tu es au bureau, en télétravail, en formation ou absent. Ton solde, tes justificatifs et le détail de tes demandes restent visibles seulement par toi et les personnes qui traitent les demandes. Moi-même, je ne donne jamais le solde ni la date de naissance d’un collègue 🔒",
  },
  {
    id: "ticket_valeur",
    expressions: ["combien vaut un ticket", "valeur d un ticket", "valeur du ticket", "part salarie", "part employeur", "4 euros", "6 euros", "10 euros", "retenue sur salaire", "combien me coute", "paye combien le ticket"],
    reponse: "Un ticket restaurant vaut 10 € : 6 € sont à la charge de l’employeur et 4 € sont retenus sur ta fiche de paie. Tu gagnes un ticket par jour travaillé (hors télétravail, congés et absences qui retirent le ticket). Un repas payé par l’entreprise entraîne une régularisation.",
    lien: ["/mes-tickets-restau", "Voir mes tickets"],
  },
  {
    id: "mes_tickets_mois",
    expressions: ["combien de tickets", "mes tickets ce mois", "tickets ce mois", "nombre de tickets", "j ai combien de tickets", "tickets restaurant ce mois", "mes tickets restaurant"],
    reponse: async (ctx) => {
      if (ctx.estEmployeur) return "En tant qu’Employeur / RH, tu n’as pas de tickets restaurant. Le détail de l’équipe, mois par mois, est dans « Gestionnaire TR ».";
      const iso = dateFranceISO();
      const annee = Number(iso.slice(0, 4));
      const mois = Number(iso.slice(5, 7)) - 1;
      const { jours, details } = await calculerDetailTicketsRestauMois([ctx.user], annee, mois);
      const total = jours.filter((j) => details[ctx.user.id]?.[j.toDateString()]?.etat === "ticket").length;
      const nomMois = new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(new Date(annee, mois, 1));
      return `En ${nomMois}, d’après le planning actuel, tu as ${total} ticket${total > 1 ? "s" : ""} restaurant, soit ${total * 10} € (dont ${total * 4} € retenus sur ta paie). Ce chiffre bouge si un congé ou une régularisation est ajouté.`;
    },
    lien: (ctx) => (ctx.estEmployeur ? ["/tr", "Ouvrir le Gestionnaire TR"] : ["/mes-tickets-restau", "Voir le détail"]),
  },
  {
    id: "tr_livrer",
    expressions: ["marquer comme livre", "marquer livre", "tickets livres", "comme livre", "livrer les tickets", "livraison des tickets", "livraison tr", "marquer les tickets"],
    reponse: (ctx) =>
      canAccess(ctx.user, "tr")
        ? "Dans « Gestionnaire TR », choisis le mois, vérifie le tableau puis clique sur « Marquer comme livré » : chaque collaborateur reçoit une notification. Une fois le mois livré, le bouton « Exporter (Excel) » apparaît."
        : "C’est le gestionnaire TR qui marque les tickets du mois comme livrés : tu reçois alors une notification, et la mention « Livrés le … » apparaît sur ton tableau de bord.",
    lien: (ctx) => (canAccess(ctx.user, "tr") ? ["/tr", "Ouvrir le Gestionnaire TR"] : ["/mes-tickets-restau", "Voir mes tickets"]),
  },
  {
    id: "tr_export",
    expressions: ["exporter les tickets", "export excel", "export tr", "exporter le mois", "fichier excel", "tableau excel des tickets"],
    roles: (ctx) => canAccess(ctx.user, "tr") || ctx.estEmployeur || ctx.admin,
    reponse: "L’export Excel des tickets se fait dans « Gestionnaire TR », sur un mois déjà marqué comme livré : bouton « Exporter (Excel) ». Le fichier détaille par collaborateur les jours, les tickets, la valeur, la retenue salarié (4 €) et la part employeur (6 €).",
    lien: ["/tr", "Ouvrir le Gestionnaire TR"],
  },
  {
    id: "tr_regul",
    expressions: ["faire une regularisation", "regulariser un ticket", "retirer un ticket", "repas paye par l entreprise", "regularisation tr", "regularisation ticket"],
    reponse: (ctx) =>
      canAccess(ctx.user, "tr")
        ? "Dans « Gestionnaire TR », clique sur « Faire une régularisation », choisis la date du repas, charge les collaborateurs, coche les personnes concernées et ajoute une justification. Un ticket leur est retiré pour ce jour-là (case « Rég. »). Tu peux supprimer une régularisation en cliquant dessus."
        : "Quand l’entreprise paie le repas (restaurant d’équipe, repas avec les stagiaires…), le ticket du jour est retiré : c’est une régularisation. Si c’est ton cas, signale-le toi-même avec « J’ai mangé à l’extérieur » sur le tableau de bord, sinon le gestionnaire TR s’en charge.",
    lien: (ctx) => (canAccess(ctx.user, "tr") ? ["/tr", "Ouvrir le Gestionnaire TR"] : ["/dashboard", "Ouvrir le tableau de bord"]),
  },
  {
    id: "valider",
    expressions: ["valider une demande", "valider les demandes", "refuser une demande", "accepter une demande", "traiter les demandes", "demandes a valider", "demandes en attente de l equipe", "valider un conge", "valider les conges"],
    reponse: (ctx) =>
      !(ctx.estEmployeur || ctx.cadre || ctx.admin || canAccess(ctx.user, "employeur"))
        ? "Ce sont le référent de ton pôle et les Employeurs / RH qui valident les demandes : demande-moi « qui valide mes congés ? » pour savoir qui. Toi, tu peux suivre l’état de tes demandes dans « Mes demandes »."
        : ctx.cadre && !canAccess(ctx.user, "employeur")
        ? `Dans « Mon équipe », tu retrouves les demandes du pôle ${ctx.user.pole}. Ouvre une demande pour voir le détail et les justificatifs, puis valide-la ou refuse-la (avec un motif). Le collaborateur est notifié tout de suite. Tu ne peux pas traiter tes propres demandes.`
        : "Dans « Validation & accès », la file d’attente regroupe les demandes à traiter. Ouvre une demande pour voir le détail et les justificatifs, puis valide ou refuse (avec un motif). L’onglet de suivi garde l’historique : qui a validé, quand, et les annulations.",
    lien: (ctx) =>
      !(ctx.estEmployeur || ctx.cadre || ctx.admin || canAccess(ctx.user, "employeur"))
        ? ["/mes-demandes", "Suivre mes demandes"]
        : ctx.cadre && !canAccess(ctx.user, "employeur")
          ? ["/mon-equipe", "Ouvrir Mon équipe"]
          : ["/employeur", "Ouvrir Validation & accès"],
  },
  {
    id: "creer_compte",
    expressions: ["creer un compte", "ajouter un collaborateur", "nouveau collaborateur", "nouvel arrivant", "inscrire quelqu un", "donner acces", "demande d acces", "nouvelle recrue"],
    reponse: (ctx) =>
      ctx.estEmployeur || ctx.admin
        ? "Un nouveau collaborateur peut demander son accès depuis la page d’inscription : tu le valides ensuite dans « Validation & accès ». Tu peux aussi créer directement un compte dans « Administration » → Utilisateurs (pôle, rôle, date d’entrée, télétravail…)."
        : "Un nouveau collaborateur demande son accès depuis la page d’inscription (lien sur l’écran de connexion), puis un Employeur / RH ou un administrateur le valide.",
    lien: (ctx) => (ctx.estEmployeur || ctx.admin ? ["/employeur", "Ouvrir Validation & accès"] : null),
  },
  {
    id: "date_naissance",
    expressions: ["ma date de naissance", "modifier ma date de naissance", "mon anniversaire", "ajouter mon anniversaire"],
    reponse: "Ta date de naissance se modifie dans « Mon profil », onglet « Informations ». Elle sert uniquement à te souhaiter ton anniversaire 🎂 (et à afficher un gâteau à côté de ton nom dans le planning le jour J). Elle n’est jamais montrée aux collègues.",
    lien: ["/profil", "Ouvrir mon profil"],
  },
  {
    id: "message_du_jour",
    expressions: ["message du jour", "notification de 8h30", "message de 8h30", "message du matin", "notif du matin"],
    reponse: "Chaque jour ouvré vers 8h30, une notification avec le message du jour est envoyée (sur ton téléphone si les notifications sont activées dans ton profil). Un petit mot pour bien commencer la journée ☀️",
  },
  {
    id: "rtt",
    expressions: ["c est quoi les rtt", "mes rtt", "poser un rtt", "repos rtt", "les rtt"],
    reponse: "Les RTT se posent comme un congé dans « Nouvelle demande », avec le type « Repos (RTT) ». Ils apparaissent en « RH » dans le planning.",
    lien: ["/demande", "Nouvelle demande"],
  },
  {
    id: "sans_solde",
    expressions: ["conge sans solde", "sans solde"],
    reponse: "Un congé sans solde se pose dans « Nouvelle demande » avec le type « Congé sans solde ». Attention : il n’est pas payé et il réduit l’acquisition de tes CP sur la période.",
    lien: ["/demande", "Nouvelle demande"],
  },
  {
    id: "cp_par_an",
    expressions: ["combien de cp par an", "combien de jours de conges par an", "combien de conges par an", "combien de jours par mois", "on a droit a combien"],
    reponse: "Tu acquiers 2,5 jours de CP par mois travaillé, soit 30 jours sur une campagne complète (du 1er juin au 31 mai). Si tu es arrivé en cours d’année, c’est proratisé, puis arrondi au supérieur à la fin de la campagne.",
    lien: ["/mon-solde", "Voir mon solde"],
  },
  {
    id: "deconnexion",
    expressions: ["me deconnecter", "se deconnecter", "deconnexion", "changer de compte"],
    reponse: "Pour te déconnecter, clique sur « Se déconnecter » en bas du menu (sur ton nom). Sur téléphone, ouvre d’abord le menu ☰.",
  },
  {
    id: "aide_appli",
    expressions: ["comment ca marche", "comment marche l appli", "comment marche le site", "je suis perdu", "je comprends rien", "tuto", "tutoriel", "mode d emploi", "guide"],
    reponse: (ctx) =>
      ctx.estEmployeur
        ? "En résumé : le tableau de bord montre l’équipe en direct et les demandes à valider, « Validation & accès » sert à traiter les demandes et les comptes, « Planning équipe » montre qui est où, et « Mon agenda » sert à indiquer tes déplacements. Pose-moi n’importe quelle question, ou tape /help 😉"
        : "En résumé : le tableau de bord montre ton solde et l’équipe en direct, « Nouvelle demande » sert à poser un congé, « Mes demandes » à suivre tes demandes, « Planning équipe » montre qui est où, et « Mon profil » gère ton télétravail, ton thème et tes notifications. Pose-moi n’importe quelle question, ou tape /help 😉",
  },
];

// Score : expressions trouvées dans la question (la plus longue compte le
// plus, pour départager « mon anniversaire » et « anniversaire »).
// Pluriels et accords ignorés : « livrés » = « livre », « tickets » = « ticket ».
const singulier = (texte) => texte.split(" ").map((m) => (m.length > 3 ? m.replace(/(s|x)$/, "") : m)).join(" ");

function score(q, entree) {
  const qs = ` ${singulier(q)} `;
  let meilleur = 0;
  for (const e of entree.expressions) {
    const n = singulier(NORMALISER(e));
    if (n && qs.includes(` ${n} `)) meilleur = Math.max(meilleur, n.length);
  }
  return meilleur;
}

// Renvoie { reponse, navigation, score } ou null. minimum : longueur minimale
// de l'expression reconnue (pour ne passer devant d'autres modules que sur
// une correspondance nette).
export async function repondreFAQ({ q: brut, user, minimum = 1 }) {
  const q = NORMALISER(brut);
  const ctx = {
    q,
    user: { ...user, onglets: user.ongletsActifs ?? user.onglets },
    estEmployeur: user.role === "EMPLOYEUR",
    admin: user.role === "ADMIN",
    cadre: estCadre(user),
    direction: estDirection(user),
  };
  const candidates = REPONSES.filter((r) => !r.roles || r.roles(ctx))
    .map((r) => ({ r, s: score(q, r) }))
    .filter((x) => x.s >= minimum)
    .sort((a, b) => b.s - a.s);
  if (!candidates.length) return null;
  const { r } = candidates[0];
  const brute = typeof r.reponse === "function" ? await r.reponse(ctx) : Array.isArray(r.reponse) ? auHasard(r.reponse) : r.reponse;
  const lien = typeof r.lien === "function" ? r.lien(ctx) : r.lien;
  return { reponse: brute, navigation: lien ? { href: lien[0], label: lien[1] } : null, id: r.id };
}

// Expressions d'identité : à traiter avant tout le reste (« qui est
// matthias » ne doit pas partir dans la recherche de collègues).
export function questionIdentite(brut) {
  const q = NORMALISER(brut);
  const ids = new Set(["nom", "martial", "thierry", "ancien_nom", "qui_es_tu", "createur", "ia", "age_bot"]);
  return REPONSES.some((r) => ids.has(r.id) && score(q, r) > 0);
}
