import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import MarkReadButton from "@/components/MarkReadButton";
import DeleteNotifButton from "@/components/DeleteNotifButton";
import ClearAllButton from "@/components/ClearAllButton";
import { canAccess } from "@/lib/permissions";
import MarkAllNotificationsReadButton from "@/components/MarkAllNotificationsReadButton";

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

  const nonLues = notifications.filter((n) => !n.lu).length;

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Toutes les mises à jour concernant vos demandes et votre compte."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {notifications.length > 0 && (
              <MarkAllNotificationsReadButton disabled={nonLues === 0} />
            )}
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

      {notifications.length > 0 && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/50">Non lues</p>
            <div className="mt-1 flex items-end gap-2">
              <p className="text-2xl font-bold text-brand-dark">{nonLues}</p>
              {nonLues > 0 && <span className="mb-1 h-2 w-2 rounded-full bg-brand-yellow" aria-hidden="true" />}
            </div>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/50">Total</p>
            <p className="mt-1 text-2xl font-bold text-brand-dark">{notifications.length}</p>
          </Card>
        </div>
      )}

      <Card>
        {notifications.length === 0 ? (
          <EmptyState title="Aucune notification" />
        ) : (
          <ul className="divide-y divide-black/5">
            {notifications.map((n) => (
              <li key={n.id} className={`px-6 py-4 flex items-center justify-between gap-4 ${!n.lu ? "bg-brand-yellow/[0.08]" : ""}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-brand-dark/50 uppercase tracking-wide">{n.type}</p>
                    {!n.lu && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-yellow" title="Non lue" aria-label="Notification non lue" />}
                  </div>
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
