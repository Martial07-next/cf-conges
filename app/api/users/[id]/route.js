import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { ORDRE_UTILISATEURS } from "@/lib/ordreUtilisateurs";

// PATCH : activer/refuser un acces (employeur, admin), changer le role,
// modifier nom/prenom/email/service, echanger la position (ordre) avec un
// autre utilisateur, ou desactiver un compte (admin uniquement).
export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await req.json();
  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });

  if (session.user.role === "EMPLOYEUR" && target.role === "ADMIN") {
    return NextResponse.json({ error: "Un compte Employeur / RH ne peut pas modifier un administrateur." }, { status: 403 });
  }

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
    where: {
      id: body.swapWithId,
    },
    select: {
      id: true,
      ordre: true,
    },
  });

  if (!other) {
    return NextResponse.json(
      { error: "Utilisateur introuvable." },
      { status: 404 }
    );
  }

  if (target.id === other.id) {
    return NextResponse.json({
      ok: true,
    });
  }

  // Plusieurs comptes peuvent partager la même valeur "ordre" (ex. 0 par
  // défaut à l'inscription) : échanger deux valeurs égales ne changeait
  // rien. On renumérote donc toute la liste (0, 1, 2…) dans l'ordre affiché,
  // on échange les deux positions, puis on n'enregistre que ce qui change.
  const tous = await prisma.user.findMany({
    select: { id: true, ordre: true },
    orderBy: ORDRE_UTILISATEURS,
  });
  const ids = tous.map((u) => u.id);
  const iTarget = ids.indexOf(target.id);
  const iOther = ids.indexOf(other.id);
  [ids[iTarget], ids[iOther]] = [ids[iOther], ids[iTarget]];

  const ordreActuel = new Map(tous.map((u) => [u.id, u.ordre]));
  const miseAJour = ids
    .map((id, position) => ({ id, position }))
    .filter(({ id, position }) => ordreActuel.get(id) !== position);

  await prisma.$transaction(
    miseAJour.map(({ id, position }) =>
      prisma.user.update({ where: { id }, data: { ordre: position } })
    )
  );

  await logAudit(
    session.user.id,
    "UTILISATEUR_REORDONNE",
    `${target.email} <-> ${body.swapWithId}`
  );

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
      data: {
        motDePasseHash: hash,
        doitChangerMotDePasse: true,
        // Une réinitialisation administrateur doit rendre le compte
        // immédiatement utilisable, même s'il était verrouillé après des
        // tentatives échouées avec l'ancien mot de passe.
        tentativesConnexionEchouees: 0,
        verrouilleJusqua: null,
      },
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
    // Un compte non administrateur ne peut ni changer son propre rôle, ni
    // attribuer le rôle Administrateur (pour éviter de s'auto-promouvoir).
    if (session.user.role !== "ADMIN") {
      if (target.id === session.user.id) {
        return NextResponse.json({ error: "Vous ne pouvez pas modifier votre propre rôle." }, { status: 403 });
      }
      if (body.role === "ADMIN") {
        return NextResponse.json({ error: "Seul l'administrateur peut attribuer le rôle Administrateur." }, { status: 403 });
      }
    }
    data.role = body.role;
  }

  if (body.ongletsActifs) {
    const estAdmin = session.user.role === "ADMIN";
    const estEmployeurRH = session.user.role === "EMPLOYEUR";

    if (!estAdmin && !estEmployeurRH) {
      return NextResponse.json({ error: "Action réservée à l'administrateur ou à l'Employeur / RH." }, { status: 403 });
    }

    if (!estAdmin) {
      const accesAdminActuel = target.ongletsActifs?.includes("admin") || false;
      const accesAdminDemande = body.ongletsActifs.includes("admin");

      if (accesAdminActuel !== accesAdminDemande) {
        return NextResponse.json({ error: "Seul l'administrateur peut modifier l'accès Administration." }, { status: 403 });
      }
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
  if (body.pole !== undefined) data.pole = body.pole || null;
  if (body.managerId !== undefined) data.managerId = body.managerId;
  if (body.visiblePlanning !== undefined) {
    if (session.user.role !== "ADMIN" && session.user.role !== "EMPLOYEUR") {
      return NextResponse.json({ error: "Action réservée à l'administrateur ou à l'Employeur / RH." }, { status: 403 });
    }
    data.visiblePlanning = body.visiblePlanning;
  }

  if (body.visibleCompta !== undefined) {
    if (session.user.role !== "ADMIN" && session.user.role !== "EMPLOYEUR") {
      return NextResponse.json({ error: "Action réservée à l'administrateur ou à l'Employeur / RH." }, { status: 403 });
    }
    data.visibleCompta = body.visibleCompta;
  }
      if (body.teletravailAutorise !== undefined) {
    if (session.user.role !== "ADMIN" && session.user.role !== "EMPLOYEUR") {
      return NextResponse.json({ error: "Action réservée à l'administrateur ou à l'Employeur / RH." }, { status: 403 });
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
    if (session.user.role !== "ADMIN" && session.user.role !== "EMPLOYEUR") {
      return NextResponse.json({ error: "Action réservée à l'administrateur ou à l'Employeur / RH." }, { status: 403 });
    }
    data.accesRepasExterieur = body.accesRepasExterieur;
  }
  if (body.dateSortie !== undefined) {
    data.dateSortie = body.dateSortie ? new Date(body.dateSortie) : null;
  }
  if (body.dateNaissance !== undefined) {
    data.dateNaissance = body.dateNaissance ? new Date(body.dateNaissance) : null;
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
