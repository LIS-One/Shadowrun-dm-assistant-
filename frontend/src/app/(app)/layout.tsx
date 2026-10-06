import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileSync } from "@/components/ProfileSync";
import { Toaster } from "@/components/Toaster";
import { getCurrentUser, loginUrl, logoutUrl } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect(loginUrl());

  return (
    <Toaster>
      <ProfileSync name={user.name} email={user.email} picture={user.picture} />
      <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/campaigns" className="flex items-center gap-2 font-semibold">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-accent to-accent-2 text-xs font-black text-slate-950">
              SR
            </span>
            <span className="hidden sm:inline">DM Assistant</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {user.picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.picture} alt="" className="h-7 w-7 rounded-full" />
            ) : (
              <span className="grid h-7 w-7 place-items-center rounded-full bg-panel-2 text-xs">{user.name.slice(0, 1)}</span>
            )}
            <span className="hidden text-slate-300 sm:inline">{user.name}</span>
            <a href={logoutUrl()} className="btn-ghost px-3 py-1.5 text-xs">Выйти</a>
          </div>
        </div>
      </header>
      {children}
    </Toaster>
  );
}
