# CF Réseaux — Congés

Plateforme de gestion des congés pour CF Réseaux (Next.js 14 · Prisma · PostgreSQL · NextAuth).

Construit à partir du cahier des charges fourni et du planning Excel existant (15 collaborateurs,
13 statuts : CP, RH, C, JT, F, TT, ARM, ASA, abs, at, ext, ec, x).

## Stack

- **Frontend/Backend** : Next.js 14 (App Router), React 18, Tailwind CSS
- **Base de données** : PostgreSQL via Prisma ORM
- **Authentification** : NextAuth (credentials + mot de passe hashé bcrypt), sessions JWT
- **Email transactionnel (optionnel)** : Resend — no-op si `RESEND_API_KEY` n'est pas défini

## 1. Installer en local

```bash
npm install
cp .env.example .env
# renseigner DATABASE_URL, NEXTAUTH_SECRET (openssl rand -base64 32), CRON_SECRET
npx prisma db push
npm run seed
npm run dev
```

Le seed crée une base **vierge** : uniquement les types de congés, les motifs ASA par défaut, et
**un seul compte** — l'administrateur :

- **Administrateur** : `merouart@cf-reseaux.fr` (Martial EROUART) / mot de passe : `ChangeMoiMaintenant2026!`

Changez ce mot de passe dès la première connexion (Profil), puis créez tous les autres accès
depuis **Admin > Utilisateurs > + Ajouter un collaborateur** — chaque compte est actif
immédiatement, avec un mot de passe temporaire à communiquer.

### Vous avez déjà les 15 comptes de démo en production ?

Si vous aviez déployé une version antérieure avec les données de démonstration, repartez d'une
base propre :

```bash
npm run wipe    # vide toutes les tables
npm run seed    # recrée les types de congés + le compte admin uniquement
```

⚠️ `wipe` supprime définitivement tous les comptes, demandes et soldes existants.

## 2. Déployer (Supabase + Vercel)

1. **Base de données** — créez un projet sur [supabase.com](https://supabase.com), récupérez la
   chaîne de connexion (Settings → Database → Connection string → *URI*, mode "Transaction").
2. **Dépôt** — poussez ce dossier sur un repo GitHub.
3. **Vercel** — importez le repo, ajoutez les variables d'environnement (`DATABASE_URL`,
   `NEXTAUTH_SECRET`, `NEXTAUTH_URL` = URL de production, `RESEND_API_KEY`/`EMAIL_FROM` en option).
4. Avant le premier déploiement (depuis votre PC, pointé sur la base de prod — voir §1) :
   ```bash
   npx prisma db push
   npm run seed
   ```
5. Déployez. `postinstall` lance automatiquement `prisma generate`.
6. **Acquisition mensuelle automatique des CP** : le fichier `vercel.json` déclare un Cron Job
   Vercel qui appelle `/api/cron/accrual` le 1er de chaque mois à 3h. Ajoutez la variable
   `CRON_SECRET` sur Vercel (même valeur que dans votre `.env`) — Vercel l'envoie automatiquement
   en en-tête `Authorization` pour sécuriser la route. Rien d'autre à faire : le Cron apparaît
   automatiquement dans **Vercel → votre projet → Cron Jobs** après ce déploiement.

## Ce qui est implémenté

- **Base vierge par défaut** : le seed ne crée que le compte administrateur. Tous les accès
  collaborateurs sont créés volontairement par l'Admin (`Admin > Utilisateurs > + Ajouter un
  collaborateur`) — compte actif immédiatement, mot de passe temporaire généré et affiché une
  fois. L'auto-inscription (`/inscription`) reste disponible en parallèle si vous préférez laisser
  les collaborateurs créer eux-mêmes leur demande d'accès (→ statut `EN_ATTENTE` jusqu'à
  validation par l'Employeur/Admin).
- **Acquisition automatique des CP** : +2,5 jours par mois et par compte actif, sur une période de
  référence mai → avril (plafond 30 j/an = 2,5 × 12). Un Cron Vercel appelle
  `/api/cron/accrual` le 1er de chaque mois ; l'exécution est journalisée (`AccrualRun`) pour
  garantir qu'un mois ne peut jamais être crédité deux fois. *Limite actuelle : l'acquisition ne
  tient pas encore compte d'une éventuelle proratisation pour les entrées en cours de mois — tous
  les comptes actifs reçoivent le même montant à chaque passage du Cron.*
- **Motifs à durée fixe (ASA)** : `Admin > Motifs à durée fixe` permet de définir des motifs
  d'événements familiaux (mariage, décès, naissance…) avec un nombre de jours imposé. Dans le
  formulaire de demande, choisir un motif ASA fixe automatiquement la date de fin — la liste
  livrée par défaut reprend le Code du travail (art. L3142-4) mais est entièrement modifiable.
- Connexion sécurisée (bcrypt, session JWT, déconnexion après 8h), routes protégées par rôle
  via `middleware.js`.
- Demande de congé standard/exceptionnelle en 3 clics (type → dates ou motif → envoi).
- Circuit de validation : file d'attente employeur, demandes exceptionnelles mises en avant,
  motif de refus obligatoire, mise à jour transactionnelle du solde à la validation.
- Planning d'équipe visuel (grille mensuelle, codes couleur, navigation par mois).
- Espace Comptable : soldes par collaborateur/type, export CSV filtrable par année.
- Espace Admin : gestion des types de congés et des motifs à durée fixe (entièrement
  paramétrables), gestion des utilisateurs (rôle, statut de compte, création directe), journal
  d'audit.
- Notifications in-app à chaque changement de statut ; email transactionnel best-effort si
  `RESEND_API_KEY` est configurée.

## Limites connues / pistes d'évolution

Pour rester livrable dans le temps imparti, certains points du cahier des charges sont **stubés
ou simplifiés** plutôt qu'absents silencieusement :

- **2FA** : non implémenté. Le champ est prévu dans l'architecture (NextAuth supporte l'ajout
  d'un provider email OTP) mais reste à câbler.
- **Pièces jointes** (justificatif d'arrêt maladie) : le modèle prévoit `pieceJointeNom`, mais
  l'upload de fichier n'est pas branché — à connecter à un stockage (S3, Vercel Blob…).
- **Export RGPD** (droit à l'export/suppression) : pas d'endpoint dédié pour l'instant ; les
  données sont normalement supprimables via Prisma Studio/SQL en attendant.
- **Délégation manager intermédiaire** : le modèle a un `managerId` mais la validation reste
  centralisée sur le rôle Employeur/Admin (pas de délégation par équipe).
- **Emails transactionnels** : le code appelle l'API Resend si `RESEND_API_KEY` est présente,
  sinon les notifications restent uniquement in-app (aucun email n'est perdu, juste pas envoyé).

## Structure

```
app/
  (app)/            pages protégées (sidebar) : dashboard, demande, planning, comptable...
  api/               routes API (auth, leave-requests, users, leave-types, export...)
  login/ inscription/  pages publiques
prisma/
  schema.prisma      modèle de données
  seed.js             15 collaborateurs réels + types de congés + demandes de démo
components/          UI + logique client (formulaires, actions de validation...)
lib/                  prisma client, auth NextAuth, audit log, notifications
middleware.js         protection des routes par rôle
```
