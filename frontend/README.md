# Frontend (Next.js 16)

Интерфейс Shadowrun DM Assistant: интерактивная карта на Leaflet, кабинет игрока, логи сессий.
Общая документация, настройка Auth0 и запуск описаны в [корневом README](../README.md).

```bash
cp .env.example .env.local   # Auth0 или AUTH_MODE=dev
npm install
npm run dev                  # http://localhost:3000
```

Структура:
- `src/proxy.ts` — подключает маршруты Auth0 (`/auth/login`, `/auth/callback`, `/auth/logout`).
- `src/app/api/backend/[...path]/route.ts` — BFF-прокси к Spring API, подставляет access token на сервере.
- `src/components/map/` — карта (`MapViewer`), иконки меток, панель и форма метки.
- `src/components/character/` — лист персонажа Shadowrun, броски кубиков, дневник.
