"use client";

import { useRouter } from "next/navigation";

export default function DeleteNotifButton({ id }) {
  const router = useRouter();

  async function handleClick() {
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <button onClick={handleClick} className="text-xs font-semibold text-alert-soft hover:underline shrink-0">
      Supprimer
    </button>
  );
}
