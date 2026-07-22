import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

// Auto-inscription : le compte est cree en statut EN_ATTENTE et reste
// inactif tant que l'employeur ou l'administrateur ne l'a pas approuve (§5).
export async function POST(req) {
  try {
    const { nom, prenom, email, password, service } = await req.json();

    if (!nom || !prenom || !email || !password) {
      return NextResponse.json({ error: "Merci de renseigner tous les champs obligatoires." }, { status: 400 });
    }
    if (!email.toLowerCase().endsWith("@cf-reseaux.fr")) {
      return NextResponse.json({ error: "L'inscription est réservée aux adresses @cf-reseaux.fr." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Le mot de passe doit contenir au moins 8 caractères." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "Un compte existe déjà avec cet email." }, { status: 409 });
    }

    const motDePasseHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        nom,
        prenom,
        email: email.toLowerCase(),
        motDePasseHash,
        service: service || null,
        statutCompte: "EN_ATTENTE",
      },
    });

    await logAudit(user.id, "INSCRIPTION", user.email);

    // Notifie les employeurs/admins qu'un nouveau compte attend une activation
    const validateurs = await prisma.user.findMany({ where: { role: { in: ["EMPLOYEUR", "ADMIN"] } } });
    await prisma.notification.createMany({
      data: validateurs.map((v) => ({
        userId: v.id,
        type: "Nouveau compte",
        message: `${prenom} ${nom} a créé un compte et attend une validation d'accès.`,
      })),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
