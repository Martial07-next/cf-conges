import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { logAudit } from "./audit";

export const authOptions = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }, // reste connecte 30 jours sur mobile
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60,
      },
    },
  },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Identifiants",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
          select: {
            id: true,
            email: true,
            nom: true,
            prenom: true,
            motDePasseHash: true,
            role: true,
            ongletsActifs: true,
            estAlternant: true,
            statutCompte: true,
            doitChangerMotDePasse: true,
            _count: { select: { alternants: true } },
          },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.motDePasseHash);
        if (!valid) return null;

        if (user.statutCompte === "EN_ATTENTE") {
          throw new Error("EN_ATTENTE_VALIDATION");
        }
        if (user.statutCompte === "DESACTIVE") {
          throw new Error("COMPTE_DESACTIVE");
        }

        await logAudit(user.id, "CONNEXION", user.email);

                return {
          id: user.id,
          email: user.email,
          name: `${user.prenom} ${user.nom}`,
          role: user.role,
          onglets: user.ongletsActifs,
          estAlternant: user.estAlternant,
          statutCompte: user.statutCompte,
          doitChangerMotDePasse: user.doitChangerMotDePasse,
          estTuteur: user._count.alternants > 0,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.onglets = user.onglets;
        token.estAlternant = user.estAlternant;
        token.statutCompte = user.statutCompte;
        token.doitChangerMotDePasse = user.doitChangerMotDePasse;
        token.estTuteur = user.estTuteur;
      } else if (token.id) {
        const current = await prisma.user.findUnique({
          where: { id: token.id },
          select: {
            role: true,
            ongletsActifs: true,
            statutCompte: true,
            doitChangerMotDePasse: true,
            estAlternant: true,
            _count: { select: { alternants: true } },
          },
        });
        token.role = current?.role ?? token.role;
        token.onglets = current?.ongletsActifs ?? token.onglets;
        token.statutCompte = current?.statutCompte ?? "DESACTIVE";
        token.doitChangerMotDePasse = current?.doitChangerMotDePasse ?? false;
        token.estAlternant = current?.estAlternant ?? false;
        token.estTuteur = (current?._count?.alternants ?? 0) > 0;
      }
      return token;
    },
        async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.onglets = token.onglets;
        session.user.statutCompte = token.statutCompte;
        session.user.estAlternant = token.estAlternant;
        session.user.estTuteur = token.estTuteur;
        session.user.doitChangerMotDePasse = token.doitChangerMotDePasse;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
