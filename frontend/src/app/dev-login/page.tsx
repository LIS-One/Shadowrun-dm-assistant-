import { notFound } from "next/navigation";
import { connection } from "next/server";
import { isDevAuth } from "@/lib/dev-auth";
import { safeReturnTo } from "@/lib/safe-return-to";
import { devLogin } from "./actions";

const PERSONAS = ["Мистер Джонсон", "Мастер Игры", "Призрак", "Тень"];

export default async function DevLoginPage(props: PageProps<"/dev-login">) {
  // AUTH_MODE is a runtime setting, so this page must not be prerendered at build time.
  await connection();
  if (!isDevAuth()) notFound();
  const query = await props.searchParams;
  const returnTo = safeReturnTo(query.returnTo);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="panel w-full max-w-md p-8">
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.3em] text-amber-400">dev mode</p>
        <h1 className="mb-2 text-2xl font-semibold">Локальный вход</h1>
        <p className="mb-6 text-sm text-slate-400">
          Auth0 отключён (AUTH_MODE=dev). Введите любое имя — под ним вы попадёте в систему. Разные имена — разные
          пользователи, так удобно проверять роли владельца, мастера и игрока.
        </p>
        <form action={devLogin} className="space-y-4">
          <input type="hidden" name="returnTo" value={returnTo} />
          <label className="block">
            <span className="label">Имя</span>
            <input name="name" required maxLength={60} className="input" placeholder="Например, Призрак" autoFocus />
          </label>
          <button type="submit" className="btn-primary w-full">Войти</button>
        </form>
        <div className="mt-6">
          <p className="label mb-2">Быстрый вход</p>
          <div className="flex flex-wrap gap-2">
            {PERSONAS.map((name) => (
              <form key={name} action={devLogin}>
                <input type="hidden" name="returnTo" value={returnTo} />
                <input type="hidden" name="name" value={name} />
                <button type="submit" className="btn-ghost text-sm">{name}</button>
              </form>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
