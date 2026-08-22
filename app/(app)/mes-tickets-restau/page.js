import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import { calculerDetailTicketsRestauMois } from "@/lib/ticketsRestau";
import RegularisationBadge from "@/components/RegularisationBadge";

export const dynamic = "force-dynamic";

const MOIS_LONGS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const JOURS_COURTS = ["Lun", "Mar", "Mer", "Jeu", "Ven"];

function toMoisParam(annee, mois) {
  return `${annee}-${String(mois + 1).padStart(2, "0")}`;
}

export default async function MesTicketsRestauPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.visiblePlanning) redirect("/dashboard");

  const now = new Date();
  let annee = now.getFullYear();
  let mois = now.getMonth();
  if (searchParams?.mois && /^\d{4}-\d{2}$/.test(searchParams.mois)) {
    const [y, m] = searchParams.mois.split("-").map(Number);
    annee = y;
    mois = m - 1;
  }

  const [{ jours, details }, livraison] = await Promise.all([
    calculerDetailTicketsRestauMois([user], annee, mois),
    prisma.ticketRestauLivraison.findUnique({ where: { annee_mois: { annee, mois } } }),
  ]);
  const total = jours.filter((j) => details[user.id][j.toDateString()]?.etat === "ticket").length;

  const prevMois = mois === 0 ? 11 : mois - 1;
  const prevAnnee = mois === 0 ? annee - 1 : annee;
  const nextMois = mois === 11 ? 0 : mois + 1;
  const nextAnnee = mois === 11 ? annee + 1 : annee;

  return (
    <div>
      <PageHeader title="Mes tickets restaurant" subtitle="10€ par jour travaillé en entreprise — détail jour par jour." />

      <div className="flex items-center gap-2 my-5">
        <Link href={`/mes-tickets-restau?mois=${toMoisParam(prevAnnee, prevMois)}`}>
          <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl border border-black/10 hover:bg-black/5 text-brand-dark focus-ring">‹</span>
        </Link>
        <span className="text-sm font-semibold text-brand-dark min-w-[160px] text-center">
          {MOIS_LONGS[mois]} {annee}
        </span>
        <Link href={`/mes-tickets-restau?mois=${toMoisParam(nextAnnee, nextMois)}`}>
          <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl border border-black/10 hover:bg-black/5 text-brand-dark focus-ring">›</span>
        </Link>
      </div>

      <Card className="p-5 mb-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/50">Total du mois</p>
        <p className="text-3xl font-bold text-brand-dark mt-1">
          {total} <span className="text-sm font-medium text-brand-dark/40">ticket{total > 1 ? "s" : ""}</span>
        </p>
        <p className="text-xs text-brand-dark/50 mt-1">soit {(total * 10).toFixed(2)} €</p>
        {livraison && (
          <p className="text-[11px] font-semibold text-brand-greendark bg-brand-greendark/10 inline-block px-2 py-1 rounded-full mt-2">
            ✓ Livré depuis le {new Date(livraison.livreLe).toLocaleDateString("fr-FR")}
          </p>
        )}
      </Card>

      <Card className="overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr>
              {jours.map((j) => (
                <th key={j.toISOString()} className="px-1.5 py-2 text-center font-medium text-brand-dark/60 border-b border-black/5 min-w-[38px]">
                  <div className="text-[9px]">{JOURS_COURTS[j.getDay() - 1]}</div>
                  <div>{j.getDate()}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {jours.map((j) => {
                const info = details[user.id][j.toDateString()];
                return (
                  <td key={j.toISOString()} className="px-1 py-2 text-center">
                    {info?.etat === "regularise" ? (
                      <RegularisationBadge
                        userId={user.id}
                        dateISO={info.dateISO}
                        dateLabel={info.dateLabel}
                        commentaire={info.commentaire}
                        createdByLabel={info.createdByLabel}
                        canEdit={false}
                      />
                    ) : info?.etat === "conge" ? (
                      <span
                        title={info.leaveType.libelle}
                        className="inline-flex w-full h-5 rounded items-center justify-center text-[9px] font-bold text-white"
                        style={{ backgroundColor: info.leaveType.couleur }}
                      >
                        {info.leaveType.code}
                      </span>
                    ) : (
                      <span
                        title="Ticket restaurant gagné"
                        className="inline-flex w-full h-5 rounded items-center justify-center text-[9px] font-bold text-white bg-brand-green"
                      >
                        ✓
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </Card>

      <p className="text-xs text-brand-dark/40 mt-3">
        Cliquez sur un badge orange "Rég." pour voir le motif d'une régularisation appliquée par le gestionnaire TR.
      </p>
    </div>
  );
}
