"use client";

import { Children, cloneElement, isValidElement, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "cf-dashboard-layout-v1";

export default function DashboardLayoutManager({ children }) {
  const items = useMemo(() => Children.toArray(children).filter(Boolean), [children]);
  const ids = useMemo(() => items.map((item) => item.props?.dashboardId).filter(Boolean), [items]);
  const [editing, setEditing] = useState(false);
  const [order, setOrder] = useState(ids);
  const [dragged, setDragged] = useState(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(saved)) {
        setOrder([...saved.filter((id) => ids.includes(id)), ...ids.filter((id) => !saved.includes(id))]);
      }
    } catch {
      setOrder(ids);
    }
  }, [ids.join("|")]);

  function persist(next) {
    setOrder(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function move(source, target) {
    if (!source || source === target) return;
    const next = [...order];
    const from = next.indexOf(source);
    const to = next.indexOf(target);
    if (from < 0 || to < 0) return;
    next.splice(from, 1);
    next.splice(to, 0, source);
    persist(next);
  }

  const byId = new Map(items.map((item) => [item.props.dashboardId, item]));

  return (
    <section className="mb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-dark/35 dark:text-brand-cream/35">Mon espace</p>
          {editing && <p className="mt-1 text-xs text-brand-dark/50 dark:text-brand-cream/50">Glissez les cartes pour organiser votre tableau de bord.</p>}
        </div>
        <button
          type="button"
          onClick={() => setEditing((value) => !value)}
          className={editing
            ? "rounded-xl bg-brand-yellow px-3.5 py-2 text-xs font-bold text-brand-dark shadow-sm transition hover:opacity-90"
            : "rounded-xl border border-black/10 bg-white px-3.5 py-2 text-xs font-semibold text-brand-dark shadow-sm transition hover:bg-black/[0.03] dark:border-white/10 dark:bg-white/5 dark:text-brand-cream dark:hover:bg-white/10"}
        >
          {editing ? "✓ Terminer" : "⊞ Aménager mon tableau de bord"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5">
        {order.map((id) => {
          const item = byId.get(id);
          if (!item) return null;
          return (
            <div
              key={id}
              draggable={editing}
              onDragStart={() => setDragged(id)}
              onDragEnd={() => setDragged(null)}
              onDragOver={(e) => editing && e.preventDefault()}
              onDrop={() => { if (editing) move(dragged, id); setDragged(null); }}
              className={`relative min-w-0 transition-all duration-200 ${editing ? "cursor-grab rounded-3xl border-2 border-dashed border-brand-green/30 p-2 hover:border-brand-green/60 active:cursor-grabbing" : ""} ${dragged === id ? "scale-[0.99] opacity-45" : ""}`}
            >
              {editing && (
                <div className="absolute right-5 top-5 z-20 flex h-8 w-8 items-center justify-center rounded-xl border border-black/10 bg-white text-base font-bold text-brand-dark shadow-sm dark:border-white/10 dark:bg-brand-night dark:text-brand-cream" title="Déplacer">
                  ⠿
                </div>
              )}
              {isValidElement(item) ? cloneElement(item, { dashboardId: undefined }) : item}
            </div>
          );
        })}
      </div>
    </section>
  );
}
