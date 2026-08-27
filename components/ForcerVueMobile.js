"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Sur petit ecran (<768px), redirige automatiquement vers la vue cible si la
// vue actuelle n'est pas deja celle-ci. Ne fait rien sur ecran large (bureau).
export default function ForcerVueMobile({ vueActuelle, vueCible, urlCible }) {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const estMobile = window.matchMedia("(max-width: 767px)").matches;
    if (estMobile && vueActuelle !== vueCible) {
      router.replace(urlCible);
    }
  }, [vueActuelle, vueCible, urlCible, router]);

  return null;
}
