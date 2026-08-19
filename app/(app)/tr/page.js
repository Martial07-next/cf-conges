import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import { calculerTicketsRestau } from "@/lib/ticketsRestau";
import TRRegularisationForm from "@/components/TRRegularisationForm";

export const dynamic = "force-dynamic";

const MOIS_COURTS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

export default async function TicketsRestauPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!canAccess(session.user, "tr")) redirect("/dashboard");

  const annee = searchParams?.annee && /^\d{4}$/.test(searchParams.annee) ? parseInt(searchParams.annee, 10) : new Date().getFullYear();

  const users = await prisma.user.findMany({
    where: { statutCompte: "ACTIF", visiblePlanning: true },
    orderBy: { nom: "asc" },
  });

  const resultats = await calculerTicketsRestau(users, annee);

  return (
    <div>
      <PageHeader
        title="Gestionnaire TR"
        subtitle="Tickets restaurant cumulés par collaborateur — 10€ / jour travaillé en entreprise."
      />

      <TRRegularisationForm />

      <div className="flex items-center gap-2 my-5">
        <Link href={`/tr?annee=${annee - 1}`}>
          <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl border border-black/10 hover:bg-black/5 text-brand-dark focus-ring">‹</span>
        </Link>
        <span className="text-sm font-semibold text-brand-dark min-w-[60px] text-center">{annee}</span>
        <Link href={`/tr?annee=${annee + 1}`}>
          <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl border border-black/10 hover:bg-black/5 text-brand-dark focus-ring">›</span>
        </Link>
      </div>

      <Card className="overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr className="text-left text-xs font-semibold text-brand-dark/50 border-b border-black/5">
              <th className="sticky left-0 bg-white z-10 px-4 py-3 min-w-[170px]">Collaborateur</th>
              {MOIS_COURTS.map((m) => (
                <th key={m} className="px-2 py-3 text-center min-w-[46px]">
                  {m}
                </th>
              ))}
              <th className="px-4 py-3 text-center font-bold">Total</th>
              <th className="px-4 py-3 text-center font-bold">Valeur (€)</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const mois = resultats[u.id] || Array(12).fill(0);
              const total = mois.reduce((a, b) => a + b, 0);
              return (
                <tr key={u.id} className="border-b border-black/5 last:border-0">
                  <td className="sticky left-0 bg-white z-10 px-4 py-2.5 font-medium text-brand-dark whitespace-nowrap">
                    {u.prenom} {u.nom}
                  </td>
                  {mois.map((n, i) => (
                    <td key={i} className="px-2 py-2.5 text-center text-brand-dark/70">
                      {n}
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-center font-bold text-brand-dark">{total}</td>
                  <td className="px-4 py-2.5 text-center font-bold text-brand-greendark">{(total * 10).toFixed(2)} €</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
