import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const JOURS_SEMAINE = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}
function parseISODate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = dimanche
  const diff = day === 0 ? -6 : 1 - day; // ramène au lundi
  return addDays(d, diff);
}
function parseMonthParam(param) {
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [y, m] = param.split("-").map(Number);
    return { year: y, month: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}
function toMonthParam(year, month) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function ViewTabs({ vue, mois, semaine, jour }) {
  const tabs = [
    { key: "jour", label: "Jour", href: `/planning?vue=jour&jour=${jour}` },
    { key: "semaine", label: "Semaine", href: `/planning?vue=semaine&semaine=${semaine}` },
    { key: "mois", label: "Mois", href: `/planning?vue=mois&mois=${mois}` },
  ];
  return (
    <div className="inline-flex bg-black/5 rounded-xl p-1 gap-1">
      {tabs.map((t) => (
        <Link key={t.key} href={t.href}>
          <span
            className={`inline-block px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              vue === t.key ? "bg-white text-brand-dark shadow-sm" : "text-brand-dark/50 hover:text-brand-dark"
            }`}
          >
            {t.label}
          </span>
        </Link>
      ))}
    </div>
  );
}

function NavArrow({ href, children }) {
  return (
    <Link href={href}>
      <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl border border-black/10 hover:bg-black/5 text-brand-dark focus-ring">
        {children}
      </span>
    </Link>
  );
}

export default async function PlanningPage({ searchParams }) {
  const vue = ["jour", "semaine", "mois"].includes(searchParams?.vue) ? searchParams.vue : "mois";
  const today = new Date();
  const todayISO = toISODate(today);

  const jourParam = searchParams?.jour && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.jour) ? searchParams.jour : todayISO;
  const semaineParam = searchParams?.semaine && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.semaine) ? searchParams.semaine : todayISO;
  const { year, month } = parseMonthParam(searchParams?.mois);
  const moisParam = toMonthParam(year, month);

  let rangeStart, rangeEnd, days;

  if (vue === "jour") {
    rangeStart = parseISODate(jourParam);
    rangeEnd = rangeStart;
    days = [rangeStart];
  } else if (vue === "semaine") {
    rangeStart = startOfWeek(parseISODate(semaineParam));
    rangeEnd = addDays(rangeStart, 6);
    days = Array.from({ length: 7 }, (_, i) => addDays(rangeStart, i));
  } else {
    rangeStart = new Date(year, month, 1);
    rangeEnd = new Date(year, month + 1, 0);
    days = Array.from({ length: rangeEnd.getDate() }, (_, i) => new Date(year, month, i + 1));
  }

  const [users, requests, leaveTypes] = await Promise.all([
    prisma.user.findMany({ where: { statutCompte: "ACTIF" }, orderBy: { nom: "asc" } }),
    prisma.leaveRequest.findMany({
      where: { statut: "VALIDE", dateDebut: { lte: rangeEnd }, dateFin: { gte: rangeStart } },
      include: { leaveType: true },
    }),
    prisma.leaveType.findMany({ orderBy: { ordre: "asc" } }),
  ]);

  // Type "Jour travaillé" affiché par défaut sur les cases sans absence (jours ouvrés uniquement).
  const jt = leaveTypes.find((t) => t.code === "JT");

  function findDay(userId, day) {
    return requests.find((r) => r.userId === userId && day >= r.dateDebut && day <= r.dateFin);
  }

  // --- Navigation hrefs propres à chaque vue ---
  let prevHref, nextHref, todayHref, title;
  if (vue === "jour") {
    prevHref = `/planning?vue=jour&jour=${toISODate(addDays(rangeStart, -1))}`;
    nextHref = `/planning?vue=jour&jour=${toISODate(addDays(rangeStart, 1))}`;
    todayHref = `/planning?vue=jour&jour=${todayISO}`;
    title = `${JOURS_SEMAINE[rangeStart.getDay() === 0 ? 6 : rangeStart.getDay() - 1]} ${rangeStart.getDate()} ${MOIS[rangeStart.getMonth()]} ${rangeStart.getFullYear()}`;
  } else if (vue === "semaine") {
    prevHref = `/planning?vue=semaine&semaine=${toISODate(addDays(rangeStart, -7))}`;
    nextHref = `/planning?vue=semaine&semaine=${toISODate(addDays(rangeStart, 7))}`;
    todayHref = `/planning?vue=semaine&semaine=${todayISO}`;
    title = `${rangeStart.getDate()} ${MOIS[rangeStart.getMonth()]} → ${rangeEnd.getDate()} ${MOIS[rangeEnd.getMonth()]}`;
  } else {
    const prevM = toMonthParam(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1);
    const nextM = toMonthParam(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1);
    prevHref = `/planning?vue=mois&mois=${prevM}`;
    nextHref = `/planning?vue=mois&mois=${nextM}`;
    todayHref = `/planning?vue=mois&mois=${toMonthParam(today.getFullYear(), today.getMonth())}`;
    title = `${MOIS[month]} ${year}`;
  }

  return (
    <div>
      <PageHeader
        title="Planning équipe"
        subtitle="Qui est présent, en congé ou en télétravail."
        action={<ViewTabs vue={vue} mois={moisParam} semaine={semaineParam} jour={jourParam} />}
      />

      <div className="flex items-center gap-2 mb-5">
        <NavArrow href={prevHref}>‹</NavArrow>
        <span className="text-sm font-semibold text-brand-dark min-w-[220px] text-center">{title}</span>
        <NavArrow href={nextHref}>›</NavArrow>
        <Link href={todayHref}>
          <span className="ml-1 px-3 py-1.5 rounded-xl border border-black/10 hover:bg-black/5 text-xs font-semibold text-brand-dark focus-ring">
            Aujourd'hui
          </span>
        </Link>
      </div>

      {vue === "jour" ? (
        <Card>
          {users.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-brand-dark/50">Aucun collaborateur actif.</p>
          ) : (
            <ul className="divide-y divide-black/5">
              {users.map((u) => {
                const req = findDay(u.id, rangeStart);
                return (
                  <li key={u.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-brand-dark">
                      {u.prenom} {u.nom}
                    </span>
                    {req ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: `${req.leaveType.couleur}33` }}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: req.leaveType.couleur }} />
                        {req.leaveType.libelle}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-green/15 text-brand-greendark">
                        <span className="w-2 h-2 rounded-full bg-brand-green" />
                        Présent
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ) : vue === "semaine" ? (
        <Card className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white z-10 text-left px-4 py-3 font-semibold text-brand-dark/70 min-w-[170px] border-b border-black/5">
                  Collaborateur
                </th>
                {days.map((d) => {
                  const weekend = d.getDay() === 0 || d.getDay() === 6;
                  const isToday = toISODate(d) === todayISO;
                  return (
                    <th
                      key={d.toISOString()}
                      className={`px-2 py-3 text-center font-medium border-b border-black/5 min-w-[110px] ${
                        weekend ? "text-brand-dark/30 bg-black/[0.02]" : "text-brand-dark/60"
                      } ${isToday ? "bg-brand-green/10" : ""}`}
                    >
                      <div>{JOURS_SEMAINE[d.getDay() === 0 ? 6 : d.getDay() - 1].slice(0, 3)}</div>
                      <div className="text-sm font-bold text-brand-dark">{d.getDate()}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-black/5 last:border-0">
                  <td className="sticky left-0 bg-white z-10 px-4 py-3 font-medium text-brand-dark whitespace-nowrap">
                    {u.prenom} {u.nom}
                  </td>
                  {days.map((d) => {
                    const req = findDay(u.id, d);
                    const weekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <td key={d.toISOString()} className={`px-1.5 py-2.5 text-center ${weekend ? "bg-black/[0.02]" : ""}`}>
                        {req ? (
                          <span
                            title={req.leaveType.libelle}
                            className="inline-flex w-full h-6 rounded-lg items-center justify-center text-[10px] font-bold text-brand-dark/80 px-1"
                            style={{ backgroundColor: `${req.leaveType.couleur}55` }}
                          >
                            {req.leaveType.code}
                          </span>
                        ) : !weekend && jt ? (
                          <span
                            title="Jour travaillé"
                            className="inline-flex w-full h-6 rounded-lg items-center justify-center text-[10px] font-bold text-white px-1"
                            style={{ backgroundColor: jt.couleur }}
                          >
                            JT
                          </span>
                        ) : (
                          <span className="inline-block w-full h-6" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        // --- Vue MOIS (cas par défaut du vue === "mois") ---
        <Card className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white z-10 text-left px-4 py-3 font-semibold text-brand-dark/70 min-w-[170px] border-b border-black/5">
                  Collaborateur
                </th>
                {days.map((d) => {
                  const weekend = d.getDay() === 0 || d.getDay() === 6;
                  const isToday = toISODate(d) === todayISO;
                  return (
                    <th
                      key={d.toISOString()}
                      className={`px-1.5 py-3 text-center font-medium border-b border-black/5 min-w-[30px] ${
                        weekend ? "text-brand-dark/30 bg-black/[0.02]" : "text-brand-dark/60"
                      } ${isToday ? "bg-brand-green/10" : ""}`}
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
                        ) : !weekend && jt ? (
                          <span
                            title="Jour travaillé"
                            className="inline-flex w-full h-5 rounded items-center justify-center text-[9px] font-bold text-white"
                            style={{ backgroundColor: jt.couleur }}
                          >
                            JT
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
      )}

      <div className="flex flex-wrap gap-3 mt-5">
        {leaveTypes.map((t) => (
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: t.couleur }} />
            {t.code} = {t.libelle}
          </span>
        ))}
      </div>
    </div>
  );
}
