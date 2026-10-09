import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { normalizeInviteCode } from "@/lib/invite-code";
import { getCurrentUser, loginUrl } from "@/lib/session";
import { JoinForm } from "./JoinForm";

/**
 * Invite link: /join/CODE. Guests are sent to login/sign-up and come back here; signed-in users
 * confirm with one click (joining is a POST, so a stray link can't silently add anyone).
 */
export default async function JoinPage(props: PageProps<"/join/[code]">) {
  const code = normalizeInviteCode((await props.params).code);
  const user = await getCurrentUser();
  if (!user) redirect(loginUrl(`/join/${code}`, { signup: true }));

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-8 p-4">
      <Logo />
      <div className="panel cut-corners hud-brackets w-full max-w-md p-6 sm:p-8">
        <p className="kicker mb-2">{"// приглашение"}</p>
        <h1 className="text-2xl">Вас зовут в забег</h1>
        <p className="mt-3 text-sm text-slate-400">
          Вы вошли как <b className="text-slate-200">{user.name}</b>. Нажмите кнопку, чтобы присоединиться к кампании
          как игрок.
        </p>
        <p className="my-5 bg-bg/60 py-2 text-center font-mono text-lg tracking-[0.25em] text-accent">{code}</p>
        <JoinForm code={code} />
        <Link href="/campaigns" className="mt-4 block text-center font-mono text-[11px] uppercase tracking-wider text-muted hover:text-accent">
          К моим кампаниям
        </Link>
      </div>
    </main>
  );
}
