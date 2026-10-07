import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { sendPushToUser } from "@/lib/webpush";
import { messageDuJour } from "@/lib/messagesQuotidiens";
import { logAudit } from "@/lib/audit";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !canAccess(session.user, "admin")) {
    return NextResponse.json({ error: "Réservé à l'administrateur." }, { status: 403 });
  }

  const message = messageDuJour();

  await sendPushToUser(
    session.user.id,
    "Test notification CF Congés ⚡",
    message,
    "/dashboard"
  );

  await logAudit(session.user.id, "NOTIFICATION_PUSH_TESTEE", message);

  return NextResponse.json({ ok: true, message });
}
