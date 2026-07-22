export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-brand-dark/60 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }) {
  return <div className={`bg-white rounded-2xl shadow-card border border-black/5 ${className}`}>{children}</div>;
}

export function EmptyState({ title, subtitle }) {
  return (
    <div className="text-center py-14 px-6">
      <p className="text-sm font-semibold text-brand-dark">{title}</p>
      {subtitle && <p className="text-sm text-brand-dark/50 mt-1">{subtitle}</p>}
    </div>
  );
}

export function Button({ children, variant = "primary", className = "", ...props }) {
  const variants = {
    primary: "bg-brand-green hover:bg-brand-greendark text-brand-dark",
    dark: "bg-brand-dark hover:bg-brand-darker text-brand-cream",
    ghost: "bg-transparent hover:bg-black/5 text-brand-dark border border-black/10",
    danger: "bg-alert-soft/15 hover:bg-alert-soft/25 text-alert-soft border border-alert-soft/30",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
