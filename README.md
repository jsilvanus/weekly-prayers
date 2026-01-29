# Weekly Prayers - Viikottaiset rukousaiheet

Sovellus seurakunnan viikottaisten rukousaiheiden hallintaan ja näyttämiseen.

## Ominaisuudet

- Kirkkoherran viikottainen rukousaihe
- Työntekijöiden rukouspyynnöt
- Julkinen rukouspyyntölista AI-moderoinnilla
- Kolmen kielen tuki (FI, EN, SV)
- Microsoft Entra ID -kirjautuminen
- Upotettava widget ulkoisille sivuille
- Esirukouksen tuloste messuun
- Rukouslaskuri

## Teknologiat

| Komponentti | Teknologia |
|-------------|------------|
| Frontend | React 18 + Vite + TailwindCSS |
| Backend | Node.js + Express (ESM) |
| Tietokanta | PostgreSQL 16 |
| Autentikointi | Microsoft Entra ID (MSAL) |
| AI-moderointi | OpenAI API / Claude API |
| I18n | react-i18next |
| Kontitus | Docker + Docker Compose |
| Reverse Proxy | Nginx |

## Asennus

### Vaatimukset

- Docker ja Docker Compose
- Node.js 20+ (kehitykseen)
- Microsoft Azure -tili (Entra ID)
- OpenAI tai Anthropic API-avain (valinnainen)

### Kehitysympäristö

1. Kopioi ympäristömuuttujat:
```bash
cp .env.example .env
```

2. Täytä tarvittavat ympäristömuuttujat `.env`-tiedostoon

3. Käynnistä kehitysympäristö:
```bash
./scripts/setup.sh
# tai
docker-compose -f docker-compose.dev.yml up
```

4. Aja migraatiot:
```bash
docker-compose -f docker-compose.dev.yml --profile migrate up migrate
```

Backend: http://localhost:3000
Frontend: http://localhost:5173

### Tuotanto

```bash
docker-compose up -d --build
```

Sovellus käynnistyy osoitteeseen http://localhost (portti 80).

## Ympäristömuuttujat

| Muuttuja | Kuvaus | Pakollinen |
|----------|--------|------------|
| DB_USER | PostgreSQL käyttäjä | Kyllä |
| DB_PASSWORD | PostgreSQL salasana | Kyllä |
| DB_NAME | Tietokannan nimi | Kyllä |
| JWT_SECRET | JWT-tokenin salausavain | Kyllä |
| AZURE_TENANT_ID | Azure AD tenant ID | Kyllä |
| AZURE_CLIENT_ID | Azure AD client ID | Kyllä |
| AZURE_CLIENT_SECRET | Azure AD client secret | Kyllä |
| AZURE_REDIRECT_URI | OAuth callback URL | Kyllä |
| OPENAI_API_KEY | OpenAI API-avain | Ei* |
| ANTHROPIC_API_KEY | Anthropic API-avain | Ei* |
| AI_PROVIDER | "openai" tai "anthropic" | Ei |
| FRONTEND_URL | Frontend URL CORS:ille | Ei |

*AI-moderointiin tarvitaan joko OpenAI tai Anthropic API-avain.

## Käyttöoikeudet

| Rooli | Kuvaus |
|-------|--------|
| admin | Kirkkoherran aihe, käyttäjähallinta, kaikki oikeudet |
| worker | Työntekijöiden pyynnöt, hyväksyminen, tuloste |
| user | Kirjautunut käyttäjä |
| anon | Julkiset pyynnöt, lukuoikeus |

## API-endpointit

### Julkiset

- `GET /api/prayers` - Viikon rukousaiheet
- `POST /api/prayers` - Jätä julkinen rukouspyyntö
- `GET /api/counts` - Rukouslaskurin arvo
- `POST /api/counts/increment` - Lisää rukouslaskuriin

### Autentikoidut (worker+)

- `POST /api/prayers/staff` - Työntekijän rukouspyyntö
- `PUT /api/prayers/:id` - Muokkaa pyyntöä
- `DELETE /api/prayers/:id` - Poista pyyntö
- `POST /api/prayers/:id/approve` - Hyväksy/hylkää
- `GET /api/export/intercession` - Esirukouksen tuloste

### Admin

- `POST /api/prayers/pastor` - Kirkkoherran aihe
- `GET /api/users` - Käyttäjälista
- `PUT /api/users/:id/role` - Muuta roolia

### Upotus (CORS-tuettu)

- `GET /api/embed/data` - JSON-data ulkoisille sivuille
- `GET /api/embed/widget.js` - JavaScript-widget
- `GET /api/embed/iframe` - iFrame-sisältö

## Upotus ulkoisille sivuille

### JavaScript-widget

```html
<div id="weekly-prayers-widget"></div>
<script src="https://your-domain.com/api/embed/widget.js"></script>
```

### iFrame

```html
<iframe
  src="https://your-domain.com/api/embed/iframe"
  width="100%"
  height="400"
  frameborder="0">
</iframe>
```

## Hakemistorakenne

```
weekly-prayers/
├── backend/           # Node.js Express API
│   ├── src/
│   │   ├── config/    # Konfiguraatiot
│   │   ├── db/        # Tietokanta ja migraatiot
│   │   ├── middleware/# Express middlewaret
│   │   ├── routes/    # API-reitit
│   │   ├── services/  # Palvelut
│   │   └── utils/     # Apufunktiot
│   └── Dockerfile
├── frontend/          # React Vite -sovellus
│   ├── src/
│   │   ├── components/# React-komponentit
│   │   ├── context/   # React Context
│   │   ├── hooks/     # Custom hooks
│   │   ├── locales/   # Käännökset
│   │   └── services/  # API-palvelut
│   └── Dockerfile
├── nginx/             # Nginx reverse proxy
├── scripts/           # Apuskriptit
├── docker-compose.yml # Tuotanto
└── docker-compose.dev.yml # Kehitys
```

## Lisenssi

MIT License
