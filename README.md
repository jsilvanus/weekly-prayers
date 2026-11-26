# Weekly Prayers - Viikottaiset rukousaiheet

Sovellus seurakuntien ja seurakuntayhtymien viikottaisten rukousaiheiden hallintaan, moderointiin ja esittämiseen.

## Ominaisuudet

- **Kirkkoherran ja piispan rukousaiheet:** Viikottaiset teemat ja liturgiset tervehdykset.
- **Työalojen rukouspyynnöt:** Työntekijöiden ja työalojen (diakonia, nuorisotyö, lähetys jne.) rukousaiheet.
- **Julkiset rukouspyynnöt:** Seurakuntalaisten jättämät pyynnöt tekoälyavusteisella moderoinnilla ja työntekijöiden hyväksynnällä.
- **Moniseurakuntatuki (Multi-tenancy):** Tuki seurakunnille ja seurakuntayhtymille hierarkioineen ja yhtymälaajuisille aiheille.
- **Raamattu & Hetkirukoukset:** Kirkkovuosikalenteri ja hetkirukoukset (Anno API).
- **Esirukouksen tuloste:** Valmiit tulostepohjat sunnuntain messun esirukousjaksoa varten.
- **Upotettava widget:** Upotettavissa suoraan verkkosivuille iFramena tai JavaScript-komponenttina.
- **Kielituki:** Suomi, ruotsi ja englanti (FI, SV, EN).

## Teknologiat

| Komponentti | Teknologia |
|-------------|------------|
| Frontend | React 18 + Vite + TailwindCSS |
| Backend | Node.js + Express (ESM) |
| Tietokanta | PostgreSQL 16 |
| Autentikointi | OIDC / Tunnus (PKCE) & Microsoft Entra ID |
| AI-moderointi | OpenAI API / Anthropic Claude API (valinnainen) |
| I18n | react-i18next |
| Kontitus | Docker (multi-stage build) |

## Paikallinen kehitys

### Vaatimukset

- Docker ja Docker Compose
- Node.js 20+

### Asennus ja käynnistys

1. Kopioi malliympäristömuuttujat:
```bash
cp .env.example .env
```

2. Käynnistä kehitysympäristö:
```bash
docker-compose -f docker-compose.dev.yml up
```

3. Aja tietokantamigraatiot:
```bash
docker-compose -f docker-compose.dev.yml --profile migrate up migrate
```

Backend: `http://localhost:3000`  
Frontend: `http://localhost:5173`

## Käyttöoikeudet ja roolit

Roolit määritellään OIDC-ryhmäjäsenyyksien (`parish/<tenant>/rukous-<role>`) tai paikallisen käyttäjähallinnan kautta:

| Rooli | Oikeudet |
|-------|----------|
| `admin` | Täydet oikeudet: asetukset, käyttäjähallinta, kirkkoherran aiheet |
| `coordinator` | Rukousaiheiden nostot (Z-prioriteetti), moderointi, esirukoustuloste |
| `worker` / `bishop` | Työntekijöiden ja piispan pyyntöjen luonti ja hallinta, moderointi |
| `prayer_group` | Rukousryhmäläisten näkymät ja aiheiden luku |
| `user` | Kirjautunut peruskäyttäjä |
| *(anonyymi)* | Julkiset rukousaiheet, pyynnön jättäminen, rukouslaskuri |

## Viikoittaiset esirukousviestit (sähköposti)

Koordinaattorit (ja ylläpitäjät) voivat luoda esirukousviestejä, jotka lähetetään joko seurakunnan
tilaajalistalle tai tietyn roolin käyttäjille (`prayer_group`, `worker` jne.). Viesti lähetetään
kerran tietylle viikolle tai joka viikko toistuvasti. Lähetyspäivät ovat pakollisia.

- **Lähetys:** Tunnus-postirelay (`@tunnus/notify`). Lähettäjä on `MAIL_FROM`. Yksi viesti per vastaanottaja.
- **Ajastin:** käynnistyy palvelimen mukana ja tarkistaa 10 minuutin välein, onko viesti lähetettävä
  (Helsingin aika, lähetystunti `send_hour`). Lähetys on idempotentti: sama viesti ja päivä lähtee vain kerran.
  Ajastin ei käynnisty, jos postirelay-asetukset puuttuvat tai `MAILING_SCHEDULER=false`.
- **Suostumus:** tilaajat vahvistavat tilauksensa itse (kaksoisvahvistus, julkinen lomake, jos listalle on
  sallittu julkinen ilmoittautuminen) tai henkilökunta lisää osoitteen ja vahvistaa suostumuksen.
  Jokaisessa viestissä on lähettäjän tiedot ja peruutuslinkki.
- **Rajapinnat:** `/api/mailings` (koordinaattori+): listat, tilaajat, mailingit, esikatselu, testiviesti
  ja lähetyshistoria. Julkiset päätepisteet (`/api/mailings/public/...`) ovat rajoitettuja (10 pyyntöä/min/IP).

Käyttöönotto: aja migraatio `023_weekly_prayer_email.sql` (`npm run migrate` backendissä) ja aseta
`.env`-tiedostoon `TUNNUS_MAIL_URL`, `TUNNUS_MAIL_RELAY_TOKEN` ja `MAIL_FROM` (katso `.env.example`).

## Upotus ulkoisille sivuille

### JavaScript-widget
```html
<div id="weekly-prayers-widget"></div>
<script src="/api/embed/widget.js"></script>
```

### iFrame
```html
<iframe
  src="/api/embed/iframe"
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
│   │   ├── config/    # Sovelluskonfiguraatiot
│   │   ├── db/        # Tietokantayhteys ja migraatiot
│   │   ├── middleware/# Autentikointi ja autorisointi
│   │   ├── routes/    # REST API -reitit
│   │   └── services/  # Liiketoimintalogiikka ja OIDC
│   └── Dockerfile
├── frontend/          # React Vite SPA
│   ├── src/
│   │   ├── components/# UI-komponentit
│   │   ├── context/   # React Contextit (Auth, Settings, Tenant)
│   │   ├── locales/   # Käännöstiedostot
│   │   └── services/  # API-asiakas
│   └── Dockerfile
├── Dockerfile         # Yhdistetty tuotantokuva (frontend + backend)
├── docker-compose.yml # Compose-määritys
└── docker-compose.dev.yml
```

## Lisenssi

MIT License
