-- Migration 020: Custom Meditations, Building Blocks Architecture, and Portal Lifting
-- Creates meditations table with JSONB building blocks and seeds 6 classical & family meditations.
-- Adds blocks and portal_position columns to devotions table.

-- 1. Create meditations table
CREATE TABLE IF NOT EXISTS meditations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID REFERENCES tenants(id) ON DELETE CASCADE,
    template_key        VARCHAR(100),
    slug                VARCHAR(100) NOT NULL,
    title               VARCHAR(255) NOT NULL,
    subtitle            VARCHAR(255),
    category            VARCHAR(50) NOT NULL DEFAULT 'custom',
    icon                VARCHAR(20) DEFAULT '📿',
    short_description   TEXT,
    introduction        TEXT,
    blocks              JSONB NOT NULL DEFAULT '[]'::jsonb,
    display_order       INT NOT NULL DEFAULT 100,
    is_published        BOOLEAN NOT NULL DEFAULT TRUE,
    is_system_template  BOOLEAN NOT NULL DEFAULT FALSE,
    portal_position     VARCHAR(16) DEFAULT NULL CHECK (portal_position IN ('above', 'below') OR portal_position IS NULL),
    created_by_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_meditations_tenant_slug
ON meditations (COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);

CREATE INDEX IF NOT EXISTS idx_meditations_tenant ON meditations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_meditations_published ON meditations(is_published);
CREATE INDEX IF NOT EXISTS idx_meditations_template_key ON meditations(template_key);
CREATE INDEX IF NOT EXISTS idx_meditations_order ON meditations(tenant_id, display_order);
CREATE INDEX IF NOT EXISTS idx_meditations_portal_pos ON meditations(portal_position) WHERE portal_position IS NOT NULL;

-- 2. Add blocks and portal_position to devotions table
ALTER TABLE devotions
ADD COLUMN IF NOT EXISTS blocks JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS portal_position VARCHAR(16) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_devotions_portal_pos ON devotions(portal_position) WHERE portal_position IS NOT NULL;

-- 3. Update active_meditations default in site_settings to include advent_children
UPDATE site_settings
SET value = '["lonnebo_beads", "luther_wreath", "jesus_prayer", "lectio_divina", "examen", "advent_children"]'
WHERE key = 'active_meditations'
  AND value = '["lonnebo_beads", "luther_wreath", "jesus_prayer", "lectio_divina", "examen"]';

-- 4. Seed the 6 system template meditations if not already seeded
INSERT INTO meditations (
    tenant_id, template_key, slug, title, subtitle, category, icon, short_description, introduction, display_order, is_published, is_system_template, blocks
)
VALUES
(
    NULL,
    'lonnebo_beads',
    'lonnebo_beads',
    'Martin Lönnebon rukoushelmet',
    '18 helmen matka arjen ja elämän läpi (Frälsarkransen)',
    'rukoushelmet',
    '📿',
    'Piispa Martin Lönnebon kehittämä 18 helmen rukousnauha auttaa hiljentymään, keskittymään ja kantamaan koko elämän Jumalan eteen.',
    'Ruotsalaisen piispan Martin Lönnebon (1930–2020) vuonna 1995 kehittämät Rukoushelmet (Frälsarkransen) ovat nousseet laajasti rakastetuksi rukouksen ja hiljentymisen välineeksi pohjoismaisissa luterilaisissa kirkoissa. Helminauhassa on 18 helmeä, joista jokaisella on oma nimensä, merkityksensä ja rukouksensa.',
    10,
    TRUE,
    TRUE,
    '[
      {
        "id": "lonnebo-intro",
        "type": "intro",
        "data": {
          "title": "Rukoushelmien matka",
          "content": "Voit kulkea helmet läpi järjestyksessä tai pysähtyä juuri siihen helmeen, joka puhuttelee sinua tänään. Kosketa helmeä lukeaksesi sen merkityksen, raamatunkohdan ja rukouksen."
        }
      },
      {
        "id": "lonnebo-sequence",
        "type": "bead_sequence",
        "data": {
          "title": "Rukousnauhan 18 helmeä",
          "beads": [
            {"index":1,"name":"Jumala-helmi","color":"gold","colorName":"Kultainen","shape":"Suuri kultainen litteä helmi","symbolism":"Alku ja loppu, luominen, iankaikkisuus ja Jumalan rajaton rakkaus.","scripture":"Ps. 139:5: \"Sinä suojaat minua edestä ja takaa, olet laskenut kätesi minun päälleni.\"","prayer":"Sinä olet rajaton, sinä olet lähellä. Sinä olet valo ja minä olen sinun. Aamen."},
            {"index":2,"name":"Hiljaisuuden helmi","color":"pearl","colorName":"Helmiäisvalkoinen","shape":"Pitkulainen kapea helmi","symbolism":"Sanojen taukoaminen, lepo ja Jumalan läsnäolossa oleminen ilman suorittamista.","scripture":"Ps. 62:2: \"Vain Jumalan luona on sieluni hiljaa, häneltä tulee minulle apu.\"","prayer":"Herra, anna minulle hiljaisuuden rauha. Auta minua kuulemaan sydämeni hiljainen kuiskaus."},
            {"index":3,"name":"Minä-helmi","color":"pearl-small","colorName":"Pieni helmiäisvalkoinen","shape":"Pieni pyöreä helmi","symbolism":"Oma ihmisarvo, haavoittuvuus, Jumalan luomistyö ja aitous omana itsenä.","scripture":"Ps. 139:14: \"Minä kiitän sinua siitä, että olen tehty ylen ihmeellisesti.\"","prayer":"Tässä olen, Jumalani. Olen sinun luomasi, sinun silmissäsi arvokas ja rakastettu. Aamen."},
            {"index":4,"name":"Kasteen helmi","color":"white","colorName":"Kirkas valkoinen","shape":"Keskikokoinen valkoinen helmi","symbolism":"Uusi alku, puhtaus, kasteen armo ja kutsu elää Jumalan lapsena.","scripture":"Gal. 3:27: \"Kaikki te, jotka olette Kristukseen kastettuja, olette pukeneet Kristuksen yllenne.\"","prayer":"Sinä tunnet minut nimeltä. Sinä olet pessyt minut puhtaaksi. Auta minua aloittamaan alusta tänään."},
            {"index":5,"name":"Hiljaisuuden helmi","color":"pearl","colorName":"Helmiäisvalkoinen","shape":"Pitkulainen helmi","symbolism":"Kasteen lahjan vastaanottaminen hiljaisuudessa.","scripture":"Jes. 30:15: \"Kääntymisessä ja levossa on teidän pelastuksenne, hiljaisuudessa ja luottamuksessa on teidän väkevyytenne.\"","prayer":"Lepään kasteeni armossa. Sinä kannat minua."},
            {"index":6,"name":"Autiomaan helmi","color":"sand","colorName":"Hiekanruskea","shape":"Pyöreä ruskea helmi","symbolism":"Kiusaukset, koettelemukset, hengellinen kuivuus ja yksinäisyys elämän taipaleella.","scripture":"Matt. 4:1: \"Sitten Henki vei Jeesuksen autiomaahan Paholaisen kiusattavaksi.\"","prayer":"Kun elämä tuntuu kuivalta ja raskaalta, älä jätä minua yksin. Ole kanssani autiomaassani."},
            {"index":7,"name":"Hiljaisuuden helmi","color":"pearl","colorName":"Helmiäisvalkoinen","shape":"Pitkulainen helmi","symbolism":"Rauhoittuminen taistelujen keskellä.","scripture":"Ps. 23:4: \"Vaikka minä kulkisin pimeässä laaksossa, en pelkäisi mitään pahaa, sillä sinä olet minun kanssani.\"","prayer":"Sinun sauvasi ja keppisi lohduttavat minua."},
            {"index":8,"name":"Huolettomuuden helmi","color":"blue","colorName":"Taivaansininen","shape":"Pyöreä sininen helmi","symbolism":"Taakkojen jättäminen, luottamus Jumalan huolenpitoon ja lapsenomainen ilo.","scripture":"1. Piet. 5:7: \"Heittäkää kaikki murheenne hänen kannettavakseen, sillä hän pitää teistä huolen.\"","prayer":"Heitän kaikki huoleni sinun kantaaksesi. Anna minulle vapaus ja keveys luottaa sinun hyvyyteesi."},
            {"index":9,"name":"Hiljaisuuden helmi","color":"pearl","colorName":"Helmiäisvalkoinen","shape":"Pitkulainen helmi","symbolism":"Huolettomuuden syventyminen sielussa.","scripture":"Fil. 4:6–7: \"Jumalan rauha, joka ylittää kaiken ymmärryksen, varjelee teidän sydämenne.\"","prayer":"Sinun rauhasi tulkoon sydämeeni."},
            {"index":10,"name":"Ensimmäinen rakkauden helmi","color":"red","colorName":"Syvänpunainen","shape":"Pyöreä punainen helmi","symbolism":"Jumalan uhrautuva rakkaus, Kristuksen sovitustyö ja anteeksiantamus.","scripture":"1. Joh. 4:10: \"Siinä on rakkaus – ei siinä, että me olemme rakastaneet Jumalaa, vaan siinä, että hän on rakastanut meitä.\"","prayer":"Herra Jeesus, kiitos että rakastit minua ristinkuolemaan asti. Opeta minua vastaanottamaan rakkautesi."},
            {"index":11,"name":"Toinen rakkauden helmi","color":"red","colorName":"Syvänpunainen","shape":"Pyöreä punainen helmi","symbolism":"Lähimmäisenrakkaus, myötätunto, huolenpito ja lähimmäisen palvelu arjessa.","scripture":"1. Joh. 4:11: \"Rakkaat ystävät! Jos Jumala on näin meitä rakastanut, mekin olemme velvolliset rakastamaan toisiamme.\"","prayer":"Avaa sydämeni ja käteni niille, jotka tarvitsevat apuani tänään. Anna minulle silmät nähdä lähimmäiseni."},
            {"index":12,"name":"Salaisuuksien helmet (3 kpl)","color":"white-small","colorName":"Pienet valkoiset helmet","shape":"Kolme pientä helmiäistä","symbolism":"Sydämen kätketyt asiat: toiveet, rukoukset ja haavat, joille meillä ei vielä ole sanoja.","scripture":"Room. 8:26: \"Henki itse rukoilee meidän puolestamme sanattomin huokauksin.\"","prayer":"Herra, sinä tiedät sen, mitä en osaa edes lausua ääneen. Sinä tunnet sydämeni kätketyimmät salaisuudet."},
            {"index":13,"name":"Hiljaisuuden helmi","color":"pearl","colorName":"Helmiäisvalkoinen","shape":"Pitkulainen helmi","symbolism":"Salaisuuksien jättäminen Jumalan huomaan.","scripture":"Ps. 131:2: \"Olen löytänyt rauhan, mieleni on tyyni niin kuin vieroitetun lapsen äitinsä sylissä.\"","prayer":"Olen turvassa sinun kämmenelläsi."},
            {"index":14,"name":"Yön helmi","color":"black","colorName":"Musta helmi","shape":"Pyöreä musta helmi","symbolism":"Kipu, suru, pimeys, epätoivo ja kuolema. Jumala ei hylkää meitä edes pimeimmässä yössä.","scripture":"Ps. 130:1: \"Syvyydestä minä huudan sinua, Herra. Herra, kuule minun ääneni!\"","prayer":"Kun pimeys saartaa minut ja voimani loppuvat, ole valoni. Muista niitä, jotka tänään surevat tai kärsivät."},
            {"index":15,"name":"Hiljaisuuden helmi","color":"pearl","colorName":"Helmiäisvalkoinen","shape":"Pitkulainen helmi","symbolism":"Yön ja surun jälkeinen hiljainen odotus.","scripture":"Ps. 30:6: \"Illalla on vieraana itku, mutta aamulla ilo.\"","prayer":"Herra, odotan sinua niin kuin aamuvahti aamua."},
            {"index":16,"name":"Ylösnousemuksen helmi","color":"yellow","colorName":"Keltainen / Kirkas valo","shape":"Pyöreä valoisa keltainen helmi","symbolism":"Elämän voitto kuolemasta, toivo, Kristuksen ylösnousemus ja uusi aamu.","scripture":"1. Kor. 15:55: \"Kuolema on nielty ja voitto saatu. Missä on voittosi, kuolema?\"","prayer":"Ylösnoussut Kristus, sinä olet voittanut kuoleman ja pimeyden. Anna minulle uusi toivo ja rohkeus elää!"},
            {"index":17,"name":"Hiljaisuuden helmi","color":"pearl","colorName":"Helmiäisvalkoinen","shape":"Pitkulainen helmi","symbolism":"Kiitollinen lepo Jumalan ikuisessa valossa.","scripture":"Ilm. 21:5: \"Katso, minä teen kaiken uudeksi.\"","prayer":"Ylistetty olkoon Jumala, meidän Herramme Jeesuksen Kristuksen Isä."},
            {"index":18,"name":"Paluu Jumala-helmeen","color":"gold","colorName":"Kultainen","shape":"Suuri kultainen helmi","symbolism":"Matka päättyy sinne, mistä se alkoi: Jumalan iankaikkiseen syliin.","scripture":"Room. 11:36: \"Hänestä, hänen kauttaan ja häneen on kaikki. Hänen on kunnia ikuisesti. Aamen.\"","prayer":"Isän ja Pojan ja Pyhän Hengen nimeen. Aamen."}
          ]
        }
      }
    ]'::jsonb
),
(
    NULL,
    'luther_wreath',
    'luther_wreath',
    'Martti Lutherin katekismusmeditaatio',
    'Nelisäikeinen seppele henkilökohtaiseen rukoukseen',
    'luther',
    '🌹',
    'Vuonna 1535 Luther neuvoi parturiaan Peteriä sitomaan jokaisesta sanasta nelisäikeisen rukousseppeleen: opiksi, kiitokseksi, tunnustukseksi ja pyynnöksi.',
    'Keväällä 1535 Martti Lutherin luottoparturi Peter Beskendorf kysyi tohtorilta: "Miten minun tulisi rukoilla?" Luther vastasi kirjoittamalla teoksen "Yksinkertainen tapa rukoilla" (Ein einfältige Weise zu beten). Siinä Luther opastaa sitomaan jokaisesta Katekismuksen tai Raamatun kohdasta nelisäikeisen seppeleen (viersträhniger Kranz).',
    20,
    TRUE,
    TRUE,
    '[
      {
        "id": "luther-strands",
        "type": "multi_strand",
        "data": {
          "title": "Nelisäikeinen seppele (Viersträhniger Kranz)",
          "description": "Ota mikä tahansa Katekismuksen osa tai Raamatun jae ja kudo siitä nelisäikeinen seppele Jumalan eteen:",
          "strands": [
            {"strand":1,"name":"1. Säie: Opiksi (Instruction)","question":"Mitä Jumala opettaa minulle tässä sanassa?","explanation":"Kuuntele tekstiä kuin Jumalan koulussa. Mitä Jumala tahtoo minun ymmärtävän, tietävän ja uskovan?"},
            {"strand":2,"name":"2. Säie: Kiitokseksi (Thanksgiving)","question":"Mistä saan kiittää Jumalaa tämän sanan pohjalta?","explanation":"Jokainen Jumalan sana tai käsky pitää sisällään valtavan lahjan ja suojeluksen. Kiitä Jumalaa Hänen armostaan."},
            {"strand":3,"name":"3. Säie: Tunnustukseksi (Confession)","question":"Missä olen epäonnistunut ja rikkonut tätä vastaan?","explanation":"Tarkastele rehellisesti omaa elämääsi ja sydämesi tilaa. Pyydä anteeksi laiminlyöntejäsi."},
            {"strand":4,"name":"4. Säie: Pyynnöksi (Supplication)","question":"Mitä pyydän itselleni ja muille tämän toteutumiseksi?","explanation":"Rukoile Pyhää Henkeä avuksi, jotta tämä sana tulisi eläväksi sinussa, seurakunnassasi ja koko maailmassa."}
          ],
          "examples": [
            {
              "id": "first_commandment",
              "title": "1. Käsky: \"Minä olen Herra, sinun Jumalasi. Sinulla ei saa olla muita jumalia.\"",
              "strands": [
                {"strand":1,"text":"Opiksi: Jumala tahtoo olla minun ainoa turvani ja korkein hyvämme. Hän opettaa, että luotan Häneen kaikessa."},
                {"strand":2,"text":"Kiitokseksi: Kiitän sinua, rakas Isä, että olet ilmoittanut itsesi minulle, etkä jätä minua eksyksiin epäjumalien ja pelkojen keskelle."},
                {"strand":3,"text":"Tunnustukseksi: Tunnustan, että etsin usein turvaa rahasta, ihmisten hyväksynnästä tai omista voimistani."},
                {"strand":4,"text":"Pyynnöksi: Anna minulle sydän, joka luottaa ja turvaa sinuun silloinkin, kun kaikki muu horjuu. Aamen."}
              ]
            },
            {
              "id": "lords_prayer_first",
              "title": "Isä meidän -rukous: \"Tulkoon sinun valtakuntasi\"",
              "strands": [
                {"strand":1,"text":"Opiksi: Jumalan valtakunta tulee kyllä itsestäänkin ilman rukoustamme, mutta me pyydämme, että se tulisi myös meidän luoksemme."},
                {"strand":2,"text":"Kiitokseksi: Kiitän sinua, että olet tuonut valtakuntasi ja armosi Poikasi Jeesuksen Kristuksen kautta meidän todellisuuteemme."},
                {"strand":3,"text":"Tunnustukseksi: Tunnustan, että usein tavoittelen enemmän omaa kunniaani kuin sinun valtakuntaasi ja vanhurskauttasi."},
                {"strand":4,"text":"Pyynnöksi: Tule, Herra, ja hallitse minun sydämessäni. Anna valtakuntasi kasvaa seurakunnassamme ja koko maailmassa. Aamen."}
              ]
            }
          ]
        }
      }
    ]'::jsonb
),
(
    NULL,
    'jesus_prayer',
    'jesus_prayer',
    'Sydämen rukous ja Jeesus-rukous',
    'Huokausrukous ja hengityksen rytmi',
    'huokaus',
    '🕯️',
    'Vanha kristillinen sydämen rukous, joka yhdistyy tasaiseen hengitykseen ja johdattaa mielen sisäiseen lepoon ja Kristuksen läsnäoloon.',
    'Jeesus-rukous ("Herra Jeesus Kristus, Jumalan Poika, armahda minua syntistä") on kristillisen kirkon vanhimpia ja laajimmin harjoitettuja rukoustapoja. Kun sanat yhdistetään rauhalliseen hengitykseen, rukous siirtyy huulilta sydämeen.',
    30,
    TRUE,
    TRUE,
    '[
      {
        "id": "jesus-breath",
        "type": "breathing_timer",
        "data": {
          "title": "Hengitys ja Jeesus-rukous",
          "inBreath": "Herra Jeesus Kristus, Jumalan Poika",
          "inBreathHint": "Hengitä sisään Jumalan rauhaa ja elämää",
          "outBreath": "Armahda minua syntistä",
          "outBreathHint": "Hengitä ulos huoli, kiire ja synti",
          "alternativeShort": "Sisäänhengitys: \"Herra Jeesus\" — Uloshengitys: \"Armahda\"",
          "cycleSeconds": 5
        }
      },
      {
        "id": "jesus-steps",
        "type": "steps_guide",
        "data": {
          "title": "Sydämen rukouksen neljä vaihetta",
          "layout": "grid",
          "steps": [
            {"step":1,"title":"Asetu lepoon","desc":"Istu mukavasti ryhdikkäässä mutta rentoutuneessa asennossa. Laske kädet syliin ja sulje silmät."},
            {"step":2,"title":"Havannoi hengitystäsi","desc":"Älä yritä muuttaa hengitystäsi väkisin. Anna hengityksen tasaantua luonnolliseen rytmiinsä."},
            {"step":3,"title":"Liitä rukous hengitykseen","desc":"Hengitä sisään sanoen mielessäsi: \"Herra Jeesus Kristus, Jumalan Poika\". Hengitä ulos sanoen: \"Armahda minua\"."},
            {"step":4,"title":"Palaa lempeästi keskukseen","desc":"Kun ajatuksesi harhailevat, huomaa ajatus ja palaa levollisesti takaisin Jeesuksen nimeen."}
          ]
        }
      },
      {
        "id": "jesus-silence",
        "type": "silence_timer",
        "data": {
          "title": "Hiljainen rukoushetki",
          "defaultMinutes": 3,
          "chimeType": "singing_bowl",
          "guidingPrompt": "Lepää Jeesuksen nimen suojassa ja hiljaisuudessa."
        }
      }
    ]'::jsonb
),
(
    NULL,
    'lectio_divina',
    'lectio_divina',
    'Lectio Divina (Hengellinen lukeminen)',
    'Raamatun sanan mietiskely neljässä liikkeessä',
    'lectio',
    '📖',
    'Varhaiskirkon ja luostarielämän klassinen menetelmä, jossa Raamattua ei lueta nopeasti tiedon vuoksi, vaan kuunnellen Jumalan henkilökohtaista puhetta.',
    'Lectio Divina (jumalallinen tai hengellinen lukeminen) on 200-luvulla alkunsa saanut ja benediktiinimunkki Guigo II:n 1100-luvulla jäsentämä nelivaiheinen rukousmenetelmä. Se avaa Raamatun tekstin kuin kirjeen Jumalalta.',
    40,
    TRUE,
    TRUE,
    '[
      {
        "id": "lectio-scripture",
        "type": "scripture",
        "data": {
          "reference": "Ps. 23:1–4",
          "text": "Herra on minun paimeneni, ei minulta mitään puutu. Hän vie minut vihreille niityille, hän johtaa minut vetten ääreen, siellä saan levätä. Hän virvoittaa minun sieluni, hän ohjaa minua oikeaa tietä nimensä kunnian tähden.",
          "translation": "KR92"
        }
      },
      {
        "id": "lectio-steps",
        "type": "steps_guide",
        "data": {
          "title": "Lectio Divina — Neljä askelta",
          "layout": "cards",
          "steps": [
            {"step":1,"latin":"Lectio","name":"Lue (Lukeminen)","guidance":"Lue valittu lyhyt raamatunkohta (esim. 3–5 jaetta) hitaasti ja ääneen tai ajatuksella. Kuuntele jokaista sanaa."},
            {"step":2,"latin":"Meditatio","name":"Mieti (Märehtiminen)","guidance":"Mikä sana tai lause jäi soimaan sydämessäsi? Toista sitä hiljaa mielessäsi. Anna sanan koskettaa omaa elämäntilannettasi."},
            {"step":3,"latin":"Oratio","name":"Rukoile (Sydämen vastaus)","guidance":"Puhu Jumalalle rehellisesti siitä, mitä tämä sana herätti sinussa. Käännä ajatuksesi, toiveesi ja pelkosi rukoukseksi."},
            {"step":4,"latin":"Contemplatio","name":"Lepää (Katselu Jumalassa)","guidance":"Lopeta sanat ja ajatukset. Lepää Jumalan läsnäolossa kuin ystävän hiljaisessa seurassa. Olet rakastettu."}
          ]
        }
      },
      {
        "id": "lectio-silence",
        "type": "silence_timer",
        "data": {
          "title": "Contemplatio — Hiljainen lepo Sanan äärellä",
          "defaultMinutes": 5,
          "chimeType": "singing_bowl",
          "guidingPrompt": "Anna kuulemasi Sanan laskeutua sydämeesi hiljaisuudessa."
        }
      }
    ]'::jsonb
),
(
    NULL,
    'examen',
    'examen',
    'Päivän katselmus (Examen)',
    'Rukouksellinen katsaus kuluneeseen vuorokauteen',
    'examen',
    '🌙',
    'Lempeä iltarukous ja päivän katselu, joka auttaa huomaamaan Jumalan läsnäolon arjen pienissä asioissa ja nukahtamaan rauhassa.',
    'Päivän katselmus (Examen) on vuosisatoja vanha kristillinen iltahiljentyminen. Tavoitteena ei ole suorittaa tai arvostella itseään, vaan katsoa kulunutta päivää Jumalan rakastavien silmien läpi.',
    50,
    TRUE,
    TRUE,
    '[
      {
        "id": "examen-steps",
        "type": "steps_guide",
        "data": {
          "title": "Päivän katselmuksen viisi askelta",
          "layout": "cards",
          "steps": [
            {"step":1,"title":"1. Asettuminen valoon","desc":"Hiljenny. Muista, että Jumala katsoo sinua tässä hetkessä rakkaudella ja myötätunnolla."},
            {"step":2,"title":"2. Kiitos päivän lahjoista","desc":"Mistä asioista tänään olet kiitollinen? Aamukahvista, ystävällisestä sanasta, luonnosta, selviytymisestä."},
            {"step":3,"title":"3. Päivän läpikäynti","desc":"Käy mielessäsi läpi aamu, iltapäivä ja ilta. Missä hetkissä tunsit iloa, rauhaa tai rakkautta? Missä tunsit ahdistusta tai levottomuutta?"},
            {"step":4,"title":"4. Sovitus ja anteeksianto","desc":"Tunnusta se, missä toimit väärin tai satutit muita. Ota vastaan Jumalan anteeksiantamus ja armahda myös itseäsi."},
            {"step":5,"title":"5. Katse huomiseen","desc":"Anna huominen päivä Jumalan käsiin. Pyydä Hänen siunaustaan tulevaan yöhön ja lepoon."}
          ]
        }
      },
      {
        "id": "examen-prayer",
        "type": "prayer",
        "data": {
          "title": "Iltarukous",
          "content": "Valvo kanssamme, Herra, kun yö saapuu. Anna enkeleidesi suojella kotiamme ja läheisiämme. Anna meille rauhallinen uni ja herätä meidät uuteen aamuun sinun armossasi.",
          "amen": "Aamen."
        }
      }
    ]'::jsonb
),
(
    NULL,
    'advent_children',
    'advent_children',
    'Lasten adventti- ja kynttilähetki',
    'Perheen yhteinen kynttilän sytytys, kertomus ja rukous',
    'advent',
    '🕯️',
    'Lämminhenkinen lasten ja perheiden rukoushetki, jossa sytytetään adventtikynttilät yhdessä koskettamalla, kuullaan jouluinen kertomus ja rukoillaan.',
    'Adventti tarkoittaa saapumista ja odotusta. Joka sunnuntai ennen joulua sytytämme uuden kynttilän tuomaan valoa, toivoa, rauhaa, iloa ja rakkautta talven pimeyteen. Lapset voivat itse sytyttää kynttilät koskettamalla niitä!',
    60,
    TRUE,
    TRUE,
    '[
      {
        "id": "advent-candles",
        "type": "candle_lighting",
        "data": {
          "title": "Sytytä adventtikynttilät",
          "subtitle": "Kosketa tai klikkaa kynttilää sytyttääksesi tai sammuttaaksesi sen!",
          "maxCandles": 4,
          "initialLitCount": 1,
          "interactive": true,
          "candleColor": "white",
          "candles": [
            {
              "index": 1,
              "label": "1. Adventti: Odotuksen ja toivon kynttilä",
              "verse": "Olkaa iloiset, sillä Kuninkaanne saapuu!",
              "prayer": "Rakas Jeesus, kiitos että tuot valon pimeän keskelle. Auta meitä odottamaan joulua iloisella mielellä."
            },
            {
              "index": 2,
              "label": "2. Adventti: Rauhan kynttilä",
              "verse": "Hän tuo rauhan koko maailmaan.",
              "prayer": "Rakas Taivaan Isä, anna rauha jokaiseen kotiin, kouluun ja päiväkotiin."
            },
            {
              "index": 3,
              "label": "3. Adventti: Ilon ja valmistautumisen kynttilä",
              "verse": "Valmistakaa tie Herralle!",
              "prayer": "Kiitos kaikista ystävistä ja läheisistä. Auta meitä jakamaan iloa ja auttamaan toisiamme."
            },
            {
              "index": 4,
              "label": "4. Adventti: Rakkauden ja enkelien kynttilä",
              "verse": "Kunnia Jumalalle korkeuksissa ja maan päällä rauha!",
              "prayer": "Kiitos Jeesus-lapsesta ja rakkaudesta, joka lämmittää sydämemme. Siunaa perheemme joulu. Aamen."
            }
          ]
        }
      },
      {
        "id": "advent-story",
        "type": "children_story",
        "data": {
          "title": "Pieni tähti ja kynttilän valo",
          "storyText": "Kauan sitten Betlehemin yllä syttyi kirkas tähti. Se ei ollut pelottava eikä kylmä, vaan sen valo oli lämmin kuin kynttilän liekki ikkunalla.\n\nKun paimenet kedolla näkivät valon, heidän pelkonsa haihtui. Enkeli sanoi heille: \"Älkää pelätkö! Minä ilmoitan teille suuren ilon, joka on tuleva kaikelle kansalle.\"\n\nAina kun sytytämme kynttilän kotona tai kirkossa, muistamme, että Jumalan valo ja rakkaus on aivan lähellä meitä jokaista – niin pientä kuin suurtakin.",
          "reflectionQuestion": "Mikä asia tuo sinulle tänään iloa ja turvallisen mielen?",
          "childrenPrayer": "Rakas Taivaan Isä, kiitos kynttilän lämpimästä valosta. Suojele kaikkia lapsia, äitejä, isiä ja isovanhempia. Ole meidän kanssamme tänään ja aina. Aamen."
        }
      },
      {
        "id": "advent-hymn",
        "type": "hymn",
        "data": {
          "number": "Virsi 13 / Lasten virsi",
          "title": "Nyt sytytämme kynttilän",
          "verses": "1. Nyt sytytämme kynttilän, se liekkiin leimahtaa. Me odotamme Jeesusta, seimessä nukkuvaa.",
          "hint": "Voidaan laulaa yhdessä kynttilöiden palaessa"
        }
      },
      {
        "id": "advent-blessing",
        "type": "blessing",
        "data": {
          "title": "Lasten siunaus",
          "text": "Herra olkoon sinun edessäsi näyttämässä oikeaa tietä. Herra olkoon sinun vierelläsi sulkemassa sinut syliinsä. Herra olkoon sinun takanasi suojelemassa sinua. Isän ja Pojan ja Pyhän Hengen nimeen. Aamen."
        }
      }
    ]'::jsonb
)
ON CONFLICT DO NOTHING;
