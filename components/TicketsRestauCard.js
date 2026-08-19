import { Card } from "./ui";

export default function TicketsRestauCard({ nombre, moisLabel }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2.5 h-2.5 rounded-full bg-brand-yellow" />
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/60">Tickets restaurant</p>
      </div>
      <p className="text-3xl font-bold text-brand-dark">
        {nombre}
        <span className="text-sm font-medium text-brand-dark/40"> ticket{nombre > 1 ? "s" : ""}</span>
      </p>
      <p className="text-xs text-brand-dark/50 mt-1">
        {moisLabel} · soit {(nombre * 10).toFixed(2)} €
      </p>
    </Card>
  );
}
