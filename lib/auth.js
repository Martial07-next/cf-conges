import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { logAudit } from "./audit";

export const authOptions = {
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // deconnexion apres 8h d'inactivite max
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
      } else if (token.id) {
        // Rafraîchit les droits à chaque vérification de session, pour que les
        // changements de rôle/onglets/statut faits par l'Admin s'appliquent sans
        // attendre une reconnexion.
        const current = await prisma.user.findUnique({ where: { id: token.id } });
        token.role = current?.role ?? token.role;
        token.onglets = current?.ongletsActifs ?? token.onglets;
        token.statutCompte = current?.statutCompte ?? "DESACTIVE";
        token.doitChangerMotDePasse = current?.doitChangerMotDePasse ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.onglets = token.onglets;
        session.user.statutCompte = token.statutCompte;
        session.user.doitChangerMotDePasse = token.doitChangerMotDePasse;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
