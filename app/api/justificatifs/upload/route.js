import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadPrivateFile } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function extensionFor(file) {
  const byType = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return byType[file.type] || "bin";
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "Aucun justificatif fourni." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Format non autorisé. Utilisez un PDF, JPG, PNG ou WebP." },
        { status: 400 }
      );
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Le justificatif doit faire moins de 10 Mo." },
        { status: 400 }
      );
    }

    const extension = extensionFor(file);
    const random = crypto.randomUUID();
    const storagePath = `${session.user.id}/temp/${Date.now()}-${random}.${extension}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    await uploadPrivateFile("justificatifs", storagePath, bytes, file.type);

    return NextResponse.json({
      storagePath,
      nomOriginal: file.name,
      type: file.type,
      taille: file.size,
    });
  } catch (error) {
    console.error("Upload justificatif:", error);
    return NextResponse.json(
      { error: "Impossible d'enregistrer le justificatif." },
      { status: 500 }
    );
  }
}
