import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import MarkReadButton from "@/components/MarkReadButton";
import DeleteNotifButton from "@/components/DeleteNotifButton";
import ClearAllButton from "@/components/ClearAllButton";
import { canAccess } from "@/lib/permissions";

export const dynamic = "force-dynamic";

function formatDateTime(d) {
    return new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
}

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Toutes les mises à jour concernant vos demandes et votre compte."
        action={
          <div className="flex items-center gap-4">
            {notifications.length > 0 && (
              <ClearAllButton
                endpoint="/api/notifications/mes-notifications"
                label="Vider mes notifications"
                confirmMessage="Supprimer définitivement toutes vos notifications ?"
              />
            )}
            {canAccess(session.user, "admin") && notifications.length > 0 && (
              <ClearAllButton
                endpoint="/api/notifications"
                label="Tout supprimer (tous les comptes)"
                confirmMessage="Supprimer définitivement TOUTES les notifications de TOUS les utilisateurs ?"
              />
            )}
          </div>
        }
      />

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
                <div className="flex items-center gap-3 shrink-0">
                  {!n.lu && <MarkReadButton id={n.id} />}
                  <DeleteNotifButton id={n.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
