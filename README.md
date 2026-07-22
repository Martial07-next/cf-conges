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
# renseigner DATABASE_URL, NEXTAUTH_SECRET (openssl rand -base64 32)
npx prisma migrate dev --name init
npm run seed
npm run dev
```

Le seed crée les 15 comptes de démonstration (mot de passe unique : `CfReseaux2026!`) :

- **Administrateur** : `merouart@cf-reseaux.fr` (Martial EROUART)
- **Employeur / RH** (validation) : `aurelie.lancelle@cf-reseaux.fr`
- **Comptable** : `camille.radkowski@cf-reseaux.fr`
- **Collaborateurs** : les 12 autres, emails au format `prenom.nom@cf-reseaux.fr`
- 2 comptes de démo illustrent des cas particuliers : un compte désactivé et un compte en attente
  d'activation (pour tester le parcours d'inscription → validation d'accès).

## 2. Déployer (Supabase + Vercel)

1. **Base de données** — créez un projet sur [supabase.com](https://supabase.com), récupérez la
   chaîne de connexion (Settings → Database → Connection string → *URI*, mode "Transaction").
2. **Dépôt** — poussez ce dossier sur un repo GitHub.
3. **Vercel** — importez le repo, ajoutez les variables d'environnement (`DATABASE_URL`,
   `NEXTAUTH_SECRET`, `NEXTAUTH_URL` = URL de production, `RESEND_API_KEY`/`EMAIL_FROM` en option).
4. Avant le premier déploiement (ou via le terminal Vercel/local pointé sur la base de prod) :
   ```bash
   npx prisma migrate deploy
   npm run seed   # optionnel, pour démarrer avec les 15 comptes de démo
   ```
5. Déployez. `postinstall` lance automatiquement `prisma generate`.

## Ce qui est implémenté

- Auto-inscription (email `@cf-reseaux.fr` uniquement) → compte `EN_ATTENTE` jusqu'à activation
  par l'Employeur ou l'Admin.
- Connexion sécurisée (bcrypt, session JWT, déconnexion après 8h), routes protégées par rôle
  via `middleware.js`.
- Demande de congé standard/exceptionnelle en 3 clics (type → dates → envoi).
- Circuit de validation : file d'attente employeur, demandes exceptionnelles mises en avant,
  motif de refus obligatoire, mise à jour transactionnelle du solde à la validation.
- Planning d'équipe visuel (grille mensuelle, codes couleur, navigation par mois).
- Espace Comptable : soldes par collaborateur/type, export CSV filtrable par année.
- Espace Admin : gestion des types de congés (codes/couleurs/plafonds entièrement
  paramétrables), gestion des utilisateurs (rôle, statut de compte), journal d'audit.
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
