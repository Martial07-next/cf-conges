import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function parseMonth(param) {
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [y, m] = param.split("-").map(Number);
    return { year: y, month: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function toParam(year, month) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export default async function PlanningPage({ searchParams }) {
  const { year, month } = parseMonth(searchParams?.mois);
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days = Array.from({ length: lastDay.getDate() }, (_, i) => new Date(year, month, i + 1));

  const prevParam = toParam(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1);
  const nextParam = toParam(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1);

  const [users, requests] = await Promise.all([
    prisma.user.findMany({
      where: { statutCompte: "ACTIF" },
      orderBy: { nom: "asc" },
    }),
    prisma.leaveRequest.findMany({
      where: {
        statut: "VALIDE",
        dateDebut: { lte: lastDay },
        dateFin: { gte: firstDay },
      },
      include: { leaveType: true },
    }),
    prisma.leaveType.findMany({ orderBy: { ordre: "asc" } }),
  ]);
  const leaveTypes = await prisma.leaveType.findMany({ orderBy: { ordre: "asc" } });

  function findDay(userId, day) {
    return requests.find((r) => r.userId === userId && day >= r.dateDebut && day <= r.dateFin);
  }

  return (
    <div>
      <PageHeader
        title="Planning équipe"
        subtitle="Qui est présent, en congé ou en télétravail — vue d'ensemble mensuelle."
        action={
          <div className="flex items-center gap-2">
            <Link href={`/planning?mois=${prevParam}`}>
              <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl border border-black/10 hover:bg-black/5 text-brand-dark focus-ring">‹</span>
            </Link>
            <span className="text-sm font-semibold text-brand-dark w-32 text-center">
              {MOIS[month]} {year}
            </span>
            <Link href={`/planning?mois=${nextParam}`}>
              <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl border border-black/10 hover:bg-black/5 text-brand-dark focus-ring">›</span>
            </Link>
          </div>
        }
      />

      <Card className="overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white z-10 text-left px-4 py-3 font-semibold text-brand-dark/70 min-w-[170px] border-b border-black/5">
                Collaborateur
              </th>
              {days.map((d) => {
                const weekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <th
                    key={d.toISOString()}
                    className={`px-1.5 py-3 text-center font-medium border-b border-black/5 min-w-[30px] ${
                      weekend ? "text-brand-dark/30 bg-black/[0.02]" : "text-brand-dark/60"
                    }`}
                  >
                    {d.getDate()}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-black/5 last:border-0">
                <td className="sticky left-0 bg-white z-10 px-4 py-2.5 font-medium text-brand-dark whitespace-nowrap">
                  {u.prenom} {u.nom}
                </td>
                {days.map((d) => {
                  const req = findDay(u.id, d);
                  const weekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <td key={d.toISOString()} className={`px-0.5 py-2.5 text-center ${weekend ? "bg-black/[0.02]" : ""}`}>
                      {req ? (
                        <span
                          title={req.leaveType.libelle}
                          className="inline-flex w-full h-5 rounded items-center justify-center text-[9px] font-bold text-brand-dark/80"
                          style={{ backgroundColor: `${req.leaveType.couleur}55` }}
                        >
                          {req.leaveType.code}
                        </span>
                      ) : (
                        <span className="inline-block w-full h-5" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="flex flex-wrap gap-3 mt-5">
        {leaveTypes.map((t) => (
          <span key={t.id} className="inline-flex items-center gap-1.5 text-xs text-brand-dark/60">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: t.couleur }} />
            {t.code} — {t.libelle}
          </span>
        ))}
      </div>
    </div>
  );
}
