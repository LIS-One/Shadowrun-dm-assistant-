import { redirect } from "next/navigation";
import { IconLogout } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { ProfileSync } from "@/components/ProfileSync";
import { Toaster } from "@/components/Toaster";
import { getCurrentUser, loginUrl, logoutUrl } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect(loginUrl());

  return (
    <Toaster>
      <ProfileSync name={user.name} email={user.email} picture={user.picture} />
      <header className="sticky top-0 z-40 border-b border-line bg-bg/85 pt-[var(--safe-top)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-2 text-sm sm:gap-3">
            {user.picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.picture} alt="" className="h-8 w-8 border border-line-hi" />
            ) : (
              <span className="grid h-8 w-8 place-items-center border border-line-hi bg-panel-2 font-display text-xs text-accent">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="hidden max-w-40 truncate font-mono text-xs uppercase tracking-wider text-slate-300 sm:inline">{user.name}</span>
            <a href={logoutUrl()} className="grid h-11 w-11 place-items-center text-muted hover:text-accent" title="Выйти" aria-label="Выйти">
              <IconLogout />
            </a>
          </div>
        </div>
      </header>
      {children}
    </Toaster>
  );
}
