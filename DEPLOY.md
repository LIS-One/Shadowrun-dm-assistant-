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
sudo ss -tlnp | grep -E ':(80|443)\s'
```

- **Пусто** — порты свободны, идёте по основной инструкции (вариант **A**, со встроенным HTTPS через Caddy).
- **Есть строки с `nginx`, `apache`, `caddy` и т.п.** — порты заняты. Ничего не ломайте: используйте вариант **B**
  в [шаге 5](#вариант-b-порты-80443-уже-заняты-nginx), где сайт подключается к вашему существующему nginx.

Заодно проверьте свободное место: `df -h /` — в колонке `Avail` нужно хотя бы 8 ГБ (сайт занимает около 2 ГБ,
плюс временные файлы сборки).

### 1.3. Поставить Docker

Сначала проверьте, нет ли Docker уже (например, если бот запущен в нём):

```bash
docker --version
docker compose version
```

- **Обе команды показали версии** — Docker есть, **пропустите этот пункт**.
- **`docker --version` работает, а `docker compose version` — нет** (Docker ставили из пакетов Ubuntu) — ничего
  не удаляйте, чтобы не задеть бота, просто доставьте плагин compose:
  ```bash
  sudo apt update && sudo apt -y install docker-compose-v2
  ```
- **Docker нет совсем** — установите его официальным способом
  ([docs.docker.com](https://docs.docker.com/engine/install/ubuntu/)), команды можно вставить разом:

```bash
sudo apt update
sudo apt -y install ca-certificates curl git
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

После установки разрешите своему пользователю запускать Docker без `sudo`, затем **выйдите и зайдите по SSH
заново**:

```bash
sudo usermod -aG docker $USER
exit
```

После повторного входа проверьте: `docker run --rm hello-world` должен напечатать «Hello from Docker!».

> Если на сервере Debian, а не Ubuntu, в адресах выше замените `ubuntu` на `debian`
> ([инструкция для Debian](https://docs.docker.com/engine/install/debian/)).
> Узнать систему: `cat /etc/os-release`.

Также понадобится `git` (обычно уже есть): `sudo apt -y install git`.

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

Также загляните в панель OVHcloud: если для IP сервера включён **Edge Network Firewall** с правилами, в них должны
быть разрешены входящие порты 80 и 443 (по умолчанию он выключен, и тогда ничего делать не нужно).

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

- **OVHcloud**: **Web Cloud → Domain names → ваш домен → вкладка DNS zone → Add an entry → A**
  ([инструкция OVHcloud](https://docs.ovhcloud.com/en/guides/web-cloud/domains/dns-zone-a-record-creation)).
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
5. Если на этой странице есть настройки **Access Policy** / **User-Delegated Access** — выберите
   **All apps allowed** (иначе сайту придётся отдельно выдавать доступ к API). **Create**.
6. В созданном API на вкладке **Settings**, раздел **Access Settings**: включите **Allow Offline Access** и
   нажмите **Save**. Без этого игроков будет выкидывать из аккаунта примерно раз в сутки.

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

> Если кто-то из игроков живёт в России: у Auth0 нет официальных ограничений для пользователей оттуда, но
> на мобильном интернете в России сейчас часто действуют «белые списки», и зарубежные сайты (и ваш, и Auth0) могут
> не открываться вовсе. Попросите такого игрока заранее, до первой игры, зарегистрироваться и проверить вход —
> и через домашний Wi-Fi, и через мобильный интернет.

---

## Шаг 4. Скачать проект и заполнить `.env`

На сервере:

```bash
cd ~
git clone https://github.com/LIS-One/Shadowrun-dm-assistant-.git dm-assistant
cd dm-assistant
cp .env.production.example .env
```

Сгенерируйте два случайных секрета — они понадобятся ниже:

```bash
openssl rand -hex 24   # пароль базы данных
openssl rand -hex 32   # ключ шифрования сессий
```

Откройте файл настроек в простом редакторе:

```bash
nano .env
```

и заполните пустые поля (пример):

```ini
COMPOSE_FILE=docker-compose.prod.yml
DOMAIN=dm.example.com
DB_PASSWORD=первая_строка_из_openssl
AUTH0_DOMAIN=shadowrun-dm.eu.auth0.com
AUTH0_AUDIENCE=https://dm-assistant/api
AUTH0_CLIENT_ID=скопированный_Client_ID
AUTH0_CLIENT_SECRET=скопированный_Client_Secret
AUTH0_SECRET=вторая_строка_из_openssl
```

Откуда что брать:

| Поле в `.env` | Где взять |
|---|---|
| `DOMAIN` | ваш адрес из шага 2, например `dm.example.com` |
| `DB_PASSWORD` | первая строка из `openssl` выше |
| `AUTH0_DOMAIN` | Auth0 → Applications → DM Assistant → Settings → **Domain** |
| `AUTH0_AUDIENCE` | Auth0 → Applications → APIs → DM Assistant API → **Identifier** (уже вписано: `https://dm-assistant/api`) |
| `AUTH0_CLIENT_ID` | Auth0 → Applications → DM Assistant → Settings → **Client ID** |
| `AUTH0_CLIENT_SECRET` | там же, **Client Secret** |
| `AUTH0_SECRET` | вторая строка из `openssl` выше |

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

1. В `.env` замените строку `COMPOSE_FILE` на:
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

Все остальные команды из этой инструкции в варианте B такие же.

---

## Шаг 6. Первый вход и приглашение игроков

1. Откройте `https://dm.example.com` → **Войти в сеть** → **Sign up**, зарегистрируйтесь.
2. **+ Кампания** — вы станете её **владельцем**.
3. Загрузите карту: **+ Загрузить карту** (PNG/JPEG/GIF/WebP до 50 МБ).
4. Вкладка **Команда** → **Поделиться** (на телефоне откроется меню отправки в Telegram/WhatsApp) или **Ссылка**
   (скопирует ссылку вида `https://dm.example.com/join/ABCD2345EF`).
5. Игрок открывает ссылку, регистрируется и нажимает **Присоединиться** — он в кампании как игрок.
6. Если кто-то из игроков будет вести игру вместе с вами — на вкладке **Команда** смените ему роль на **Мастер**.

> На сайте может зарегистрироваться любой, у кого есть адрес, но чужие кампании без ссылки-приглашения он не
> увидит. Если ссылка утекла — на вкладке **Команда** нажмите **Сгенерировать новый код**: старые ссылки перестанут
> работать. Когда все игроки зарегистрировались, можно вообще закрыть регистрацию: в Auth0 включите
> **Disable Sign Ups** (шаг 3.4).

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
старше 14 дней удаляет сам.

Чтобы бэкап делался автоматически каждую ночь, выполните `crontab -e` (если спросит редактор — выберите `1`, nano)
и добавьте в конец строку (путь поправьте, если папка другая):

```
0 1 * * * cd /home/ubuntu/dm-assistant && bash scripts/backup.sh >> backups/cron.log 2>&1
```

Сохраните (`Ctrl+O`, `Enter`, `Ctrl+X`). Часы на сервере обычно идут по UTC (проверить: `date`), так что `0 1`
— это 1:00 по UTC, то есть 3:00–4:00 ночи по Израилю.

Бэкап на том же сервере не спасёт, если пропадёт сам сервер, поэтому время от времени скачивайте его к себе.
С вашего компьютера (PowerShell или Терминал):

```bash
scp -r ubuntu@1.2.3.4:~/dm-assistant/backups ./dm-backups
scp ubuntu@1.2.3.4:~/dm-assistant/.env ./dm-backups/env.txt
```

Вторая команда сохраняет `.env` — без него восстановить сайт на новом сервере сложнее (придётся заново
настраивать ключи Auth0). Храните эту копию как пароль.

Дополнительная страховка — платные опции VPS в панели OVHcloud (**Snapshot** или **Automated Backup**): это снимок
всего сервера вместе с ботом. Снапшот удобно делать перед крупными изменениями на сервере.

### Восстановление из бэкапа

Например, на новом сервере: пройдите шаги 1–5 (в `.env` можно вписать значения из сохранённой копии), положите
папку бэкапа в `~/dm-assistant/backups/` и выполните, подставив нужную папку в первой строке:

```bash
B=backups/2026-10-09_01-00
docker compose stop backend frontend
docker compose exec -T db psql -v ON_ERROR_STOP=1 -U dm_assistant -d postgres \
  -c "DROP DATABASE IF EXISTS dm_assistant WITH (FORCE);" \
  -c "CREATE DATABASE dm_assistant OWNER dm_assistant TEMPLATE template0;"
gunzip -c $B/database.sql.gz | docker compose exec -T db \
  psql -q -v ON_ERROR_STOP=1 --single-transaction -U dm_assistant -d dm_assistant > /dev/null
docker compose run --rm --no-deps -T --user root -v "$(pwd)/$B:/backup" --entrypoint sh backend \
  -c 'tar xzf /backup/maps.tar.gz -C /data/maps'
docker compose start backend frontend
```

Если какая-то команда напечатала `ERROR`, остановитесь и разберитесь, прежде чем запускать следующие.

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
`backend`).

| Симптом | Причина и решение |
|---|---|
| Браузер пишет «сайт не найден» | DNS ещё не обновился или запись A неверная. Проверьте `nslookup dm.example.com 8.8.8.8`. |
| Сайт не открывается по HTTPS, ошибка сертификата | Смотрите `docker compose logs caddy`. `NXDOMAIN` — нет DNS-записи для домена; `Timeout during connect (likely firewall problem)` — закрыты порты 80/443 (ufw, Edge Network Firewall OVHcloud); `address already in use` — порты занял другой сервис (шаг 1.2, вариант B). Исправив причину, выполните `docker compose restart caddy`. |
| В логах Caddy `too many failed authorizations` / `rateLimited` | Слишком много неудачных попыток получить сертификат. Исправьте причину и подождите час. |
| `docker compose ps` показывает не те сервисы (нет `caddy` в варианте A) | Команда запущена не из папки `~/dm-assistant` или в `.env` нет строки `COMPOSE_FILE` (шаг 4). |
| `502 Bad Gateway` | Фронт или API ещё стартуют (подождите минуту) или упали — смотрите `logs frontend` и `logs backend`. |
| `backend` в `docker compose ps` в статусе `Restarting`, в логах `password authentication failed for user "dm_assistant"` | `DB_PASSWORD` в `.env` поменяли после первого запуска. Верните прежнее значение или задайте базе новый пароль — тот, что сейчас в `.env`: `docker compose exec db psql -U dm_assistant -d dm_assistant -c "ALTER USER dm_assistant PASSWORD 'пароль_из_.env';"`, затем `docker compose restart backend`. |
| `docker compose` пишет `required variable ... is missing a value` | В `.env` не заполнено указанное поле. |
| Auth0: **Callback URL mismatch** | В Auth0 → Applications → DM Assistant → **Allowed Callback URLs** должно быть точно `https://ваш-домен/auth/callback`, а `DOMAIN` в `.env` — тот же адрес. |
| Auth0: **Service not found: https://dm-assistant/api** | Identifier API в Auth0 не совпадает с `AUTH0_AUDIENCE` в `.env`. |
| `The state parameter is invalid.` | Вход начался на одном адресе, а закончился на другом (например, открыли сайт по IP или с `www.`), или браузер блокирует cookie. Откройте сайт ровно по адресу из `DOMAIN` и войдите заново. |
| `An error occurred during the authorization flow.` | Auth0 вернул ошибку. Её текст есть в адресной строке (`error_description=...`) и в Auth0 → **Monitoring → Logs**. Чаще всего это неверные Client ID / Client Secret в `.env` или выключенное подключение (шаг 3.4). |
| Вход прошёл, но сайт снова и снова отправляет на страницу входа или пишет «Not signed in» | Выполните `docker compose logs backend \| grep "Rejected access token"`. `The iss claim is not valid` — неверный `AUTH0_DOMAIN`; `The aud claim is not valid` — `AUTH0_AUDIENCE` не совпадает с Identifier API (шаг 3.2). После правки `.env`: `docker compose up -d`. |
| Игрок не может зарегистрироваться | В Auth0 выключено Disable Sign Ups и включено подключение в Applications → Connections (шаг 3.4). |
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
