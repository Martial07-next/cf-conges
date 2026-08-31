import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";

// PATCH : activer/refuser un acces (employeur, admin), changer le role,
// modifier nom/prenom/email/service, echanger la position (ordre) avec un
// autre utilisateur, ou desactiver un compte (admin uniquement).
export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await req.json();
  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });

  // Echange de position (reorganisation manuelle) : traite et renvoie a part,
  // sans passer par le reste du bloc PATCH generique ci-dessous.
  if (body.swapWithId) {
  if (!canAccess(session.user, "admin")) {
    return NextResponse.json(
      { error: "Réservé à l'administrateur." },
      { status: 403 }
    );
  }

  const other = await prisma.user.findUnique({
    where: { id: body.swapWithId },
  });

  if (!other) {
    return NextResponse.json(
      { error: "Utilisateur introuvable." },
      { status: 404 }
    );
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: target.id },
      data: { ordre: other.ordre },
    }),

    prisma.user.update({
      where: { id: other.id },
      data: { ordre: target.ordre },
    }),
  ]);

  return NextResponse.json({
    ok: true,
  });
}

  // Reinitialisation du mot de passe (admin uniquement) : genere un mot de
  // passe temporaire, le sauvegarde, et le renvoie une seule fois dans la
  // reponse pour que l'admin le communique manuellement au collaborateur.
  if (body.reinitialiserMotDePasse) {
    if (!canAccess(session.user, "admin")) {
      return NextResponse.json({ error: "Réservé à l'administrateur." }, { status: 403 });
    }

    const tempPassword = crypto.randomBytes(9).toString("base64url");
    const hash = await bcrypt.hash(tempPassword, 10);

    await prisma.user.update({
      where: { id: target.id },
      data: { motDePasseHash: hash, doitChangerMotDePasse: true },
    });

    await logAudit(session.user.id, "MOT_DE_PASSE_REINITIALISE", target.email);
    await notify(
      target.id,
      "Mot de passe réinitialisé",
      "Votre mot de passe a été réinitialisé par l'administrateur. Connectez-vous avec le mot de passe temporaire communiqué, vous devrez le changer immédiatement."
    );

    return NextResponse.json({ ok: true, tempPassword });
  }

  const data = {};

  if (body.statutCompte) {
    if (!canAccess(session.user, "employeur")) {
      return NextResponse.json({ error: "Action réservée à l'employeur ou à l'administrateur." }, { status: 403 });
    }
    data.statutCompte = body.statutCompte;
  }

  if (body.role) {
    if (!canAccess(session.user, "admin")) {
      return NextResponse.json({ error: "Seul l'administrateur peut changer un rôle." }, { status: 403 });
    }
    data.role = body.role;
  }

  if (body.ongletsActifs) {
    if (!canAccess(session.user, "admin")) {
      return NextResponse.json({ error: "Seul l'administrateur peut modifier les accès." }, { status: 403 });
    }
    data.ongletsActifs = body.ongletsActifs;
  }

  if (body.nom !== undefined) data.nom = body.nom;
  if (body.prenom !== undefined) data.prenom = body.prenom;

  if (body.email !== undefined && body.email !== target.email) {
    const existant = await prisma.user.findUnique({ where: { email: body.email } });
    if (existant) {
      return NextResponse.json({ error: "Cet email est déjà utilisé par un autre compte." }, { status: 400 });
    }
    data.email = body.email;
  }

  if (body.service !== undefined) data.service = body.service;
  if (body.managerId !== undefined) data.managerId = body.managerId;
  if (body.visiblePlanning !== undefined) {
  if (!canAccess(session.user, "admin")) {
    return NextResponse.json({ error: "Seul l'administrateur peut modifier la visibilité planning." }, { status: 403 });
  }
  data.visiblePlanning = body.visiblePlanning;
}
      if (body.teletravailAutorise !== undefined) {
    if (!canAccess(session.user, "admin")) {
      return NextResponse.json({ error: "Seul l'administrateur peut modifier le télétravail." }, { status: 403 });
    }
    data.teletravailAutorise = body.teletravailAutorise;
    if (!body.teletravailAutorise) data.teletravailJours = []; // on retire le droit -> on efface les jours choisis
  }

  if (body.teletravailJoursMax !== undefined) {
    if (!canAccess(session.user, "admin")) {
      return NextResponse.json({ error: "Seul l'administrateur peut modifier le télétravail." }, { status: 403 });
    }
    data.teletravailJoursMax = body.teletravailJoursMax;
  }

  if (body.estAlternant !== undefined) {
    if (!canAccess(session.user, "admin")) {
      return NextResponse.json({ error: "Seul l'administrateur peut modifier ce statut." }, { status: 403 });
    }
    data.estAlternant = body.estAlternant;
  }
  if (body.dateEntree !== undefined) { data.dateEntree = body.dateEntree
    ? new Date(body.dateEntree)
    : null;
}
    if (body.accesRepasExterieur !== undefined) {
    if (!canAccess(session.user, "admin")) {
      return NextResponse.json({ error: "Seul l'administrateur peut modifier ce droit." }, { status: 403 });
    }
    data.accesRepasExterieur = body.accesRepasExterieur;
  }
  if (body.dateSortie !== undefined) {
    data.dateSortie = body.dateSortie ? new Date(body.dateSortie) : null;
  }
  const updated = await prisma.user.update({ where: { id: params.id }, data });

  await logAudit(
    session.user.id,
    "UTILISATEUR_MODIFIE",
    `${target.email} -> ${JSON.stringify(body)}`
  );

  if (body.statutCompte === "ACTIF" && target.statutCompte === "EN_ATTENTE") {
    await notify(target.id, "Accès activé", "Votre accès à la plateforme CF Réseaux Congés a été validé, vous pouvez vous connecter.");
  }

  return NextResponse.json(updated);
}

// DELETE : suppression définitive d'un compte (admin uniquement).
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
