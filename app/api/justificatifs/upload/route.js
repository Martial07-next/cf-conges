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

function detectFileType(bytes) {
  if (bytes.length >= 5 && bytes.subarray(0, 5).toString("ascii") === "%PDF-") {
    return "application/pdf";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
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

    const bytes = Buffer.from(await file.arrayBuffer());
    const detectedType = detectFileType(bytes);
    if (!detectedType || detectedType !== file.type) {
      return NextResponse.json(
        { error: "Le contenu du justificatif ne correspond pas au format annoncé." },
        { status: 400 }
      );
    }

    const extension = extensionFor(file);
    const random = crypto.randomUUID();
    const storagePath = `${session.user.id}/temp/${Date.now()}-${random}.${extension}`;

    await uploadPrivateFile("justificatifs", storagePath, bytes, detectedType);

    return NextResponse.json({
      storagePath,
      nomOriginal: file.name,
      type: file.type,
      taille: file.size,
    });
  } catch (error) {
    console.error("Upload justificatif:", error);

    const message = error instanceof Error ? error.message : String(error);
    let detail = "Erreur inconnue du stockage.";

    if (message.includes("Configuration Supabase Storage manquante")) {
      detail = "Configuration Supabase manquante sur Vercel.";
    } else if (message.includes("Supabase Storage 400")) {
      detail = "Supabase a refusé le fichier ou le chemin de stockage.";
    } else if (message.includes("Supabase Storage 401") || message.includes("Supabase Storage 403")) {
      detail = "La clé serveur Supabase n'autorise pas l'accès au Storage.";
    } else if (message.includes("Supabase Storage 404")) {
      detail = "Le bucket privé « justificatifs » est introuvable.";
    } else if (message.includes("Supabase Storage 409")) {
      detail = "Un fichier portant cet identifiant existe déjà.";
    } else if (message.includes("fetch failed")) {
      detail = "Impossible de joindre Supabase depuis le serveur.";
    }

    return NextResponse.json(
      { error: `Impossible d'enregistrer le justificatif. ${detail}` },
      { status: 500 }
    );
  }
}
