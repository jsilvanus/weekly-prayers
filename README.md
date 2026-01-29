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

## Teknologiat

| Komponentti | Teknologia |
|-------------|------------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express (ESM) |
| Tietokanta | PostgreSQL 16 |
| Autentikointi | Microsoft Entra ID |
| AI-moderointi | OpenAI API / Claude API |
| I18n | react-i18next |
| Kontitus | Docker + Docker Compose |
| Reverse Proxy | Nginx |

## Asennus

### Vaatimukset

- Docker ja Docker Compose
- Node.js 20+ (kehitykseen)
- Microsoft Azure -tili (Entra ID)
- OpenAI tai Anthropic API-avain

### Kehitysympäristö

1. Kopioi ympäristömuuttujat:
```bash
cp .env.example .env
```

2. Täytä tarvittavat ympäristömuuttujat `.env`-tiedostoon

3. Käynnistä kehitysympäristö:
```bash
docker-compose -f docker-compose.dev.yml up
```

### Tuotanto

```bash
docker-compose up -d
```

## Käyttöoikeudet

| Rooli | Kuvaus |
|-------|--------|
| admin | Kirkkoherran aihe, käyttäjähallinta, kaikki oikeudet |
| worker | Työntekijöiden pyynnöt, hyväksyminen, tuloste |
| user | Kirjautunut käyttäjä, omat pyynnöt |
| anon | Julkiset pyynnöt, lukuoikeus |

## API-dokumentaatio

Katso [PLAN.md](PLAN.md) täydellinen API-kuvaus.

## Lisenssi

MIT License
