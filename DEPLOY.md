# Как запустить Shadowrun DM Assistant на своём сервере

Пошаговая инструкция для человека, который никогда не поднимал сайт. В конце у вас будет адрес вида
`https://dm.example.com`, а игроки будут заходить по ссылке-приглашению `https://dm.example.com/join/КОД`.

Инструкция рассчитана на **VPS OVHcloud (VPS-1: 2 vCore, 4 ГБ RAM, 40 ГБ)** с Ubuntu, на котором уже работает
что-то ещё (например, Telegram-бот), но подойдёт и для любого другого VPS с Ubuntu/Debian.

> Всё, что ниже в `моноширинном шрифте`, — команды или значения, их можно копировать как есть.
> Вместо `dm.example.com` везде подставляйте свой адрес, вместо `1.2.3.4` — IP своего сервера.

## Что понадобится и сколько это стоит

| Что | Зачем | Цена |
|---|---|---|
| Сервер (VPS) | там работает сайт | у вас уже есть OVHcloud VPS-1 |
| Домен или поддомен | адрес сайта и HTTPS-сертификат | ~11–15 $ в год (или бесплатный DuckDNS) |
| Аккаунт Auth0 | регистрация и вход игроков | бесплатно (Free-план) |
| ~1–2 часа | один раз | — |

Порядок действий:

1. [Подключиться к серверу и подготовить его](#шаг-1-подключиться-к-серверу-и-подготовить-его)
2. [Получить домен и направить его на сервер](#шаг-2-домен)
3. [Настроить Auth0 и получить ключи](#шаг-3-auth0-регистрация-и-вход-игроков)
4. [Скачать проект и заполнить `.env`](#шаг-4-скачать-проект-и-заполнить-env)
5. [Запустить](#шаг-5-запуск)
6. [Войти и пригласить игроков](#шаг-6-первый-вход-и-приглашение-игроков)
7. [Обслуживание: обновления и бэкапы](#обслуживание)
8. [Если что-то пошло не так](#если-что-то-пошло-не-так)

---

## Шаг 1. Подключиться к серверу и подготовить его

### 1.1. Подключение по SSH

Нужны IP-адрес сервера и логин. У OVHcloud на Ubuntu логин — `ubuntu`, вход под `root` по умолчанию отключён.
IP виден в панели OVHcloud (**Bare Metal Cloud → Virtual Private Servers → ваш VPS**), там же и в письме о
выдаче сервера.

**Windows 10/11** — откройте PowerShell, **macOS / Linux** — Терминал:

```bash
ssh ubuntu@1.2.3.4
```

Вы уже заходите туда, чтобы управлять ботом, так что этот шаг вам знаком. Все дальнейшие команды
выполняются на сервере.

Пара мелочей о терминале:

- вставить скопированную команду: в PowerShell — `Ctrl+V` или правая кнопка мыши, в macOS — `Cmd+V`;
- если `sudo` спросит пароль — это пароль пользователя `ubuntu`; при вводе символы не отображаются, так и должно быть;
- многие команды при успехе ничего не печатают. Насторожиться стоит, если в выводе есть `error`, `failed`,
  `denied` или `not found`.

### 1.2. Проверить, не заняты ли порты 80 и 443

Сайту нужны стандартные веб-порты 80 и 443. Если бот работает в режиме *webhook*, их мог уже занять
веб-сервер (обычно nginx). Проверьте:

```bash
sudo ss -tulnp | grep -E ':(80|443)\s'
```

- **Пусто** — порты свободны, идёте по основной инструкции (вариант **A**, со встроенным HTTPS через Caddy).
- **В строках `nginx`** — порты занимает ваш nginx. Ничего не ломайте: используйте вариант **B**
  в [шаге 5](#вариант-b-порты-80443-уже-заняты-nginx), где сайт подключается к этому nginx.
- **В строках `caddy`** (Caddy установлен прямо на сервере) — сделайте пункт 1 варианта B, а вместо пунктов 2–4
  допишите в конец `/etc/caddy/Caddyfile` (`sudo nano /etc/caddy/Caddyfile`)
  ```
  dm.example.com {
      reverse_proxy 127.0.0.1:3000
  }
  ```
  и выполните `sudo systemctl reload caddy` — сертификат Caddy получит сам.
- **В строках `docker-proxy`** — порты опубликовал какой-то Docker-контейнер (посмотрите `docker ps`), **`apache2`
  или что-то ещё** — эта инструкция как есть не подойдёт. Не запускайте сайт, пока не выясните, что держит порты.

Заодно проверьте свободное место: `df -h /` — в колонке `Avail` нужно хотя бы 8 ГБ (сайт занимает около 2 ГБ,
плюс временные файлы сборки).

### 1.3. Поставить Docker

> Все команды этой инструкции выполняйте в обычной SSH-сессии, **не** внутри `screen`/`tmux`, где запущен бот.

Сначала проверьте, нет ли Docker уже (например, если бот запущен в нём):

```bash
docker --version
docker compose version
```

- **Обе команды показали версии** — Docker уже есть, ставить его не нужно. Переходите к проверке под списком.
- **`docker --version` работает, а `docker compose version` — нет** (Docker ставили из пакетов Ubuntu) — ничего
  не удаляйте, чтобы не задеть бота, просто доставьте плагин compose:
  ```bash
  sudo apt update && sudo apt -y install docker-compose-v2
  ```
- **Docker нет совсем** — установите его официальным способом
  ([docs.docker.com](https://docs.docker.com/engine/install/ubuntu/)), команды можно вставить разом:
  ```bash
  sudo apt update
  sudo apt -y install ca-certificates curl
  sudo install -m 0755 -d /etc/apt/keyrings
  sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  sudo chmod a+r /etc/apt/keyrings/docker.asc
  sudo tee /etc/apt/sources.list.d/docker.sources <<EOF
  Types: deb
  URIs: https://download.docker.com/linux/ubuntu
  Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
  Components: stable
  Architectures: $(dpkg --print-architecture)
  Signed-By: /etc/apt/keyrings/docker.asc
  EOF
  sudo apt update
  sudo apt -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  ```
  Если на сервере Debian, а не Ubuntu, в адресах замените `ubuntu` на `debian`
  ([инструкция для Debian](https://docs.docker.com/engine/install/debian/)). Узнать систему: `cat /etc/os-release`.

**Во всех трёх случаях** проверьте, что Docker работает без `sudo`:

```bash
docker ps
```

Если команда напечатала таблицу (пусть даже пустую) — всё в порядке. Если `permission denied ... docker.sock` —
разрешите своему пользователю запускать Docker, затем **выйдите и зайдите по SSH заново** и повторите `docker ps`:

```bash
sudo usermod -aG docker $USER
exit
```

### 1.4. Файл подкачки (swap)

Сборка сайта ненадолго требует около 1.5 ГБ памяти, а рядом работает бот. Файл подкачки — страховка от
нехватки памяти. Проверьте, есть ли он:

```bash
sudo swapon --show
```

Если команда ничего не вывела, создайте файл подкачки на 2 ГБ (последнюю строку выполняйте только один раз):

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Если `swapon` ругается на файл, создайте его иначе и повторите `chmod`, `mkswap` и `swapon`:
`sudo dd if=/dev/zero of=/swapfile bs=1M count=2048`.

### 1.5. Файрвол

Проверьте, включён ли файрвол Ubuntu:

```bash
sudo ufw status
```

- `Status: inactive` — ничего делать не нужно.
- `Status: active` — откройте веб-порты (SSH уже должен быть разрешён, иначе вы бы не зашли):
  ```bash
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw allow 443/udp
  ```

Также загляните в панель OVHcloud: **Network → Public IP Addresses** → у IPv4 вашего сервера кнопка `⁝` →
**Configure Edge Network Firewall**. Если правил там нет — ничего делать не нужно. Если правила есть, в них должны
быть разрешены входящие TCP 80 и 443 — даже когда файрвол выключен: при DDoS-атаке OVHcloud включает его сам.

> ⚠️ Важная особенность Docker: порты, которые публикует Docker, **обходят ufw**. Поэтому в нашем
> `docker-compose.prod.yml` наружу опубликованы только 80 и 443 (Caddy), а база данных и API доступны лишь
> внутри Docker. Не добавляйте туда `ports:` для `db` и `backend`.

---

## Шаг 2. Домен

Сайту нужен адрес: без него не получить HTTPS-сертификат, а Auth0 работает только по HTTPS.

### Вариант 1 (рекомендую): свой домен

Купите домен `.com` у любого регистратора:

- **OVHcloud** (**Web Cloud → Domain names → Order a domain name**) — удобно, всё в том же аккаунте и панели, что и сервер;
- **Cloudflare Registrar** — продаёт по себестоимости (`.com` ≈ 11 $ в год), но DNS тогда обязательно
  ведётся в Cloudflare (см. примечание ниже);
- Namecheap, Porkbun — тоже подойдут.

> Сравнивайте **цену продления**, а не первого года: например, `.xyz` за 1–2 $ в первый год потом стоит 13–21 $
> в год. Данные владельца на английском (латиницей), оплата — картой Visa/Mastercard или PayPal.
> После покупки обязательно подтвердите email владельца домена: неподтверждённые домены регистраторы отключают.

Сайт удобно повесить на **поддомен**, например `dm.вашдомен.com`: сам домен останется свободным для чего-то ещё.

Создайте у регистратора DNS-запись типа **A**:

| Поле | Значение |
|---|---|
| Тип | `A` |
| Имя / поддомен / host | `dm` |
| Значение / цель | IP вашего сервера, например `1.2.3.4` |
| TTL | по умолчанию |

- **OVHcloud**: **Web Cloud → DNS zones → ваш домен** (или **Domain names → ваш домен → вкладка DNS zone**) →
  **Add an entry** → тип **A** → в поле **Sub-domain** впишите `dm`, в **Target** — IP сервера → **Next** →
  **Confirm** ([инструкция OVHcloud](https://docs.ovhcloud.com/en/guides/web-cloud/domains/dns-zone-a-record-creation)).
- **Cloudflare**: **DNS → Records → Add record**, Type `A`, Name `dm`, IPv4 — IP сервера, и **обязательно
  переключите облачко в серое «DNS only»** (по умолчанию оно оранжевое «Proxied»). С оранжевым облаком сертификат
  может не выпуститься, а режим SSL «Flexible» даёт бесконечную переадресацию.

> Не добавляйте запись `AAAA` (IPv6), если не уверены, что IPv6 на сервере настроен: при неработающем IPv6
> Let's Encrypt не сможет выдать сертификат.

Проверьте, что запись заработала (обычно от нескольких минут до получаса), — с вашего компьютера:

```bash
nslookup dm.example.com 8.8.8.8
```

В ответе должен быть IP вашего сервера. Можно проверить и на сайте [dnschecker.org](https://dnschecker.org).
**Не запускайте сайт, пока DNS не показывает правильный IP**: неудачные попытки получить сертификат
ограничены (5 в час), и Caddy начнёт ждать всё дольше между попытками.

### Вариант 2: бесплатный поддомен DuckDNS

Если не хочется платить: зайдите на [duckdns.org](https://www.duckdns.org) через Google или GitHub, придумайте имя
(например, `mydm`), нажмите **add domain**, впишите IP сервера в поле **current ip** и нажмите **update ip**.
Ваш адрес будет `mydm.duckdns.org` — используйте его везде вместо `dm.example.com`. Сертификат выпустится так же
автоматически. Минусы: адрес выглядит менее солидно, и у сервиса нет гарантий работы.

---

## Шаг 3. Auth0: регистрация и вход игроков

Auth0 — сервис, который берёт на себя регистрацию, пароли, «Войти через Google» и восстановление пароля.
Бесплатный план — до 25 000 активных пользователей в месяц, для игровой группы это с огромным запасом.
Панель Auth0 только на английском, поэтому ниже названия кнопок приведены как есть.

В итоге вам нужно получить **4 значения**: домен тенанта (Domain), Client ID, Client Secret и идентификатор API.

> ⚠️ **Бесплатный тенант удаляется, если в нём 150 дней подряд никто не входил.** Если между кампаниями бывают
> долгие перерывы, заходите на сайт хотя бы раз в пару месяцев.

### 3.1. Аккаунт и тенант

1. Зарегистрируйтесь на [auth0.com/signup](https://auth0.com/signup) — бесплатно, карта не нужна.
2. Auth0 создаст **tenant** (ваше «пространство»). Во время регистрации отметьте галочку расширенных настроек
   (что-то вроде *«I want to change my tenant domain and region»*), чтобы самому выбрать:
   - **Region**: **EU** — ближе всего к Израилю;
   - **Tenant domain**: короткое имя латиницей, например `shadowrun-dm`.

   Домен тенанта получится вида `shadowrun-dm.eu.auth0.com`. **Имя и регион потом поменять нельзя.** Если Auth0
   не спросил и сам назначил регион US — ничего страшного, всё будет работать.
3. **Settings → General → Assign Environment Tag**: выберите **Production** и нажмите **Save**.

### 3.2. API (то, что проверяет вход на сервере)

1. **Applications → APIs → + Create API**.
2. **Name**: `DM Assistant API`.
3. **Identifier**: `https://dm-assistant/api` — ровно так, без `/` на конце. Это не адрес сайта, а просто имя, и
   **менять его потом нельзя**.
4. **JSON Web Token (JWT) Profile**: `Auth0`; **JSON Web Token (JWT) Signing Algorithm**: **`RS256`**.
5. Если в форме есть поле **Access Policy for Applications within user flow** — выберите вариант, который
   разрешает доступ всем приложениям (не «via client-grant» и не «Deny»). **Create**.
6. В созданном API откройте вкладку **Settings**:
   - блок **Application Access Policy** (если он есть): **User-Delegated Access** = **All apps allowed** (не
     **Per-app authorization** и не **No apps allowed**); **Client Access** не трогайте;
   - блок **Access Settings**: включите **Allow Offline Access**. Без этого сайт перестаёт «узнавать» игрока
     через сутки после входа, даже посреди игры.

   Нажмите **Save**.

### 3.3. Приложение (сам сайт)

1. **Applications → Applications → + Create Application** (если спросят — **Create it manually**).
2. **Name**: `DM Assistant`, тип — **Regular Web Applications**. **Create**.
   Если откроется вкладка **Quick Start** с выбором технологии — просто перейдите на вкладку **Settings**.
3. На вкладке **Settings**, блок **Basic Information**, скопируйте себе:
   - **Domain** — например `shadowrun-dm.eu.auth0.com`;
   - **Client ID**;
   - **Client Secret** (кнопка с глазом / копирования). Это секрет — никому не показывайте.
4. Ниже, в блоке **Application URIs**, заполните (подставьте свой адрес, **без** `/` в конце):
   - **Application Login URI**: `https://dm.example.com/auth/login`
   - **Allowed Callback URLs**: `https://dm.example.com/auth/callback`
   - **Allowed Logout URLs**: `https://dm.example.com`
   - **Allowed Web Origins** можно оставить пустым.
5. Внизу страницы нажмите **Save Changes**.
6. Там же, в **Advanced Settings → Grant Types**, проверьте, что отмечены **Authorization Code** и
   **Refresh Token** (по умолчанию так и есть).

### 3.4. Регистрация игроков и вход через Google

1. **Authentication → Database → Username-Password-Authentication**: внизу страницы настройка
   **Disable Sign Ups** должна быть **выключена** — иначе игроки не смогут зарегистрироваться.
2. **Applications → Applications → DM Assistant → Connections**: включите `Username-Password-Authentication`
   (вход по почте и паролю) и, если хотите, `google-oauth2` («Войти через Google»).

> Кнопка «Войти через Google» сразу работает на тестовых ключах Auth0. Для игровой группы этого достаточно,
> хотя Google будет показывать логотип Auth0. Если захочется «по-взрослому», в
> [документации Auth0](https://auth0.com/docs/authenticate/identity-providers/social-identity-providers/google)
> описано, как подключить собственные ключи Google.

Письма с подтверждением почты и сбросом пароля Auth0 отправляет сам (с адреса `no-reply@auth0user.net`) —
настраивать почту не нужно. Эти письма часто попадают в «Спам»; подтверждать почту, чтобы войти на сайт,
не обязательно. Игрокам с Gmail проще всего нажимать «Войти через Google».

### 3.5. Русский язык и оформление страницы входа (по желанию)

- **Settings → General → Languages**: в **Default Language** выберите **Russian**, в **Supported Languages**
  оставьте Russian (и English, если нужно). **Save**. Сайт сам просит Auth0 показывать страницы на русском.
- **Settings → General → Friendly Name** — название, которое увидят игроки (например, `Shadowrun DM`).
- **Branding → Universal Login → Customization Options** — цвета, логотип, фон. Для стиля сайта подойдут
  кнопки цвета `#3DFF9E` и тёмный фон `#05080A`. Нажмите **Save and Publish**.

> Если кто-то из игроков живёт в России: для России в целом у Auth0 ограничений нет, но вход из Крыма, Донецкой и
> Луганской областей Auth0 блокирует (санкции США). Кроме того, на мобильном интернете в России сейчас часто
> действуют «белые списки», и зарубежные сайты (и ваш, и Auth0) могут не открываться вовсе. Попросите такого игрока заранее, до первой игры, зарегистрироваться и проверить вход —
> и через домашний Wi-Fi, и через мобильный интернет.

---

## Шаг 4. Скачать проект и заполнить `.env`

На сервере (если `git --version` пишет «command not found», сначала выполните `sudo apt -y install git`):

```bash
cd ~
git clone https://github.com/LIS-One/Shadowrun-dm-assistant-.git dm-assistant
cd dm-assistant
[ -f .env ] || cp .env.production.example .env
sed -i "s/^DB_PASSWORD=$/DB_PASSWORD=$(openssl rand -hex 24)/" .env
sed -i "s/^AUTH0_SECRET=$/AUTH0_SECRET=$(openssl rand -hex 32)/" .env
```

Последние три строки создают файл настроек `.env` и сами вписывают в него два случайных секрета — пароль базы
данных и ключ шифрования сессий. Повторный запуск ничего не испортит: заполненный `.env` они не трогают (а
`git clone` в этом случае просто напишет `already exists`).

Откройте файл настроек в простом редакторе:

```bash
nano .env
```

и заполните оставшиеся пустые поля. Должно получиться примерно так:

```ini
COMPOSE_FILE=docker-compose.prod.yml
DOMAIN=dm.example.com
DB_PASSWORD=3f9c0d…
AUTH0_DOMAIN=shadowrun-dm.eu.auth0.com
AUTH0_AUDIENCE=https://dm-assistant/api
AUTH0_CLIENT_ID=скопированный_Client_ID
AUTH0_CLIENT_SECRET=скопированный_Client_Secret
AUTH0_SECRET=8b1e77…
```

Строки `DB_PASSWORD` и `AUTH0_SECRET` уже заполнены командами выше — их не трогайте.

Откуда что брать:

| Поле в `.env` | Где взять |
|---|---|
| `DOMAIN` | ваш адрес из шага 2, например `dm.example.com` |
| `DB_PASSWORD` | вписан автоматически — не меняйте |
| `AUTH0_DOMAIN` | Auth0 → Applications → DM Assistant → Settings → **Domain** |
| `AUTH0_AUDIENCE` | Auth0 → Applications → APIs → DM Assistant API → **Identifier** (уже вписано: `https://dm-assistant/api`) |
| `AUTH0_CLIENT_ID` | Auth0 → Applications → DM Assistant → Settings → **Client ID** |
| `AUTH0_CLIENT_SECRET` | там же, **Client Secret** |
| `AUTH0_SECRET` | вписан автоматически |

Правила:

- Строку `COMPOSE_FILE` не трогайте (её меняют только в варианте B шага 5): благодаря ей все команды ниже
  короткие — `docker compose ...`.
- `DOMAIN` и `AUTH0_DOMAIN` — **без** `https://` и без `/` в конце.
- Без пробелов вокруг `=` и без кавычек.
- `DB_PASSWORD` задаётся **один раз**: база запоминает пароль при первом запуске, и если потом поменять его в
  `.env`, сайт перестанет подключаться к базе (как это исправить — в разделе
  [«Если что-то пошло не так»](#если-что-то-пошло-не-так)).

Сохранить в nano: `Ctrl+O`, `Enter`, выйти: `Ctrl+X`. Затем закройте файл от чужих глаз:

```bash
chmod 600 .env
```

Файл `.env` содержит секреты — не публикуйте его и сохраните копию у себя (см. [«Бэкапы»](#бэкапы)).

> Все команды `docker compose` дальше выполняйте **из папки проекта** (`cd ~/dm-assistant`): только там
> Docker видит `.env`.

---

## Шаг 5. Запуск

### Вариант A: порты 80/443 свободны (обычный случай)

Убедитесь, что DNS из шага 2 уже указывает на сервер (`nslookup`), и запустите:

```bash
docker compose up -d --build
```

Первая сборка занимает 5–15 минут. Затем проверьте, что всё поднялось:

```bash
docker compose ps
```

Должны быть **четыре** сервиса — `db`, `backend`, `frontend`, `caddy` — со статусом `Up` (у `db` — `Up (healthy)`).
Через минуту-две Caddy сам получит HTTPS-сертификат (в `docker compose logs caddy` появится
`certificate obtained successfully`). Откройте `https://dm.example.com` — должна появиться главная страница
с надписью **SHADOWRUN**. Если в первые 1–2 минуты браузер показывает `502` или ошибку сертификата — просто
подождите и обновите страницу.

Если что-то не так, смотрите логи:

```bash
docker compose logs --tail 50 caddy      # сертификат и HTTPS
docker compose logs --tail 50 frontend   # сайт и вход
docker compose logs --tail 50 backend    # API
```

(чтобы следить за логами в реальном времени, добавьте `-f`; выход — `Ctrl+C`). Расшифровка частых ошибок —
в разделе [«Если что-то пошло не так»](#если-что-то-пошло-не-так).

После первой сборки можно освободить место на диске: `docker builder prune -f`.

### Вариант B: порты 80/443 уже заняты (nginx)

Если в шаге 1.2 вы увидели nginx, сайт запускается без своего Caddy и слушает только `127.0.0.1:3000`, а ваш nginx
отдаёт его наружу и получает сертификат через certbot.

1. Проверьте, свободен ли порт 3000: `sudo ss -tlnp | grep -E ':3000\s'`. Если вывод не пустой (порт занят,
   например, ботом), добавьте в `.env` строку `FRONTEND_PORT=3001` и ниже в конфиге nginx везде пишите `3001`
   вместо `3000`.

   В `.env` замените строку `COMPOSE_FILE` на:
   ```ini
   COMPOSE_FILE=docker-compose.prod.yml:docker-compose.behind-proxy.yml
   ```
   и запустите:
   ```bash
   docker compose up -d --build
   ```
   `docker compose ps` должен показать **три** сервиса: `db`, `backend`, `frontend` (Caddy в этом варианте не нужен).
2. Создайте конфиг nginx:
   ```bash
   sudo nano /etc/nginx/sites-available/dm-assistant
   ```
   ```nginx
   server {
       listen 80;
       server_name dm.example.com;

       # Карты загружаются размером до 50 МБ.
       client_max_body_size 60m;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }
   ```
3. Включите его и проверьте конфиг:
   ```bash
   sudo ln -s /etc/nginx/sites-available/dm-assistant /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```
4. Получите сертификат (certbot сам допишет HTTPS в конфиг и будет продлевать его):
   ```bash
   sudo apt -y install certbot python3-certbot-nginx
   sudo certbot --nginx -d dm.example.com
   ```

Все остальные команды из этой инструкции в варианте B такие же, кроме тех, что касаются `caddy`: его здесь нет,
HTTPS обслуживают nginx и certbot. Если сертификат не выпустился — повторите `sudo certbot --nginx -d dm.example.com`
и прочитайте, что он пишет (статус сертификатов: `sudo certbot certificates`). Ошибки nginx: `sudo nginx -t` и
`sudo tail -n 50 /var/log/nginx/error.log`.

---

## Шаг 6. Первый вход и приглашение игроков

1. Откройте `https://dm.example.com` → **Регистрация** (сразу откроется форма регистрации Auth0) и создайте
   аккаунт — или войдите через Google. Если аккаунт уже есть — **Войти в сеть**.
2. **+ Кампания** — вы станете её **владельцем**.
3. Загрузите карту: **+ Загрузить карту** (PNG/JPEG/GIF/WebP до 50 МБ).
4. Вкладка **Команда** → **Поделиться** (на телефоне откроется меню отправки в Telegram/WhatsApp) или **Ссылка**
   (скопирует ссылку вида `https://dm.example.com/join/ABCD2345EF`).
5. Игрок открывает ссылку, регистрируется и нажимает **Присоединиться** — он в кампании как игрок.
6. Если кто-то из игроков будет вести игру вместе с вами — на вкладке **Команда** смените ему роль на **Мастер**.

> На сайте может зарегистрироваться любой, у кого есть адрес, но чужие кампании без ссылки-приглашения он не
> увидит. Если ссылка утекла — на вкладке **Команда** нажмите **Сгенерировать новый код**: старые ссылки перестанут
> работать. Когда все игроки зарегистрировались, можно закрыть регистрацию по почте и паролю: в Auth0 включите
> **Disable Sign Ups** (шаг 3.4). Через «Войти через Google» новый аккаунт всё равно можно будет создать — это не
> опасно: без ссылки-приглашения чужие кампании не видны.

---

## Обслуживание

Все команды выполняются в папке проекта: `cd ~/dm-assistant`.

### Обновление до новой версии

```bash
git pull
docker compose up -d --build
docker builder prune -f
```

Данные (кампании, карты, персонажи) при этом сохраняются: они лежат в Docker-томах, а не в контейнерах.

> ⚠️ Никогда не запускайте `docker compose down -v` — флаг `-v` **удаляет все данные**.
> И не меняйте в `docker-compose.prod.yml` версию `postgres:16-alpine` на другую основную (17, 18…): новая версия
> не откроет старую базу. Переход на новую версию PostgreSQL делается только через бэкап и восстановление.

### Бэкапы

```bash
bash scripts/backup.sh
```

Скрипт создаёт папку `backups/<дата>/` с дампом базы (`database.sql.gz`) и архивом карт (`maps.tar.gz`), а бэкапы
старше 14 дней удаляет сам. Запустите его один раз вручную: в конце должна быть строка `Backup written to ...`.

Чтобы бэкап делался автоматически каждую ночь, выполните `crontab -e` (если спросит редактор — выберите `1`, nano)
и добавьте в конец строку (путь поправьте, если папка другая):

```
0 1 * * * cd /home/ubuntu/dm-assistant && mkdir -p backups && bash scripts/backup.sh >> backups/cron.log 2>&1
```

Сохраните (`Ctrl+O`, `Enter`, `Ctrl+X`). Часы на сервере обычно идут по UTC (проверить: `date`), так что `0 1`
— это 1:00 по UTC, то есть 3:00–4:00 ночи по Израилю. На следующий день проверьте: `ls ~/dm-assistant/backups`
(появилась папка с новой датой) и `tail ~/dm-assistant/backups/cron.log` (в конце `Backup written to ...`).

Бэкап на том же сервере не спасёт, если пропадёт сам сервер, поэтому время от времени скачивайте его к себе.
На вашем компьютере (PowerShell или Терминал) один раз создайте папку: `mkdir dm-backups`. Потом каждый раз:

```bash
scp -r ubuntu@1.2.3.4:dm-assistant/backups dm-backups/
scp ubuntu@1.2.3.4:dm-assistant/.env dm-backups/env.txt
```

Бэкапы окажутся в `dm-backups/backups/<дата>/` (на Windows папка `dm-backups` лежит в `C:\Users\<ваше имя>`).
Если вы заходите на сервер через PuTTY, а не через PowerShell, скачивайте папку программой WinSCP.

Вторая команда сохраняет `.env` — без него восстановить сайт на новом сервере сложнее. Храните эту копию как
пароль.

Дополнительная страховка — копии всего сервера (вместе с ботом) в панели OVHcloud: ваш VPS → вкладка
**Automated backup**. У VPS, заказанных после 7 августа 2025, одна ежедневная копия (хранится сутки) входит в цену —
проверьте там, что она активна. Платно — **Premium**-бэкап (копии за 7 дней) и **Snapshot** (ручной снимок, удобно
делать перед крупными изменениями). У VPS, заказанных раньше, Automated Backup — платная опция.

### Восстановление из бэкапа

**На том же сервере** (откатиться на вчерашние данные): посмотрите список бэкапов и запустите восстановление,
подставив нужную папку:

```bash
ls backups
bash scripts/restore.sh backups/2026-10-09_01-00
```

Скрипт проверит файлы бэкапа, попросит подтвердить (введите `yes`), **сначала сохранит текущие данные** отдельным
бэкапом, затем заменит базу и карты и перезапустит сайт. В конце будет строка `Restored from ...`.

**На новом сервере:**

1. Пройдите шаг 1. В шаге 2 **измените** IP в существующей A-записи на IP нового сервера.
2. **Шаг 3 пропустите** — нужен тот же тенант Auth0, что и раньше. Аккаунты игроков привязаны к нему: в новом
   тенанте у всех будут новые ID, и восстановленные кампании окажутся «ничьими». Если адрес сайта поменялся,
   обновите адреса в Auth0 (шаг 3.3, п. 4).
3. В шаге 4 выполните только `git clone` и `cd dm-assistant`, а затем на сервере `mkdir -p backups`.
   С вашего компьютера загрузите сохранённый `.env` и нужный бэкап (папку подставьте свою):
   ```bash
   scp dm-backups/env.txt ubuntu@НОВЫЙ_IP:dm-assistant/.env
   scp -r dm-backups/backups/2026-10-09_01-00 ubuntu@НОВЫЙ_IP:dm-assistant/backups/
   ```
   На сервере: `chmod 600 .env`.
4. Шаг 5 (запуск), затем `bash scripts/restore.sh backups/2026-10-09_01-00`.

### Полезные команды

| Что | Команда |
|---|---|
| Состояние сервисов | `docker compose ps` |
| Логи сервиса | `docker compose logs -f --tail 100 backend` |
| Применить изменения `.env` | `docker compose up -d` |
| Перезапустить сервис (без изменений настроек) | `docker compose restart frontend` |
| Остановить / снова запустить всё | `docker compose stop` / `docker compose start` |
| Место на диске | `df -h` и `docker system df` |
| Почистить старые образы | `docker image prune -f && docker builder prune -f` |

- После перезагрузки сервера всё поднимается само (`restart: unless-stopped`). Исключение — если вы
  остановили сайт командой `stop`: тогда он останется выключенным, пока вы не выполните `start`.
- `restart` **не** подхватывает изменения `.env` — для этого нужен `docker compose up -d`.

---

## Если что-то пошло не так

Начните с `docker compose ps` и логов нужного сервиса: `docker compose logs --tail 100 caddy` (или `frontend`,
`backend`; в варианте B Caddy нет — см. конец шага 5).

| Симптом | Причина и решение |
|---|---|
| Браузер пишет «сайт не найден» | DNS ещё не обновился или запись A неверная. Проверьте `nslookup dm.example.com 8.8.8.8`. |
| Сайт не открывается по HTTPS, ошибка сертификата | Смотрите `docker compose logs caddy`. `NXDOMAIN` — нет DNS-записи для домена; `Timeout during connect (likely firewall problem)` — закрыты порты 80/443 (ufw, Edge Network Firewall OVHcloud). Исправив причину, выполните `docker compose restart caddy`. |
| `docker compose up` напечатал `address already in use` или `port is already allocated`, в `docker compose ps` нет `caddy` | Порт 80/443 занят другой программой: `sudo ss -tulnp \| grep -E ':(80\|443)\s'`, дальше — шаг 1.2. В варианте B, если речь о порте 3000, — `FRONTEND_PORT` (шаг 5, вариант B, п. 1). Затем `docker compose up -d`. |
| `permission denied while trying to connect to the Docker daemon socket` (или `... docker.sock`) | Ваш пользователь не в группе `docker`: `sudo usermod -aG docker $USER`, затем выйдите и зайдите по SSH заново (шаг 1.3). |
| В логах Caddy `too many failed authorizations` / `rateLimited` | Слишком много неудачных попыток получить сертификат. Исправьте причину и подождите час. |
| `docker compose ps` показывает не те сервисы (нет `caddy` в варианте A) | Команда запущена не из папки `~/dm-assistant`, в `.env` нет строки `COMPOSE_FILE` (шаг 4) или порты 80/443 заняты (см. вывод `docker compose up`). |
| `502 Bad Gateway` | Фронт или API ещё стартуют (подождите минуту) или упали — смотрите `logs frontend` и `logs backend`. |
| `backend` в `docker compose ps` в статусе `Restarting`, в логах `password authentication failed for user "dm_assistant"` | `DB_PASSWORD` в `.env` поменяли после первого запуска. Верните прежнее значение или задайте базе новый пароль — тот, что сейчас в `.env`: `docker compose exec db psql -U dm_assistant -d dm_assistant -c "ALTER USER dm_assistant PASSWORD 'пароль_из_.env';"`, затем `docker compose restart backend`. |
| `docker compose` пишет `required variable ... is missing a value` | В `.env` не заполнено указанное поле. |
| Auth0: **Callback URL mismatch** | В Auth0 → Applications → DM Assistant → **Allowed Callback URLs** должно быть точно `https://ваш-домен/auth/callback`, а `DOMAIN` в `.env` — тот же адрес. |
| Auth0: **Service not found: https://dm-assistant/api** | Identifier API в Auth0 не совпадает с `AUTH0_AUDIENCE` в `.env`. |
| `The state parameter is invalid.` | Вход начался на одном адресе, а закончился на другом (например, открыли сайт по IP или с `www.`), или браузер блокирует cookie. Откройте сайт ровно по адресу из `DOMAIN` и войдите заново. |
| После нажатия «Войти в сеть» белая страница `An error occurred while trying to initiate the login request.` | Сайт не может связаться с Auth0, в `docker compose logs frontend` будет `An error occurred while performing the discovery request`. Почти всегда это опечатка в `AUTH0_DOMAIN` (имя тенанта или регион, например пропущен `.eu`). Скопируйте **Domain** заново из Auth0 → Applications → DM Assistant → Settings, затем `docker compose up -d`. |
| Ошибка на странице Auth0: `invalid_request: Unknown client` / `The client with id ... was not found` | Неверный `AUTH0_CLIENT_ID` в `.env`. Скопируйте заново, затем `docker compose up -d`. |
| `An error occurred while trying to exchange the authorization code.` | Неверный `AUTH0_CLIENT_SECRET` в `.env` (в Auth0 → **Monitoring → Logs** будет `Failed Exchange` / `Unauthorized`). Скопируйте Client Secret заново целиком, затем `docker compose up -d`. |
| `An error occurred during the authorization flow.` | Auth0 вернул ошибку — её текст есть в адресной строке (`error_description=...`) и в Auth0 → **Monitoring → Logs**. Например, `Service not found` — см. строку выше про `AUTH0_AUDIENCE`; `access_denied` — вход запрещён настройками Auth0 (проверьте шаг 3.2, п. 5–6, и шаг 3.4). |
| Вход прошёл, но сайт снова и снова отправляет на страницу входа или пишет «Not signed in» | Выполните `docker compose logs backend \| grep "Rejected access token"`. `The iss claim is not valid` — неверный `AUTH0_DOMAIN`; `The aud claim is not valid` — `AUTH0_AUDIENCE` не совпадает с Identifier API (шаг 3.2). После правки `.env`: `docker compose up -d`. |
| Игрок не может зарегистрироваться | Проверьте (шаг 3.4): в Authentication → Database → Username-Password-Authentication настройка **Disable Sign Ups** должна быть **выключена**, а в Applications → Applications → DM Assistant → вкладка **Connections** — включено `Username-Password-Authentication` (и `google-oauth2`, если нужен вход через Google). |
| Не приходит письмо от Auth0 | Проверьте «Спам». Для входа на сайт подтверждать почту не обязательно; можно войти через Google. |
| Сборка падает с `Killed` / нехватка памяти | Создайте swap (шаг 1.4) и повторите. |
| Закончилось место на диске | `docker builder prune -f`, `docker image prune -f`, удалите старые бэкапы. |

После любого изменения `.env` применяйте его: `docker compose up -d`.

---

## Что где лежит

| Файл | Назначение |
|---|---|
| `docker-compose.prod.yml` | продакшн-запуск: база, API, сайт, Caddy (HTTPS) |
| `docker-compose.behind-proxy.yml` | вариант для сервера, где порты 80/443 уже занимает nginx |
| `caddy/Caddyfile` | настройка HTTPS (обычно трогать не нужно) |
| `.env` | ваши настройки и секреты (создаётся из `.env.production.example`) |
| `scripts/backup.sh` | бэкап базы и карт |
| `scripts/restore.sh` | восстановление из бэкапа |
