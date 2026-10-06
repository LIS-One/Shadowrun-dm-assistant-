import Link from "next/link";

/** Hex "SR" mark with the product name. */
export function Logo({ href = "/campaigns", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="group flex items-center gap-2.5">
      <svg viewBox="0 0 40 44" className="h-8 w-8 shrink-0" aria-hidden>
        <polygon points="20,1 39,11.5 39,32.5 20,43 1,32.5 1,11.5" fill="#05080a" stroke="#3dff9e" strokeWidth="2" />
        <text x="20" y="27.5" textAnchor="middle" fontFamily="var(--font-russo)" fontSize="15" fill="#3dff9e">SR</text>
      </svg>
      {!compact && (
        <span className="leading-none">
          <span className="block font-display text-[15px] tracking-wide text-slate-100 transition group-hover:text-accent">SHADOWRUN</span>
          <span className="block font-mono text-[9px] uppercase tracking-[0.35em] text-muted">DM Assistant</span>
        </span>
      )}
    </Link>
  );
}
