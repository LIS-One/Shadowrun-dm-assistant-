"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { errorMessage } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/types";
import { useCampaign } from "./CampaignContext";

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
    { href: base, label: "Карты", active: pathname === base || pathname.startsWith(`${base}/maps`) },
    { href: `${base}/cabinet`, label: "Кабинет", active: pathname.startsWith(`${base}/cabinet`) || pathname.startsWith(`${base}/characters`) },
    { href: `${base}/logs`, label: "Логи игр", active: pathname.startsWith(`${base}/logs`) },
    { href: `${base}/members`, label: "Участники", active: pathname.startsWith(`${base}/members`) },
  ];

  return (
    <>
      <div className="border-b border-line bg-panel/40">
        <div className="mx-auto max-w-6xl px-4 pt-6">
          <Link href="/campaigns" className="text-xs text-slate-400 hover:text-slate-200">← Все кампании</Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{campaign?.name ?? "…"}</h1>
            {campaign && <span className="chip">{ROLE_LABELS[campaign.myRole]}</span>}
          </div>
          <nav className="mt-4 flex gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm transition ${
                  t.active ? "border-accent text-white" : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </>
  );
}
