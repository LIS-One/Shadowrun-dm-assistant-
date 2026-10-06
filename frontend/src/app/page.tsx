import { redirect } from "next/navigation";
import { getCurrentUser, loginUrl } from "@/lib/session";

const FEATURES = [
  {
    title: "Интерактивные карты",
    text: "Загрузите карту города или района и работайте с ней как в Google Maps: зум, поиск, фильтры по типам меток.",
  },
  {
    title: "Секреты мастера",
    text: "Скрытые метки и тайные заметки видны только мастеру. Открывайте локации игрокам одним кликом, когда они их найдут.",
  },
  {
    title: "Кабинет игрока",
    text: "Лист персонажа Shadowrun с подсчётом мониторов и пулов, личный дневник героя и журнал прошедших сессий.",
  },
];

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/campaigns");

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.4em] text-accent">{"// jack in"}</p>
      <h1 className="text-4xl font-bold leading-tight sm:text-6xl">
        Shadowrun <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">DM Assistant</span>
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-slate-400">
        Рабочее место мастера настольных ролевых игр: карта мира с метками, тайны, которые игроки ещё не раскрыли,
        листы персонажей и логи прошедших забегов.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <a href={loginUrl()} className="btn-primary px-6 py-3 text-base">Войти</a>
        <a href={`${loginUrl()}&screen_hint=signup`} className="btn-ghost px-6 py-3 text-base">Регистрация</a>
      </div>
      <div className="mt-16 grid gap-4 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="panel p-5">
            <h2 className="mb-2 font-semibold text-slate-100">{f.title}</h2>
            <p className="text-sm text-slate-400">{f.text}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
