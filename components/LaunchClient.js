"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LaunchClient() {
  const router = useRouter();

  useEffect(() => {
    // La navigation déclenche les contrôles middleware + session côté serveur.
    // L'écran /launch reste affiché pendant toute cette attente.
    router.replace("/dashboard");
  }, [router]);

  return null;
}
