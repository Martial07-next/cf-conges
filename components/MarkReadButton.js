"use client";

import { useRouter } from "next/navigation";

export default function MarkReadButton({ id }) {
  const router = useRouter();

  async function handleClick() {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    router.refresh();
  }

  return (
    <button onClick={handleClick} className="text-xs font-semibold text-brand-greendark hover:underline shrink-0">
      Marquer comme lu
    </button>
  );
}
