# PLAN.md - Rukousaiheet (Weekly Prayers)

## Projektin yleiskuvaus

Sovellus seurakunnan viikottaisten rukousaiheiden hallintaan ja näyttämiseen. Sisältää kirkkoherran aiheen, työntekijöiden rukouspyynnöt ja julkisen rukouspyyntölistan AI-moderoinnilla.

## Teknologiat

| Komponentti | Teknologia |
|-------------|------------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express (ESM) |
| Tietokanta | PostgreSQL 16 |
| Autentikointi | Microsoft Entra ID (Azure AD) |
| AI-moderointi | OpenAI API / Claude API |
| I18n | react-i18next (FI, EN, SV) |
| Kontitus | Docker + Docker Compose |
| Reverse Proxy | Nginx |

## Tietokantarakenne

```sql
CREATE TYPE user_role AS ENUM ('admin', 'worker', 'user');

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    microsoft_oid   VARCHAR(255) UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    name            VARCHAR(255) NOT NULL,
    role            user_role DEFAULT 'user',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    last_login      TIMESTAMPTZ
);

CREATE TABLE prayer_requests (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users(id),
    type                VARCHAR(20) NOT NULL CHECK (type IN ('pastor', 'staff', 'public')),
    original_content    TEXT NOT NULL,
    sanitized_content   TEXT,
    ai_flagged          BOOLEAN DEFAULT FALSE,
    ai_flag_reason      TEXT,
    start_date          DATE NOT NULL,
    end_date            DATE NOT NULL,
    is_approved         BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prayer_counts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_number INTEGER NOT NULL,
    year        INTEGER NOT NULL,
    count       INTEGER DEFAULT 0,
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(week_number, year)
);

CREATE INDEX idx_prayers_dates ON prayer_requests(start_date, end_date);
CREATE INDEX idx_prayers_type ON prayer_requests(type);
CREATE INDEX idx_users_microsoft ON users(microsoft_oid);
```

## API-rakenne

```
GET    /api/prayers              Julkiset viikon rukousaiheet
GET    /api/prayers/week/:week   Tietyn viikon aiheet
POST   /api/prayers              Uusi julkinen rukouspyyntö
POST   /api/prayers/staff        Työntekijän pyyntö (worker+)
POST   /api/prayers/pastor       Kirkkoherran aihe (admin)
PUT    /api/prayers/:id          Muokkaa (worker+ / admin pastor)
DELETE /api/prayers/:id          Poista (worker+ / admin pastor)

GET    /api/counts/week/:week    Viikon rukousmäärä
POST   /api/counts/increment     Lisää rukouslaskuriin

GET    /api/auth/login           Aloita Microsoft-kirjautuminen
GET    /api/auth/callback        Microsoft callback
POST   /api/auth/logout          Kirjaudu ulos
GET    /api/auth/me              Nykyinen käyttäjä

GET    /api/users                Lista käyttäjistä (admin)
PUT    /api/users/:id/role       Muuta roolia (admin)

GET    /api/export/intercession  Esirukouksen tuloste (worker+)

GET    /api/embed/widget.js      Upotettava JavaScript
GET    /api/embed/data           CORS-tuettu data ulkoisille sivuille
```

## Käyttöoikeudet

| Toiminto | admin | worker | user | anon |
|----------|-------|--------|------|------|
| Näe julkiset rukousaiheet | ✓ | ✓ | ✓ | ✓ |
| Jätä julkinen pyyntö | ✓ | ✓ | ✓ | ✓ |
| Näe alkuperäiset tekstit | ✓ | ✓ | ✗ | ✗ |
| Lisää staff-pyyntöjä | ✓ | ✓ | ✗ | ✗ |
| Muokkaa/poista staff-pyyntöjä | ✓ | ✓ | ✗ | ✗ |
| Lisää/muokkaa pastor-aihe | ✓ | ✗ | ✗ | ✗ |
| Hyväksy julkisia pyyntöjä | ✓ | ✓ | ✗ | ✗ |
| Hallinnoi käyttäjiä | ✓ | ✗ | ✗ | ✗ |
| Tulosta esirukous | ✓ | ✓ | ✗ | ✗ |

## I18n - Kielituki

Tuetut kielet: Suomi (fi), English (en), Svenska (sv)

Kielenvalinta tallennetaan vain session ajaksi (sessionStorage), ei pysyvää tallennusta → ei cookie-ilmoitusta.

```
frontend/src/locales/
├── fi/
│   └── translation.json
├── en/
│   └── translation.json
└── sv/
    └── translation.json
```

## Projektirakenne

```
weekly-prayers/
├── PLAN.md
├── README.md
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
├── .gitignore
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js
│       ├── config/
│       │   ├── database.js
│       │   ├── auth.js
│       │   └── ai.js
│       ├── middleware/
│       │   ├── authenticate.js
│       │   ├── authorize.js
│       │   ├── cors.js
│       │   └── errorHandler.js
│       ├── routes/
│       │   ├── auth.js
│       │   ├── prayers.js
│       │   ├── counts.js
│       │   ├── users.js
│       │   ├── export.js
│       │   └── embed.js
│       ├── services/
│       │   ├── microsoft.js
│       │   ├── aiSanitizer.js
│       │   └── prayerService.js
│       ├── db/
│       │   ├── index.js
│       │   └── migrations/
│       │       ├── 001_initial.sql
│       │       └── migrate.js
│       └── utils/
│           ├── weekHelper.js
│           └── logger.js
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── i18n.js
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Header.jsx
│       │   │   ├── Footer.jsx
│       │   │   └── LanguageSelector.jsx
│       │   ├── prayers/
│       │   │   ├── PastorPrayer.jsx
│       │   │   ├── StaffPrayers.jsx
│       │   │   ├── PublicPrayers.jsx
│       │   │   ├── PrayerForm.jsx
│       │   │   └── PrayerCard.jsx
│       │   ├── admin/
│       │   │   ├── AdminPanel.jsx
│       │   │   ├── PrayerManager.jsx
│       │   │   ├── UserManager.jsx
│       │   │   └── ExportButton.jsx
│       │   └── common/
│       │       ├── Button.jsx
│       │       ├── Modal.jsx
│       │       ├── DatePicker.jsx
│       │       └── LoadingSpinner.jsx
│       ├── hooks/
│       │   ├── useAuth.js
│       │   ├── usePrayers.js
│       │   └── usePrayerCount.js
│       ├── context/
│       │   └── AuthContext.jsx
│       ├── services/
│       │   └── api.js
│       ├── locales/
│       │   ├── fi/translation.json
│       │   ├── en/translation.json
│       │   └── sv/translation.json
│       └── styles/
│           └── index.css
│
├── nginx/
│   ├── nginx.conf
│   └── nginx.dev.conf
│
└── scripts/
    ├── setup.sh
    └── seed.js
```

---

# MILESTONES

## Milestone 1: Infrastruktuuri ja tietokanta

Perustan rakentaminen: Docker-ympäristö, tietokanta ja backend-runko.

### Tehtävät

| # | Tehtävä | Kuvaus |
|---|---------|--------|
| 1.1 | Projektin alustus | Luo repository, .gitignore, README.md, PLAN.md |
| 1.2 | Docker Compose -pohja | docker-compose.yml PostgreSQL-palvelulla |
| 1.3 | Backend-projektin alustus | package.json ESM-tuella, Express-runko |
| 1.4 | Tietokantayhteys | PostgreSQL-yhteys pg-kirjastolla, connection pool |
| 1.5 | Migraatiojärjestelmä | Yksinkertainen SQL-migraatiorunner |
| 1.6 | Ensimmäinen migraatio | users, prayer_requests, prayer_counts -taulut |
| 1.7 | Ympäristömuuttujat | .env.example, dotenv-konfiguraatio |
| 1.8 | Backend Dockerfile | Multi-stage build tuotantoa varten |
| 1.9 | Health check -endpoint | GET /api/health tietokantayhteydellä |
| 1.10 | Kehitysympäristö | docker-compose.dev.yml hot reload -tuella |

### Definition of Done

- docker-compose up käynnistää PostgreSQL:n ja backendin
- Tietokanta-migraatiot ajetaan automaattisesti
- Health endpoint vastaa ja vahvistaa DB-yhteyden

---

## Milestone 2: Autentikointi ja käyttäjähallinta

Microsoft Entra ID -kirjautuminen ja roolipohjainen käyttöoikeuksien hallinta.

### Tehtävät

| # | Tehtävä | Kuvaus |
|---|---------|--------|
| 2.1 | Microsoft MSAL -konfiguraatio | Azure AD -kirjaston asennus ja config |
| 2.2 | Login-reitti | GET /api/auth/login → Microsoft redirect |
| 2.3 | Callback-reitti | GET /api/auth/callback → token-vaihto |
| 2.4 | Käyttäjän luonti/päivitys | Luo/päivitä käyttäjä Microsoft-tiedoilla |
| 2.5 | JWT-session hallinta | Session token -luonti ja validointi |
| 2.6 | Authenticate-middleware | Token-validointi ja req.user asetus |
| 2.7 | Authorize-middleware | Roolipohjainen pääsynhallinta (requireRole) |
| 2.8 | Logout-toiminto | Session-tokenin mitätöinti |
| 2.9 | GET /api/auth/me | Palauta nykyisen käyttäjän tiedot |
| 2.10 | Käyttäjähallinta-API | GET /api/users, PUT /api/users/:id/role (admin) |

### Definition of Done

- Microsoft-kirjautuminen toimii evl.fi-tunnuksilla
- JWT-sessiot toimivat
- Roolipohjainen pääsynhallinta estää luvattomat toiminnot

---

## Milestone 3: Rukousaihe-API ja AI-moderointi

Rukousaiheiden CRUD-operaatiot ja AI-pohjainen sisällön tarkistus.

### Tehtävät

| # | Tehtävä | Kuvaus |
|---|---------|--------|
| 3.1 | GET /api/prayers | Hae viikon rukousaiheet (julkinen) |
| 3.2 | Viikkolaskenta-utility | Viikkonumeron ja päivämäärävälin laskenta |
| 3.3 | POST /api/prayers | Uusi julkinen rukouspyyntö |
| 3.4 | AI-sanitizer -palvelu | OpenAI/Claude-integraatio sisällön tarkistukseen |
| 3.5 | AI-tarkistuksen integrointi | Julkiset pyynnöt AI:n läpi automaattisesti |
| 3.6 | POST /api/prayers/staff | Työntekijän rukouspyyntö (worker+) |
| 3.7 | POST /api/prayers/pastor | Kirkkoherran aihe (admin only) |
| 3.8 | PUT /api/prayers/:id | Muokkaa rukouspyyntöä (oikeuksien mukaan) |
| 3.9 | DELETE /api/prayers/:id | Poista rukouspyyntö |
| 3.10 | Hyväksymistoiminto | Julkisten pyyntöjen hyväksyminen/hylkääminen |

### Definition of Done

- Kaikki CRUD-operaatiot toimivat
- AI tarkistaa julkiset pyynnöt automaattisesti
- Oikeudet toimivat oikein eri rooleille

---

## Milestone 4: Frontend ja käyttöliittymä

React-sovellus kielituella ja kaikilla käyttäjänäkymillä.

### Tehtävät

| # | Tehtävä | Kuvaus |
|---|---------|--------|
| 4.1 | Frontend-projektin alustus | Vite + React + TailwindCSS |
| 4.2 | I18n-konfiguraatio | react-i18next, sessionStorage-tallennus |
| 4.3 | Käännöstiedostot | fi/en/sv translation.json -tiedostot |
| 4.4 | Layout-komponentit | Header, Footer, LanguageSelector |
| 4.5 | AuthContext | Kirjautumistilan hallinta |
| 4.6 | Julkinen näkymä | PastorPrayer, StaffPrayers, PublicPrayers |
| 4.7 | Rukouspyyntölomake | PrayerForm julkisille pyynnöille |
| 4.8 | Rukouslaskuri | "Olen rukoillut" -nappi ja viikkolaskuri |
| 4.9 | Työntekijänäkymä | AdminPanel, PrayerManager (worker+) |
| 4.10 | Admin-näkymä | UserManager, pastor-aiheen hallinta (admin) |

### Definition of Done

- Käyttöliittymä toimii kolmella kielellä
- Kaikki näkymät toimivat roolien mukaan
- Responsiivinen mobiilille ja desktopille

---

## Milestone 5: Viimeistely ja julkaisu

Upotusmahdollisuudet, tuloste, Docker-kontitus ja dokumentaatio.

### Tehtävät

| # | Tehtävä | Kuvaus |
|---|---------|--------|
| 5.1 | Rukouslaskuri-API | GET/POST /api/counts viikkokohtaiselle laskurille |
| 5.2 | Esirukouksen tuloste | GET /api/export/intercession (HTML/PDF) |
| 5.3 | Tulosteen UI | ExportButton ja tulosteen esikatselu |
| 5.4 | Embed widget.js | Upotettava JavaScript ulkoisille sivuille |
| 5.5 | Embed data API | CORS-tuettu GET /api/embed/data |
| 5.6 | iFrame-tuki | /embed -reitti upotettavalle näkymälle |
| 5.7 | Frontend Dockerfile | Multi-stage build Nginx:llä |
| 5.8 | Nginx-konfiguraatio | Reverse proxy, CORS, SSL-valmius |
| 5.9 | Tuotanto docker-compose | Kaikki palvelut yhteen |
| 5.10 | Dokumentaatio | README: asennus, konfigurointi, käyttö |

### Definition of Done

- Sovellus toimii täysin Docker-kontitettuna
- Upotus toimii sekä JS- että iFrame-muodossa
- Esirukoustuloste valmis messua varten
- Dokumentaatio kattaa asennuksen ja käytön

---

## Yhteenveto

| Milestone | Fokus | Tehtäviä |
|-----------|-------|----------|
| 1 | Infrastruktuuri ja tietokanta | 10 |
| 2 | Autentikointi ja käyttäjähallinta | 10 |
| 3 | Rukousaihe-API ja AI-moderointi | 10 |
| 4 | Frontend ja käyttöliittymä | 10 |
| 5 | Viimeistely ja julkaisu | 10 |
| **Yhteensä** | | **50** |
