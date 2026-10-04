"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

export default function AppShell({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem("cf-sidebar-collapsed") === "1");
    setReady(true);
  }, []);

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
