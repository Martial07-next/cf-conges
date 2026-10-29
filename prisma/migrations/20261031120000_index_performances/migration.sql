-- Index pour accélérer les pages les plus consultées (planning, tableau de
-- bord, notifications, gestionnaire TR). Sans effet sur les données.
CREATE INDEX IF NOT EXISTS "LeaveRequest_userId_dateDebut_idx" ON "LeaveRequest"("userId", "dateDebut");
CREATE INDEX IF NOT EXISTS "LeaveRequest_statut_dateDebut_dateFin_idx" ON "LeaveRequest"("statut", "dateDebut", "dateFin");
CREATE INDEX IF NOT EXISTS "Notification_userId_date_idx" ON "Notification"("userId", "date");
CREATE INDEX IF NOT EXISTS "AuditLog_date_idx" ON "AuditLog"("date");
CREATE INDEX IF NOT EXISTS "TeletravailOverride_date_idx" ON "TeletravailOverride"("date");
CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription"("userId");
