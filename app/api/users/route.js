import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { canAccess, canAccessAny, defaultOngletsForRole } from "@/lib/permissions";
import { periodeAnnee, joursAcquisDepuisDebutCampagne } from "@/lib/campagneConges";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

function genPassword() {
  // Mot de passe temporaire lisible, a communiquer au collaborateur puis a changer.
  const words = ["Reseau", "Bureau", "Cable", "Energie", "Projet", "Equipe", "Atelier", "Circuit", "Signal", "Formation"];
  const word = words[Math.floor(Math.random() * words.length)];
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${word}${digits}!`;
}

// POST : creation directe d'un compte par l'Admin ou l'Employeur / RH (accès
// immédiat, sans passer par l'auto-inscription + validation). Répond avec le
// mot de passe temporaire généré, à communiquer au collaborateur. Il n'est
// jamais stocké en clair. Seul l'administrateur peut créer un compte Admin.
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "EMPLOYEUR" && !canAccess(session?.user, "admin")) {
    return NextResponse.json({ error: "Réservé à l'administrateur ou à l'Employeur / RH." }, { status: 403 });
  }

  const body = await req.json();
  const { nom, prenom, email, role, service, pole, dateEntree } = body;

  if (role === "ADMIN" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Seul l'administrateur peut créer un compte Administrateur." }, { status: 403 });
  }

  if (!nom || !prenom || !email) {
    return NextResponse.json({ error: "Nom, prénom et email sont obligatoires." }, { status: 400 });
  }
  if (!email.toLowerCase().endsWith("@cf-reseaux.fr")) {
    return NextResponse.json({ error: "L'email doit être une adresse @cf-reseaux.fr." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "Un compte existe déjà avec cet email." }, { status: 409 });
  }

  const tempPassword = genPassword();
  const motDePasseHash = await bcrypt.hash(tempPassword, 10);

  const dernierUtilisateur = await prisma.user.findFirst({
  orderBy: {
    ordre: "desc",
  },
  select: {
    ordre: true,
  },
});

const nouvelOrdre = (dernierUtilisateur?.ordre ?? -1) + 1;

const user = await prisma.user.create({
  data: {
    nom,
    prenom,
    email: email.toLowerCase(),
    motDePasseHash,
    role: role || "COLLABORATEUR",
    service: service || null,
    pole: pole || null,
    statutCompte: "ACTIF",
    doitChangerMotDePasse: true,
    ongletsActifs: defaultOngletsForRole(role || "COLLABORATEUR"),
    dateEntree: dateEntree ? new Date(dateEntree) : null,
    // soldeInitialSaisi reste a false : c'est le collaborateur qui confirmera
    // sa propre date d'entree a la premiere connexion, et le solde de CP se
    // calculera automatiquement a ce moment-la.
    ordre: nouvelOrdre,
  },
});

  await logAudit(session.user.id, "UTILISATEUR_CREE_PAR_ADMIN", user.email);

  return NextResponse.json({ user, tempPassword }, { status: 201 });
}

// GET : liste des utilisateurs.
// - employeur/admin/comptable -> tous (comptable en lecture seule cote UI)
// - collaborateur -> version allegee, pour le planning d'equipe (pas d'email/role)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const canSeeFull = canAccessAny(session.user, ["employeur", "admin", "comptable"]);

  const users = await prisma.user.findMany({
    select: {
      id: true,
      nom: true,
      prenom: true,
      email: canSeeFull,
      role: canSeeFull,
      service: true,
      pole: true,
      statutCompte: canSeeFull,
      dateEntree: canSeeFull,
      createdAt: canSeeFull,
    },
    orderBy: { nom: "asc" },
  });

  return NextResponse.json(users);
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccess(session.user, "admin")) {
    return NextResponse.json({ error: "Réservé à l'administrateur." }, { status: 403 });
  }
  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

  await prisma.user.delete({ where: { id: params.id } });
  await logAudit(session.user.id, "UTILISATEUR_SUPPRIME", target.email);
  return NextResponse.json({ ok: true });
}
