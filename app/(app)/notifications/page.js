import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import MarkReadButton from "@/components/MarkReadButton";

export const dynamic = "force-dynamic";

function formatDateTime(d) {
  return new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
  });

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Toutes les mises à jour concernant vos demandes et votre compte." />

      <Card>
        {notifications.length === 0 ? (
          <EmptyState title="Aucune notification" />
        ) : (
          <ul className="divide-y divide-black/5">
            {notifications.map((n) => (
              <li key={n.id} className={`px-6 py-4 flex items-center justify-between gap-4 ${!n.lu ? "bg-brand-yellow/[0.06]" : ""}`}>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-brand-dark/50 uppercase tracking-wide">{n.type}</p>
                  <p className="text-sm text-brand-dark mt-0.5">{n.message}</p>
                  <p className="text-[11px] text-brand-dark/40 mt-1">{formatDateTime(n.date)}</p>
                </div>
                {!n.lu && <MarkReadButton id={n.id} />}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
