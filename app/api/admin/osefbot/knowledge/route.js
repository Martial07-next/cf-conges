import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const questionReference = String(body.questionReference || "").trim().slice(0, 600);
  const reponse = String(body.reponse || "").trim().slice(0, 4000);
  if (!questionReference || !reponse) return NextResponse.json({ error: "Question et réponse obligatoires." }, { status: 400 });
  const formulations = Array.isArray(body.formulations) ? body.formulations.map((x) => String(x).trim().slice(0,600)).filter(Boolean).slice(0,20) : [];
  const actionLabel = String(body.actionLabel || "").trim().slice(0,80) || null;
  const actionHref = String(body.actionHref || "").trim().slice(0,200) || null;
  if (actionHref && (!actionHref.startsWith("/") || actionHref.startsWith("//"))) return NextResponse.json({ error: "La destination doit être une page interne." }, { status: 400 });
  const connaissance = await prisma.osefBotKnowledge.create({ data: { questionReference, reponse, formulations, actionLabel: actionHref ? actionLabel : null, actionHref, createdById: session.user.id } });
  return NextResponse.json({ ok: true, id: connaissance.id });
}
