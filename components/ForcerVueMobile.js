"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Sur petit ecran (<768px), redirige automatiquement UNIQUEMENT si la vue
// actuelle est celle a bloquer (ex: "mois", trop large pour un telephone).
// Les autres vues (jour, semaine) restent librement accessibles.
export default function ForcerVueMobile({ vueActuelle, vueABloquer, urlCible }) {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const estMobile = window.matchMedia("(max-width: 767px)").matches;
    if (estMobile && vueActuelle === vueABloquer) {
      router.replace(urlCible);
    }
  }, [vueActuelle, vueABloquer, urlCible, router]);

  return null;
}
