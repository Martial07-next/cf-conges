import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!canAccess(session.user, "admin")) redirect("/dashboard");

  const [users, types, motifs, logs] = await Promise.all([
    prisma.user.count(),
    prisma.leaveType.count(),
    prisma.leaveTypeMotif.count(),
    prisma.auditLog.count(),
  ]);

  const sections = [
    {
      href: "/admin/utilisateurs",
      title: "Utilisateurs",
      desc: "Comptes, rôles, activation, désactivation.",
      value: users,
    },
    {
      href: "/admin/types-conges",
      title: "Types de congés",
      desc: "Codes, couleurs, plafonds, règles d'acquisition.",
      value: types,
    },
    {
      href: "/admin/motifs",
      title: "Motifs à durée fixe",
      desc: "ASA / événements familiaux : mariage, décès, naissance…",
      value: motifs,
    },
    {
      href: "/admin/journal",
      title: "Logs",
      desc: "Traçabilité complète des actions sur la plateforme.",
      value: logs,
    },
  ];

  return (
    <div>
      <PageHeader title="Administration" subtitle="Configuration complète de la plateforme" />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {sections.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="p-6 h-full hover:border-brand-green/50 transition-colors">
              <p className="text-3xl font-bold text-brand-dark">{s.value}</p>
              <p className="font-semibold text-brand-dark mt-2">{s.title}</p>
              <p className="text-xs text-brand-dark/50 mt-1">{s.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
