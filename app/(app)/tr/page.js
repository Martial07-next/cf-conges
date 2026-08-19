import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import { calculerTicketsRestau, calculerTicketsRestauSemaines } from "@/lib/ticketsRestau";
import TRRegularisationForm from "@/components/TRRegularisationForm";

export const dynamic = "force-dynamic";

const MOIS_COURTS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
const MOIS_LONGS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

function toMoisParam(annee, mois) {
  return `${annee}-${String(mois + 1).padStart(2, "0")}`;
}

export default async function TicketsRestauPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!canAccess(session.user, "tr")) redirect("/dashboard");

  const vue = searchParams?.vue === "semaines" ? "semaines" : "annee";
  const annee = searchParams?.annee && /^\d{4}$/.test(searchParams.annee) ? parseInt(searchParams.annee, 10) : new Date().getFullYear();

  const now = new Date();
  let moisAnnee = now.getFullYear();
  let moisIndex = now.getMonth();
  if (searchParams?.mois && /^\d{4}-\d{2}$/.test(searchParams.mois)) {
    const [y, m] = searchParams.mois.split("-").map(Number);
    moisAnnee = y;
    moisIndex = m - 1;
  }

  const users = await prisma.user.findMany({
    where: { statutCompte: "ACTIF", visiblePlanning: true },
    orderBy: { nom: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Gestionnaire TR"
        subtitle="Tickets restaurant cumulés par collaborateur — 10€ / jour travaillé en entreprise."
      />

      <TRRegularisationForm />

      <div className="inline-flex bg-black/5 rounded-xl p-1 gap-1 my-5">
        <Link href={`/tr?vue=annee&annee=${annee}`}>
          <span className={`inline-block px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${vue === "annee" ? "bg-white text-brand-dark shadow-sm" : "text-brand-dark/50 hover:text-brand-dark"}`}>
            Vue annuelle
          </span>
        </Link>
        <Link href={`/tr?vue=semaines&mois=${toMoisParam(moisAnnee, moisIndex)}`}>
          <span className={`inline-block px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${vue === "semaines" ? "bg-white text-brand-dark shadow-sm" : "text-brand-dark/50 hover:text-brand-dark"}`}>
            Vue par semaines
          </span>
        </Link>
      </div>

      {vue === "annee" ? (
        <VueAnnuelle users={users} annee={annee} />
      ) : (
        <VueSemaines users={users} annee={moisAnnee} mois={moisIndex} />
      )}
    </div>
  );
}

async function VueAnnuelle({ users, annee }) {
  const resultats = await calculerTicketsRestau(users, annee);

  return (
    <>
      <div className="flex items-center gap-2 mb-5">
        <Link href={`/tr?vue=annee&annee=${annee - 1}`}>
          <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl border border-black/10 hover:bg-black/5 text-brand-dark focus-ring">‹</span>
        </Link>
        <span className="text-sm font-semibold text-brand-dark min-w-[60px] text-center">{annee}</span>
        <Link href={`/tr?vue=annee&annee=${annee + 1}`}>
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
    </>
  );
}

async function VueSemaines({ users, annee, mois }) {
  const { resultats, labels } = await calculerTicketsRestauSemaines(users, annee, mois);

  const prevMois = mois === 0 ? 11 : mois - 1;
  const prevAnnee = mois === 0 ? annee - 1 : annee;
  const nextMois = mois === 11 ? 0 : mois + 1;
  const nextAnnee = mois === 11 ? annee + 1 : annee;

  return (
    <>
      <div className="flex items-center gap-2 mb-5">
        <Link href={`/tr?vue=semaines&mois=${toMoisParam(prevAnnee, prevMois)}`}>
          <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl border border-black/10 hover:bg-black/5 text-brand-dark focus-ring">‹</span>
        </Link>
        <span className="text-sm font-semibold text-brand-dark min-w-[160px] text-center">
          {MOIS_LONGS[mois]} {annee}
        </span>
        <Link href={`/tr?vue=semaines&mois=${toMoisParam(nextAnnee, nextMois)}`}>
          <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl border border-black/10 hover:bg-black/5 text-brand-dark focus-ring">›</span>
        </Link>
      </div>

      <Card className="overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr className="text-left text-xs font-semibold text-brand-dark/50 border-b border-black/5">
              <th className="sticky left-0 bg-white z-10 px-4 py-3 min-w-[170px]">Collaborateur</th>
              {labels.map((l, i) => (
                <th key={i} className="px-3 py-3 text-center min-w-[100px]">
                  {l}
                </th>
              ))}
              <th className="px-4 py-3 text-center font-bold">Total mois</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const semaines = resultats[u.id] || Array(labels.length).fill(0);
              const total = semaines.reduce((a, b) => a + b, 0);
              return (
                <tr key={u.id} className="border-b border-black/5 last:border-0">
                  <td className="sticky left-0 bg-white z-10 px-4 py-2.5 font-medium text-brand-dark whitespace-nowrap">
                    {u.prenom} {u.nom}
                  </td>
                  {semaines.map((n, i) => (
                    <td key={i} className="px-3 py-2.5 text-center text-brand-dark/70">
                      {n}
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-center font-bold text-brand-dark">{total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}
