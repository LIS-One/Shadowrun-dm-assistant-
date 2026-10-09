import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { IconId, IconLock, IconMap } from "@/components/icons";
import { getCurrentUser, loginUrl } from "@/lib/session";

const FEATURES = [
  {
    icon: IconMap,
    title: "AR-карта района",
    text: "Загрузите карту метроплекса и ведите её как в Google Maps: зум, поиск, фильтры, метки разных форм и цветов.",
  },
  {
    icon: IconLock,
    title: "Тайны мастера",
    text: "Скрытые локации и заметки видит только мастер. Раннеры нашли убежище — откройте метку одним касанием.",
  },
  {
    icon: IconId,
    title: "Кабинет раннера",
    text: "Лист персонажа по правилам 20th Anniversary Edition: мониторы, пулы, Грань, броня, импланты, дневник и логи забегов.",
  },
];

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/campaigns");

  return (
    <main className="relative mx-auto flex min-h-[100dvh] max-w-5xl flex-col px-5 pt-[calc(1.5rem+var(--safe-top))] pb-[calc(2rem+var(--safe-bottom))]">
      <Logo href="/" />

      <section className="flex flex-1 flex-col justify-center py-14">
        <p className="kicker cursor-blink">{"> jack in // Seattle 2072"}</p>
        <h1 className="mt-4 text-5xl leading-[0.95] sm:text-7xl">
          <span className="glitch glow text-accent" data-text="SHADOWRUN">SHADOWRUN</span>
          <span className="mt-2 block text-2xl text-slate-200 sm:text-4xl">DM Assistant</span>
        </h1>
        <p className="mt-6 max-w-xl text-base text-slate-400 sm:text-lg">
          Пульт мастера Шестого мира: карта с метками и тайнами, листы раннеров по правилам
          Shadowrun 20th Anniversary Edition и хроника забегов. Работает в браузере и на телефоне.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a href={loginUrl()} className="btn-primary px-8 py-3 text-sm">Войти в сеть</a>
          <a href={loginUrl("/campaigns", { signup: true })} className="btn-ghost px-8 py-3 text-sm">Регистрация</a>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="panel cut-corners hud-brackets p-5">
            <f.icon className="h-6 w-6 text-accent" />
            <h2 className="mt-3 text-base text-slate-100">{f.title}</h2>
            <p className="mt-2 text-sm text-slate-400">{f.text}</p>
          </div>
        ))}
      </section>
      <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-slate-600">
        Fan-made tool · Shadowrun is a trademark of its respective owners
      </p>
    </main>
  );
}
