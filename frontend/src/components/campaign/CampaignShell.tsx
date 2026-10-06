"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconId, IconLog, IconMap, IconUsers } from "@/components/icons";
import { errorMessage } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/types";
import { useCampaign } from "./CampaignContext";

const ROLE_STYLES = {
  OWNER: "border-warn/60 text-warn",
  MASTER: "border-accent-2/60 text-accent-2",
  PLAYER: "border-accent/60 text-accent",
} as const;

export function CampaignShell({ children }: { children: React.ReactNode }) {
  const { campaignId, campaign, error } = useCampaign();
  const pathname = usePathname();
  const base = `/campaigns/${campaignId}`;

  if (error) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-red-400">{errorMessage(error)}</p>
        <Link href="/campaigns" className="btn-ghost mt-4">← К списку кампаний</Link>
      </main>
    );
  }

  const tabs = [
    { href: base, label: "Карты", icon: IconMap, active: pathname === base || pathname.startsWith(`${base}/maps`) },
    { href: `${base}/cabinet`, label: "Кабинет", icon: IconId, active: pathname.startsWith(`${base}/cabinet`) || pathname.startsWith(`${base}/characters`) },
    { href: `${base}/logs`, label: "Логи", icon: IconLog, active: pathname.startsWith(`${base}/logs`) },
    { href: `${base}/members`, label: "Команда", icon: IconUsers, active: pathname.startsWith(`${base}/members`) },
  ];

  return (
    <>
      <div className="border-b border-line bg-panel/40">
        <div className="mx-auto max-w-6xl px-4 pt-4 sm:pt-6">
          <Link href="/campaigns" className="font-mono text-[11px] uppercase tracking-wider text-muted hover:text-accent">← Все кампании</Link>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 pb-4 sm:pb-0">
            <h1 className="text-xl sm:text-3xl">{campaign?.name ?? "…"}</h1>
            {campaign && <span className={`chip ${ROLE_STYLES[campaign.myRole]}`}>{ROLE_LABELS[campaign.myRole]}</span>}
          </div>
          {/* desktop tabs */}
          <nav className="mt-4 hidden gap-1 sm:flex">
            {tabs.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-mono text-xs uppercase tracking-wider transition ${
                  t.active ? "border-accent text-accent" : "border-transparent text-muted hover:text-slate-200"
                }`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <main className="mx-auto max-w-6xl px-4 pt-6 pb-[calc(6rem+var(--safe-bottom))] sm:py-8">{children}</main>

      {/* phone tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-bg/95 pb-[var(--safe-bottom)] backdrop-blur-md sm:hidden">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`relative flex h-16 flex-col items-center justify-center gap-1 font-mono text-[10px] uppercase tracking-wider ${
              t.active ? "text-accent" : "text-muted"
            }`}
          >
            {t.active && <span className="absolute inset-x-6 top-0 h-0.5 bg-accent shadow-[0_0_8px_#3dff9e]" />}
            <t.icon className="h-6 w-6" />
            {t.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
