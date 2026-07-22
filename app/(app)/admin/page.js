import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const [users, types, logs] = await Promise.all([
    prisma.user.count(),
    prisma.leaveType.count(),
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
      href: "/admin/journal",
      title: "Journal d'audit",
      desc: "Traçabilité complète des actions sur la plateforme.",
      value: logs,
    },
  ];

  return (
    <div>
      <PageHeader title="Administration" subtitle="Configuration complète de la plateforme — accès administrateur." />

      <div className="grid sm:grid-cols-3 gap-5">
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
