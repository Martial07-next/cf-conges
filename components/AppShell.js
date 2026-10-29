"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Sidebar from "@/components/Sidebar";
import { rattacherAppareilAuCompte } from "@/lib/pushAppareil";

export default function AppShell({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  const { data: session } = useSession();
  const userId = session?.user?.id;

  useEffect(() => {
    setCollapsed(window.localStorage.getItem("cf-sidebar-collapsed") === "1");
    setReady(true);
  }, []);

  // Thème : la préférence enregistrée sur le compte fait foi. On la réapplique
  // à chaque ouverture (autre appareil, application installée, navigateur
  // vidé…) pour que l'affichage corresponde toujours au réglage du profil.
  const themeCompte = session?.user?.theme;
  useEffect(() => {
    if (themeCompte !== "clair" && themeCompte !== "sombre") return;
    document.documentElement.classList.toggle("dark", themeCompte === "sombre");
    try {
      localStorage.setItem("cf-theme", themeCompte);
    } catch {}
  }, [themeCompte]);

  // Les notifications de ce téléphone suivent le compte connecté (une fois
  // par session de navigation et par compte).
  useEffect(() => {
    if (!userId) return;
    try {
      if (sessionStorage.getItem("cf-push-appareil-lie") === userId) return;
      sessionStorage.setItem("cf-push-appareil-lie", userId);
    } catch {}
    rattacherAppareilAuCompte();
  }, [userId]);

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("cf-sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }

  return (
    <>
      <Sidebar collapsed={ready && collapsed} onToggleCollapsed={toggleSidebar} />
      <main
        className={`flex-1 min-w-0 px-4 py-5 md:px-10 md:py-10 transition-[margin] duration-200 ${
          ready && collapsed ? "md:ml-20" : "md:ml-64"
        }`}
      >
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </>
  );
}
