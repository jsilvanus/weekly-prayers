/**
 * Meditations Service — Building Blocks Architecture
 *
 * Provides classical Lutheran, Christian, and Family meditative traditions
 * as modular building blocks (`blocks` JSONB), with multi-tenant customization,
 * overrides of system templates, and portal lifting (`portal_position`).
 *
 * Default Traditions:
 * 1. Martin Lönnebo's Prayer Beads (Frälsarkransen / Rukoushelmet)
 * 2. Martin Luther's Catechism Meditation (Nelisäikeinen seppele)
 * 3. The Jesus Prayer & Breath Prayer (Sydämen rukous ja huokausrukous)
 * 4. Lectio Divina (Hengellinen kuunteleva lukeminen)
 * 5. Prayer of the Day / Examen (Päivän katselmus)
 * 6. Children's Advent & Candle Moment (Lasten adventti- ja kynttilähetki)
 */

import { query } from '../db/index.js';
import { getSetting } from './settingsService.js';
import { getTenantBySlugOrId, getTenantHierarchy } from './tenantService.js';

const LONNEBO_BEADS = [
  {
    index: 1,
    name: 'Jumala-helmi',
    color: 'gold',
    colorName: 'Kultainen',
    shape: 'Suuri kultainen litteä helmi',
    symbolism: 'Alku ja loppu, luominen, iankaikkisuus ja Jumalan rajaton rakkaus.',
    scripture: 'Ps. 139:5: "Sinä suojaat minua edestä ja takaa, olet laskenut kätesi minun päälleni."',
    prayer: 'Sinä olet rajaton, sinä olet lähellä. Sinä olet valo ja minä olen sinun. Aamen.',
  },
  {
    index: 2,
    name: 'Hiljaisuuden helmi',
    color: 'pearl',
    colorName: 'Helmiäisvalkoinen',
    shape: 'Pitkulainen kapea helmi',
    symbolism: 'Sanojen taukoaminen, lepo ja Jumalan läsnäolossa oleminen ilman suorittamista.',
    scripture: 'Ps. 62:2: "Vain Jumalan luona on sieluni hiljaa, häneltä tulee minulle apu."',
    prayer: 'Herra, anna minulle hiljaisuuden rauha. Auta minua kuulemaan sydämeni hiljainen kuiskaus.',
  },
  {
    index: 3,
    name: 'Minä-helmi',
    color: 'pearl-small',
    colorName: 'Pieni helmiäisvalkoinen',
    shape: 'Pieni pyöreä helmi',
    symbolism: 'Oma ihmisarvo, haavoittuvuus, Jumalan luomistyö ja aitous omana itsenä.',
    scripture: 'Ps. 139:14: "Minä kiitän sinua siitä, että olen tehty ylen ihmeellisesti."',
    prayer: 'Tässä olen, Jumalani. Olen sinun luomasi, sinun silmissäsi arvokas ja rakastettu. Aamen.',
  },
  {
    index: 4,
    name: 'Kasteen helmi',
    color: 'white',
    colorName: 'Kirkas valkoinen',
    shape: 'Keskikokoinen valkoinen helmi',
    symbolism: 'Uusi alku, puhtaus, kasteen armo ja kutsu elää Jumalan lapsena.',
    scripture: 'Gal. 3:27: "Kaikki te, jotka olette Kristukseen kastettuja, olette pukeneet Kristuksen yllenne."',
    prayer: 'Sinä tunnet minut nimeltä. Sinä olet pessyt minut puhtaaksi. Auta minua aloittamaan alusta tänään.',
  },
  {
    index: 5,
    name: 'Hiljaisuuden helmi',
    color: 'pearl',
    colorName: 'Helmiäisvalkoinen',
    shape: 'Pitkulainen helmi',
    symbolism: 'Kasteen lahjan vastaanottaminen hiljaisuudessa.',
    scripture: 'Jes. 30:15: "Kääntymisessä ja levossa on teidän pelastuksenne, hiljaisuudessa ja luottamuksessa on teidän väkevyytenne."',
    prayer: 'Lepään kasteeni armossa. Sinä kannat minua.',
  },
  {
    index: 6,
    name: 'Autiomaan helmi',
    color: 'sand',
    colorName: 'Hiekanruskea',
    shape: 'Pyöreä ruskea helmi',
    symbolism: 'Kiusaukset, koettelemukset, hengellinen kuivuus ja yksinäisyys elämän taipaleella.',
    scripture: 'Matt. 4:1: "Sitten Henki vei Jeesuksen autiomaahan Paholaisen kiusattavaksi."',
    prayer: 'Kun elämä tuntuu kuivalta ja raskaalta, älä jätä minua yksin. Ole kanssani autiomaassani.',
  },
  {
    index: 7,
    name: 'Hiljaisuuden helmi',
    color: 'pearl',
    colorName: 'Helmiäisvalkoinen',
    shape: 'Pitkulainen helmi',
    symbolism: 'Rauhoittuminen taistelujen keskellä.',
    scripture: 'Ps. 23:4: "Vaikka minä kulkisin pimeässä laaksossa, en pelkäisi mitään pahaa, sillä sinä olet minun kanssani."',
    prayer: 'Sinun sauvasi ja keppisi lohduttavat minua.',
  },
  {
    index: 8,
    name: 'Huolettomuuden helmi',
    color: 'blue',
    colorName: 'Taivaansininen',
    shape: 'Pyöreä sininen helmi',
    symbolism: 'Taakkojen jättäminen, luottamus Jumalan huolenpitoon ja lapsenomainen ilo.',
    scripture: '1. Piet. 5:7: "Heittäkää kaikki murheenne hänen kannettavakseen, sillä hän pitää teistä huolen."',
    prayer: 'Heitän kaikki huoleni sinun kantaaksesi. Anna minulle vapaus ja keveys luottaa sinun hyvyyteesi.',
  },
  {
    index: 9,
    name: 'Hiljaisuuden helmi',
    color: 'pearl',
    colorName: 'Helmiäisvalkoinen',
    shape: 'Pitkulainen helmi',
    symbolism: 'Huolettomuuden syventyminen sielussa.',
    scripture: 'Fil. 4:6–7: "Jumalan rauha, joka ylittää kaiken ymmärryksen, varjelee teidän sydämenne."',
    prayer: 'Sinun rauhasi tulkoon sydämeeni.',
  },
  {
    index: 10,
    name: 'Ensimmäinen rakkauden helmi',
    color: 'red',
    colorName: 'Syvänpunainen',
    shape: 'Pyöreä punainen helmi',
    symbolism: 'Jumalan uhrautuva rakkaus, Kristuksen sovitustyö ja anteeksiantamus.',
    scripture: '1. Joh. 4:10: "Siinä on rakkaus – ei siinä, että me olemme rakastaneet Jumalaa, vaan siinä, että hän on rakastanut meitä."',
    prayer: 'Herra Jeesus, kiitos että rakastit minua ristinkuolemaan asti. Opeta minua vastaanottamaan rakkautesi.',
  },
  {
    index: 11,
    name: 'Toinen rakkauden helmi',
    color: 'red',
    colorName: 'Syvänpunainen',
    shape: 'Pyöreä punainen helmi',
    symbolism: 'Lähimmäisenrakkaus, myötätunto, huolenpito ja lähimmäisen palvelu arjessa.',
    scripture: '1. Joh. 4:11: "Rakkaat ystävät! Jos Jumala on näin meitä rakastanut, mekin olemme velvolliset rakastamaan toisiamme."',
    prayer: 'Avaa sydämeni ja käteni niille, jotka tarvitsevat apuani tänään. Anna minulle silmät nähdä lähimmäiseni.',
  },
  {
    index: 12,
    name: 'Salaisuuksien helmet (3 kpl)',
    color: 'white-small',
    colorName: 'Pienet valkoiset helmet',
    shape: 'Kolme pientä helmiäistä',
    symbolism: 'Sydämen kätketyt asiat: toiveet, rukoukset ja haavat, joille meillä ei vielä ole sanoja.',
    scripture: 'Room. 8:26: "Henki itse rukoilee meidän puolestamme sanattomin huokauksin."',
    prayer: 'Herra, sinä tiedät sen, mitä en osaa edes lausua ääneen. Sinä tunnet sydämeni kätketyimmät salaisuudet.',
  },
  {
    index: 13,
    name: 'Hiljaisuuden helmi',
    color: 'pearl',
    colorName: 'Helmiäisvalkoinen',
    shape: 'Pitkulainen helmi',
    symbolism: 'Salaisuuksien jättäminen Jumalan huomaan.',
    scripture: 'Ps. 131:2: "Olen löytänyt rauhan, mieleni on tyyni niin kuin vieroitetun lapsen äitinsä sylissä."',
    prayer: 'Olen turvassa sinun kämmenelläsi.',
  },
  {
    index: 14,
    name: 'Yön helmi',
    color: 'black',
    colorName: 'Musta helmi',
    shape: 'Pyöreä musta helmi',
    symbolism: 'Kipu, suru, pimeys, epätoivo ja kuolema. Jumala ei hylkää meitä edes pimeimmässä yössä.',
    scripture: 'Ps. 130:1: "Syvyydestä minä huudan sinua, Herra. Herra, kuule minun ääneni!"',
    prayer: 'Kun pimeys saartaa minut ja voimani loppuvat, ole valoni. Muista niitä, jotka tänään surevat tai kärsivät.',
  },
  {
    index: 15,
    name: 'Hiljaisuuden helmi',
    color: 'pearl',
    colorName: 'Helmiäisvalkoinen',
    shape: 'Pitkulainen helmi',
    symbolism: 'Yön ja surun jälkeinen hiljainen odotus.',
    scripture: 'Ps. 30:6: "Illalla on vieraana itku, mutta aamulla ilo."',
    prayer: 'Herra, odotan sinua niin kuin aamuvahti aamua.',
  },
  {
    index: 16,
    name: 'Ylösnousemuksen helmi',
    color: 'yellow',
    colorName: 'Keltainen / Kirkas valo',
    shape: 'Pyöreä valoisa keltainen helmi',
    symbolism: 'Elämän voitto kuolemasta, toivo, Kristuksen ylösnousemus ja uusi aamu.',
    scripture: '1. Kor. 15:55: "Kuolema on nielty ja voitto saatu. Missä on voittosi, kuolema?"',
    prayer: 'Ylösnoussut Kristus, sinä olet voittanut kuoleman ja pimeyden. Anna minulle uusi toivo ja rohkeus elää!',
  },
  {
    index: 17,
    name: 'Hiljaisuuden helmi',
    color: 'pearl',
    colorName: 'Helmiäisvalkoinen',
    shape: 'Pitkulainen helmi',
    symbolism: 'Kiitollinen lepo Jumalan ikuisessa valossa.',
    scripture: 'Ilm. 21:5: "Katso, minä teen kaiken uudeksi."',
    prayer: 'Ylistetty olkoon Jumala, meidän Herramme Jeesuksen Kristuksen Isä.',
  },
  {
    index: 18,
    name: 'Paluu Jumala-helmeen',
    color: 'gold',
    colorName: 'Kultainen',
    shape: 'Suuri kultainen helmi',
    symbolism: 'Matka päättyy sinne, mistä se alkoi: Jumalan iankaikkiseen syliin.',
    scripture: 'Room. 11:36: "Hänestä, hänen kauttaan ja häneen on kaikki. Hänen on kunnia ikuisesti. Aamen."',
    prayer: 'Isän ja Pojan ja Pyhän Hengen nimeen. Aamen.',
  },
];

const LUTHER_STRANDS = [
  {
    strand: 1,
    name: '1. Säie: Opiksi (Instruction)',
    question: 'Mitä Jumala opettaa minulle tässä sanassa?',
    explanation: 'Kuuntele tekstiä kuin Jumalan koulussa. Mitä Jumala tahtoo minun ymmärtävän, tietävän ja uskovan?',
  },
  {
    strand: 2,
    name: '2. Säie: Kiitokseksi (Thanksgiving)',
    question: 'Mistä saan kiittää Jumalaa tämän sanan pohjalta?',
    explanation: 'Jokainen Jumalan sana tai käsky pitää sisällään valtavan lahjan ja suojeluksen. Kiitä Jumalaa Hänen armostaan, varjeluksestaan ja lahjoistaan.',
  },
  {
    strand: 3,
    name: '3. Säie: Tunnustukseksi (Confession)',
    question: 'Missä olen epäonnistunut ja rikkonut tätä vastaan?',
    explanation: 'Tarkastele rehellisesti omaa elämääsi ja sydämesi tilaa. Missä olet toiminut vastoin Jumalan tahtoa, laiminlyönyt hyvää tai unohtanut lähimmäisesi? Pyydä anteeksi.',
  },
  {
    strand: 4,
    name: '4. Säie: Pyynnöksi (Supplication)',
    question: 'Mitä pyydän itselleni ja muille tämän toteutumiseksi?',
    explanation: 'Rukoile Pyhää Henkeä avuksi, jotta tämä sana tulisi eläväksi sinussa, seurakunnassasi ja koko maailmassa. Rukoile itsesi, perheesi ja lähimmäistesi puolesta.',
  },
];

const LUTHER_EXAMPLES = [
  {
    id: 'first_commandment',
    title: '1. Käsky: "Minä olen Herra, sinun Jumalasi. Sinulla ei saa olla muita jumalia."',
    strands: [
      { strand: 1, text: 'Opiksi: Jumala tahtoo olla minun ainoa turvani ja korkein hyvämme. Hän opettaa, että luotan Häneen kaikessa ja pidän Häntä ainoana todellisena elämäni Herrana.' },
      { strand: 2, text: 'Kiitokseksi: Kiitän sinua, rakas Isä, että olet ilmoanut itsesi minulle, etkä jätä minua eksyksiin epäjumalien ja pelkojen keskelle. Kiitos uskollisuudestasi ja varjeluksestasi.' },
      { strand: 3, text: 'Tunnustukseksi: Tunnustan, että etsin usein turvaa rahasta, ihmisten hyväksynnästä tai omista voimistani. Olen laiminlyönyt sinun palvelemisesi ja luottanut luotuun enemmän kuin Luojaan.' },
      { strand: 4, text: 'Pyynnöksi: Anna minulle sydän, joka luottaa ja turvaa sinuun silloinkin, kun kaikki muu horjuu. Varjele minua ja läheisiäni kaikista epäjumalista. Aamen.' },
    ],
  },
  {
    id: 'lords_prayer_first',
    title: 'Isä meidän -rukous: "Tulkoon sinun valtakuntasi"',
    strands: [
      { strand: 1, text: 'Opiksi: Jumalan valtakunta tulee kyllä itsestäänkin ilman rukoustamme, mutta me pyydämme, että se tulisi myös meidän luoksemme ja keskellemme.' },
      { strand: 2, text: 'Kiitokseksi: Kiitän sinua, että olet tuonut valtakuntasi ja armosi Poikasi Jeesuksen Kristuksen kautta meidän todellisuuteemme ja antanut sanasi ja sakramenttisi.' },
      { strand: 3, text: 'Tunnustukseksi: Tunnustan, että usein tavoittelen enemmän omaa kunniaani ja oman mieleni mukaista valtaa kuin sinun valtakuntaasi ja vanhurskauttasi.' },
      { strand: 4, text: 'Pyynnöksi: Tule, Herra, ja hallitse minun sydämessäni. Anna valtakuntasi kasvaa seurakunnassamme ja koko maailmassa, tuo rauha sotiin ja lohdutus murheellisille. Aamen.' },
    ],
  },
];

export const MEDITATIONS = [
  {
    id: 'lonnebo_beads',
    slug: 'lonnebo_beads',
    template_key: 'lonnebo_beads',
    title: 'Martin Lönnebon rukoushelmet',
    subtitle: '18 helmen matka arjen ja elämän läpi (Frälsarkransen)',
    category: 'rukoushelmet',
    icon: '📿',
    shortDescription: 'Piispa Martin Lönnebon kehittämä 18 helmen rukousnauha auttaa hiljentymään, keskittymään ja kantamaan koko elämän Jumalan eteen.',
    introduction: 'Ruotsalaisen piispan Martin Lönnebon (1930–2020) vuonna 1995 kehittämät Rukoushelmet (Frälsarkransen) ovat nousseet laajasti rakastetuksi rukouksen ja hiljentymisen välineeksi pohjoismaisissa luterilaisissa kirkoissa. Helminauhassa on 18 helmeä, joista jokaisella on oma nimensä, merkityksensä ja rukouksensa. Voit kulkea helmet läpi järjestyksessä tai pysähtyä juuri siihen helmeen, joka puhuttelee sinua tänään.',
    display_order: 10,
    is_published: true,
    is_system_template: true,
    portal_position: null,
    beads: LONNEBO_BEADS,
    blocks: [
      {
        id: 'lonnebo-intro',
        type: 'intro',
        data: {
          title: 'Rukoushelmien matka',
          content: 'Voit kulkea helmet läpi järjestyksessä tai pysähtyä juuri siihen helmeen, joka puhuttelee sinua tänään. Kosketa helmeä lukeaksesi sen merkityksen, raamatunkohdan ja rukouksen.',
        },
      },
      {
        id: 'lonnebo-sequence',
        type: 'bead_sequence',
        data: {
          title: 'Rukousnauhan 18 helmeä',
          beads: LONNEBO_BEADS,
        },
      },
    ],
  },
  {
    id: 'luther_wreath',
    slug: 'luther_wreath',
    template_key: 'luther_wreath',
    title: 'Martti Lutherin katekismusmeditaatio',
    subtitle: 'Nelisäikeinen seppele henkilökohtaiseen rukoukseen',
    category: 'luther',
    icon: '🌹',
    shortDescription: 'Vuonna 1535 Luther neuvoi parturiaan Peteriä sitomaan jokaisesta sanasta nelisäikeisen rukousseppeleen: opiksi, kiitokseksi, tunnustukseksi ja pyynnöksi.',
    introduction: 'Keväällä 1535 Martti Lutherin luottoparturi Peter Beskendorf kysyi tohtorilta: "Miten minun tulisi rukoilla?" Luther vastasi kirjoittamalla pienen teoksen "Yksinkertainen tapa rukoilla" (Ein einfältige Weise zu beten). Siinä Luther opastaa sitomaan jokaisesta Katekismuksen tai Raamatun kohdasta nelisäikeisen seppeleen (viersträhniger Kranz): 1. Mitä Jumala minulle tässä opettaa? 2. Mistä saan kiittää? 3. Missä tunnustan syntini? 4. Mitä pyydän itselleni ja toisille?',
    display_order: 20,
    is_published: true,
    is_system_template: true,
    portal_position: null,
    strands: LUTHER_STRANDS,
    examples: LUTHER_EXAMPLES,
    blocks: [
      {
        id: 'luther-strands',
        type: 'multi_strand',
        data: {
          title: 'Nelisäikeinen seppele (Viersträhniger Kranz)',
          description: 'Luther neuvoo ottamaan minkä tahansa Katekismuksen osan tai Raamatun jakeen ja kutomaan siitä nelisäikeisen seppeleen Jumalan eteen:',
          strands: LUTHER_STRANDS,
          examples: LUTHER_EXAMPLES,
        },
      },
    ],
  },
  {
    id: 'jesus_prayer',
    slug: 'jesus_prayer',
    template_key: 'jesus_prayer',
    title: 'Sydämen rukous ja Jeesus-rukous',
    subtitle: 'Huokausrukous ja hengityksen rytmi',
    category: 'huokaus',
    icon: '🕯️',
    shortDescription: 'Vanha kristillinen sydämen rukous, joka yhdistyy tasaiseen hengitykseen ja johdattaa mielen sisäiseen lepoon ja Kristuksen läsnäoloon.',
    introduction: 'Jeesus-rukous ("Herra Jeesus Kristus, Jumalan Poika, armahda minua syntistä") on kristillisen kirkon vanhimpia ja laajimmin harjoitettuja rukoustapoja. Se pohjautuu sokean Bartimaioksen huutoon (Mark. 10:47) ja publikaanin rukoukseen temppelissä (Luuk. 18:13). Kun sanat yhdistetään rauhalliseen ja vapaaseen hengitykseen, rukous vähitellen siirtyy huulilta sydämeen ja rauhoittaa kehon ja mielen.',
    display_order: 30,
    is_published: true,
    is_system_template: true,
    portal_position: null,
    breathingGuide: {
      inBreath: 'Herra Jeesus Kristus, Jumalan Poika (Hengitä sisään Jumalan rauhaa ja elämää)',
      outBreath: 'Armahda minua (Hengitä ulos huoli, kiire ja synti)',
      alternativeShort: 'Sisäänhengitys: "Herra Jeesus" — Uloshengitys: "Armahda"',
    },
    steps: [
      { step: 1, title: 'Asetu lepoon', desc: 'Istu mukavasti ryhdikkäässä mutta rentoutuneessa asennossa. Laske kädet syliin ja sulje silmät.' },
      { step: 2, title: 'Havannoi hengitystäsi', desc: 'Älä yritä muuttaa hengitystäsi väkisin. Anna hengityksen tasaantua luonnolliseen rytmiinsä muutaman minuutin ajan.' },
      { step: 3, title: 'Liitä rukous hengitykseen', desc: 'Hengitä sisään sanoen hiljaa mielessäsi: "Herra Jeesus Kristus, Jumalan Poika". Hengitä ulos sanoen: "Armahda minua".' },
      { step: 4, title: 'Palaa lempeästi keskukseen', desc: 'Kun ajatuksesi harhailevat arjen asioihin, älä suutu itsellesi. Huomaa ajatus ja palaa levollisesti takaisin Jeesuksen nimeen.' },
    ],
    blocks: [
      {
        id: 'jesus-breath',
        type: 'breathing_timer',
        data: {
          title: 'Hengitys ja Jeesus-rukous',
          inBreath: 'Herra Jeesus Kristus, Jumalan Poika',
          inBreathHint: 'Hengitä sisään Jumalan rauhaa ja elämää',
          outBreath: 'Armahda minua syntistä',
          outBreathHint: 'Hengitä ulos huoli, kiire ja synti',
          alternativeShort: 'Sisäänhengitys: "Herra Jeesus" — Uloshengitys: "Armahda"',
          cycleSeconds: 5,
        },
      },
      {
        id: 'jesus-steps',
        type: 'steps_guide',
        data: {
          title: 'Sydämen rukouksen neljä vaihetta',
          layout: 'grid',
          steps: [
            { step: 1, title: 'Asetu lepoon', desc: 'Istu mukavasti ryhdikkäässä mutta rentoutuneessa asennossa. Laske kädet syliin ja sulje silmät.' },
            { step: 2, title: 'Havannoi hengitystäsi', desc: 'Älä yritä muuttaa hengitystäsi väkisin. Anna hengityksen tasaantua luonnolliseen rytmiinsä muutaman minuutin ajan.' },
            { step: 3, title: 'Liitä rukous hengitykseen', desc: 'Hengitä sisään sanoen hiljaa mielessäsi: "Herra Jeesus Kristus, Jumalan Poika". Hengitä ulos sanoen: "Armahda minua".' },
            { step: 4, title: 'Palaa lempeästi keskukseen', desc: 'Kun ajatuksesi harhailevat arjen asioihin, älä suutu itsellesi. Huomaa ajatus ja palaa levollisesti takaisin Jeesuksen nimeen.' },
          ],
        },
      },
      {
        id: 'jesus-silence',
        type: 'silence_timer',
        data: {
          title: 'Hiljainen rukoushetki',
          defaultMinutes: 3,
          chimeType: 'singing_bowl',
          guidingPrompt: 'Lepää Jeesuksen nimen suojassa ja hiljaisuudessa.',
        },
      },
    ],
  },
  {
    id: 'lectio_divina',
    slug: 'lectio_divina',
    template_key: 'lectio_divina',
    title: 'Lectio Divina (Hengellinen lukeminen)',
    subtitle: 'Raamatun sanan mietiskely neljässä liikkeessä',
    category: 'lectio',
    icon: '📖',
    shortDescription: 'Varhaiskirkon ja luostarielämän klassinen menetelmä, jossa Raamattua ei lueta nopeasti tiedon vuoksi, vaan kuunnellen Jumalan henkilökohtaista puhetta.',
    introduction: 'Lectio Divina (jumalallinen tai hengellinen lukeminen) on 200-luvulla alkunsa saanut ja benediktiinimunkki Guigo II:n 1100-luvulla jäsentämä nelivaiheinen rukousmenetelmä. Se avaa Raamatun tekstin kuin kirjeen Jumalalta, jota maistellaan hitaasti.',
    display_order: 40,
    is_published: true,
    is_system_template: true,
    portal_position: null,
    steps: [
      {
        step: 1,
        latin: 'Lectio',
        name: 'Lue (Lukeminen)',
        guidance: 'Lue valittu lyhyt raamatunkohta (esim. 3–5 jaetta) hitaasti ja ääneen tai ajatuksella. Kuuntele jokaista sanaa.',
      },
      {
        step: 2,
        latin: 'Meditatio',
        name: 'Mieti (Märehtiminen)',
        guidance: 'Mikä sana tai lause jäi soimaan sydämessäsi? Toista sitä hiljaa mielessäsi. Anna sanan koskettaa omaa elämäntilannettasi.',
      },
      {
        step: 3,
        latin: 'Oratio',
        name: 'Rukoile (Sydämen vastaus)',
        guidance: 'Puhu Jumalalle rehellisesti siitä, mitä tämä sana herätti sinussa. Käännä ajatuksesi, toiveesi ja pelkosi rukoukseksi.',
      },
      {
        step: 4,
        latin: 'Contemplatio',
        name: 'Lepää (Katselu Jumalassa)',
        guidance: 'Lopeta sanat ja ajatukset. Lepää Jumalan läsnäolossa kuin ystävän hiljaisessa seurassa. Olet rakastettu.',
      },
    ],
    blocks: [
      {
        id: 'lectio-scripture',
        type: 'scripture',
        data: {
          reference: 'Ps. 23:1–4',
          text: 'Herra on minun paimeneni, ei minulta mitään puutu. Hän vie minut vihreille niityille, hän johtaa minut vetten ääreen, siellä saan levätä. Hän virvoittaa minun sieluni, hän ohjaa minua oikeaa tietä nimensä kunnian tähden.',
          translation: 'KR92',
        },
      },
      {
        id: 'lectio-steps',
        type: 'steps_guide',
        data: {
          title: 'Lectio Divina — Hengellinen lukeminen',
          layout: 'cards',
          steps: [
            { step: 1, latin: 'Lectio', name: 'Lue (Lukeminen)', guidance: 'Lue valittu lyhyt raamatunkohta (esim. 3–5 jaetta) hitaasti ja ääneen tai ajatuksella. Kuuntele jokaista sanaa.' },
            { step: 2, latin: 'Meditatio', name: 'Mieti (Märehtiminen)', guidance: 'Mikä sana tai lause jäi soimaan sydämessäsi? Toista sitä hiljaa mielessäsi. Anna sanan koskettaa omaa elämäntilannettasi.' },
            { step: 3, latin: 'Oratio', name: 'Rukoile (Sydämen vastaus)', guidance: 'Puhu Jumalalle rehellisesti siitä, mitä tämä sana herätti sinussa. Käännä ajatuksesi, toiveesi ja pelkosi rukoukseksi.' },
            { step: 4, latin: 'Contemplatio', name: 'Lepää (Katselu Jumalassa)', guidance: 'Lopeta sanat ja ajatukset. Lepää Jumalan läsnäolossa kuin ystävän hiljaisessa seurassa. Olet rakastettu.' },
          ],
        },
      },
      {
        id: 'lectio-silence',
        type: 'silence_timer',
        data: {
          title: 'Contemplatio — Hiljainen lepo Sanan äärellä',
          defaultMinutes: 5,
          chimeType: 'singing_bowl',
          guidingPrompt: 'Anna kuulemasi Sanan laskeutua sydämeesi hiljaisuudessa.',
        },
      },
    ],
  },
  {
    id: 'examen',
    slug: 'examen',
    template_key: 'examen',
    title: 'Päivän katselmus (Examen)',
    subtitle: 'Rukouksellinen katsaus kuluneeseen vuorokauteen',
    category: 'examen',
    icon: '🌙',
    shortDescription: 'Lempeä iltarukous ja päivän katselu, joka auttaa huomaamaan Jumalan läsnäolon arjen pienissä asioissa ja nukahtamaan rauhassa.',
    introduction: 'Päivän katselmus (Examen) on vuosisatoja vanha kristillinen iltahiljentyminen. Se kestää yleensä 10–15 minuuttia päivän päätteeksi. Tavoitteena ei ole suorittaa tai arvostella itseään, vaan katsoa kulunutta päivää Jumalan rakastavien silmien läpi.',
    display_order: 50,
    is_published: true,
    is_system_template: true,
    portal_position: null,
    steps: [
      { step: 1, title: '1. Asettuminen valoon', desc: 'Hiljenny. Muista, että Jumala katsoo sinua tässä hetkessä rakkaudella ja myötätunnolla.' },
      { step: 2, title: '2. Kiitos päivän lahjoista', desc: 'Mistä asioista tänään olet kiitollinen? Aamukahvista, ystävällisestä sanasta, luonnosta, selviytymisestä.' },
      { step: 3, title: '3. Päivän läpikäynti', desc: 'Käy mielessäsi läpi aamu, iltapäivä ja ilta. Missä hetkissä tunsit iloa, rauhaa tai rakkautta? Missä tunsit ahdistusta tai levottomuutta?' },
      { step: 4, title: '4. Sovitus ja anteeksianto', desc: 'Tunnusta se, missä toimit väärin tai satutit muita. Ota vastaan Jumalan anteeksiantamus ja armahda myös itseäsi.' },
      { step: 5, title: '5. Katse huomiseen', desc: 'Anna huominen päivä Jumalan käsiin. Pyydä Hänen siunaustaan tulevaan yöhön ja lepoon.' },
    ],
    blocks: [
      {
        id: 'examen-steps',
        type: 'steps_guide',
        data: {
          title: 'Päivän katselmuksen viisi askelta',
          layout: 'cards',
          steps: [
            { step: 1, title: '1. Asettuminen valoon', desc: 'Hiljenny. Muista, että Jumala katsoo sinua tässä hetkessä rakkaudella ja myötätunnolla.' },
            { step: 2, title: '2. Kiitos päivän lahjoista', desc: 'Mistä asioista tänään olet kiitollinen? Aamukahvista, ystävällisestä sanasta, luonnosta, selviytymisestä.' },
            { step: 3, title: '3. Päivän läpikäynti', desc: 'Käy mielessäsi läpi aamu, iltapäivä ja ilta. Missä hetkissä tunsit iloa, rauhaa tai rakkautta? Missä tunsit ahdistusta tai levottomuutta?' },
            { step: 4, title: '4. Sovitus ja anteeksianto', desc: 'Tunnusta se, missä toimit väärin tai satutit muita. Ota vastaan Jumalan anteeksiantamus ja armahda myös itseäsi.' },
            { step: 5, title: '5. Katse huomiseen', desc: 'Anna huominen päivä Jumalan käsiin. Pyydä Hänen siunaustaan tulevaan yöhön ja lepoon.' },
          ],
        },
      },
      {
        id: 'examen-prayer',
        type: 'prayer',
        data: {
          title: 'Iltarukous',
          content: 'Valvo kanssamme, Herra, kun yö saapuu. Anna enkeleidesi suojella kotiamme ja läheisiämme. Anna meille rauhallinen uni ja herätä meidät uuteen aamuun sinun armossasi.',
          amen: 'Aamen.',
        },
      },
    ],
  },
  {
    id: 'advent_children',
    slug: 'advent_children',
    template_key: 'advent_children',
    title: 'Lasten adventti- ja kynttilähetki',
    subtitle: 'Perheen yhteinen kynttilän sytytys, kertomus ja rukous',
    category: 'advent',
    icon: '🕯️',
    shortDescription: 'Lämminhenkinen lasten ja perheiden rukoushetki, jossa sytytetään adventtikynttilät yhdessä koskettamalla, kuullaan jouluinen kertomus ja rukoillaan.',
    introduction: 'Adventti tarkoittaa saapumista ja odotusta. Joka sunnuntai ennen joulua sytytämme uuden kynttilän tuomaan valoa, toivoa, rauhaa, iloa ja rakkautta talven pimeyteen. Lapset voivat itse sytyttää kynttilät koskettamalla niitä!',
    display_order: 60,
    is_published: true,
    is_system_template: true,
    portal_position: null,
    blocks: [
      {
        id: 'advent-candles',
        type: 'candle_lighting',
        data: {
          title: 'Sytytä adventtikynttilät',
          subtitle: 'Kosketa tai klikkaa kynttilää sytyttääksesi tai sammuttaaksesi sen!',
          maxCandles: 4,
          initialLitCount: 1,
          interactive: true,
          candleColor: 'white',
          candles: [
            {
              index: 1,
              label: '1. Adventti: Odotuksen ja toivon kynttilä',
              verse: 'Olkaa iloiset, sillä Kuninkaanne saapuu!',
              prayer: 'Rakas Jeesus, kiitos että tuot valon pimeän keskelle. Auta meitä odottamaan joulua iloisella mielellä.',
            },
            {
              index: 2,
              label: '2. Adventti: Rauhan kynttilä',
              verse: 'Hän tuo rauhan koko maailmaan.',
              prayer: 'Rakas Taivaan Isä, anna rauha jokaiseen kotiin, kouluun ja päiväkotiin.',
            },
            {
              index: 3,
              label: '3. Adventti: Ilon ja valmistautumisen kynttilä',
              verse: 'Valmistakaa tie Herralle!',
              prayer: 'Kiitos kaikista ystävistä ja läheisistä. Auta meitä jakamaan iloa ja auttamaan toisiamme.',
            },
            {
              index: 4,
              label: '4. Adventti: Rakkauden ja enkelien kynttilä',
              verse: 'Kunnia Jumalalle korkeuksissa ja maan päällä rauha!',
              prayer: 'Kiitos Jeesus-lapsesta ja rakkaudesta, joka lämmittää sydämemme. Siunaa perheemme joulu. Aamen.',
            },
          ],
        },
      },
      {
        id: 'advent-story',
        type: 'children_story',
        data: {
          title: 'Pieni tähti ja kynttilän valo',
          storyText: 'Kauan sitten Betlehemin yllä syttyi kirkas tähti. Se ei ollut pelottava eikä kylmä, vaan sen valo oli lämmin kuin kynttilän liekki ikkunalla.\n\nKun paimenet kedolla näkivät valon, heidän pelkonsa haihtui. Enkeli sanoi heille: "Älkää pelätkö! Minä ilmoitan teille suuren ilon, joka on tuleva kaikelle kansalle."\n\nAina kun sytytämme kynttilän kotona tai kirkossa, muistamme, että Jumalan valo ja rakkaus on aivan lähellä meitä jokaista – niin pientä kuin suurtakin.',
          reflectionQuestion: 'Mikä asia tuo sinulle tänään iloa ja turvallisen mielen?',
          childrenPrayer: 'Rakas Taivaan Isä, kiitos kynttilän lämpimästä valosta. Suojele kaikkia lapsia, äitejä, isiä ja isovanhempia. Ole meidän kanssamme tänään ja aina. Aamen.',
        },
      },
      {
        id: 'advent-hymn',
        type: 'hymn',
        data: {
          number: 'Virsi 13 / Lasten virsi',
          title: 'Nyt sytytämme kynttilän',
          verses: '1. Nyt sytytämme kynttilän, se liekkiin leimahtaa. Me odotamme Jeesusta, seimessä nukkuvaa.',
          hint: 'Voidaan laulaa yhdessä kynttilöiden palaessa',
        },
      },
      {
        id: 'advent-blessing',
        type: 'blessing',
        data: {
          title: 'Lasten siunaus',
          text: 'Herra olkoon sinun edessäsi näyttämässä oikeaa tietä. Herra olkoon sinun vierelläsi sulkemassa sinut syliinsä. Herra olkoon sinun takanasi suojelemassa sinua. Isän ja Pojan ja Pyhän Hengen nimeen. Aamen.',
        },
      },
    ],
  },
];

const DEFAULT_ACTIVE_IDS = [
  'lonnebo_beads',
  'luther_wreath',
  'jesus_prayer',
  'lectio_divina',
  'examen',
  'advent_children',
];

async function resolveTenantId(tenantSlugOrId) {
  if (tenantSlugOrId) {
    try {
      const t = await getTenantBySlugOrId(tenantSlugOrId);
      if (t) return t.id;
    } catch (_) {
      return null;
    }
  }
  try {
    const hierarchy = await getTenantHierarchy(null);
    return hierarchy?.tenant?.id || null;
  } catch (_) {
    return null;
  }
}

/**
 * Normalize a database row into the unified Meditation shape
 */
function normalizeMeditationRow(row, activeIds = DEFAULT_ACTIVE_IDS) {
  const slugOrKey = row.template_key || row.slug || row.id;
  const fallbackTemplate = MEDITATIONS.find(
    (m) => m.id === slugOrKey || m.slug === row.slug || m.template_key === row.template_key
  );

  let blocks = [];
  if (Array.isArray(row.blocks)) {
    blocks = row.blocks;
  } else if (typeof row.blocks === 'string') {
    try {
      blocks = JSON.parse(row.blocks);
    } catch (_) {
      blocks = fallbackTemplate?.blocks || [];
    }
  } else if (fallbackTemplate?.blocks) {
    blocks = fallbackTemplate.blocks;
  }

  // Extract legacy helper properties from blocks if available
  const beadBlock = blocks.find((b) => b.type === 'bead_sequence');
  const strandBlock = blocks.find((b) => b.type === 'multi_strand');
  const stepsBlock = blocks.find((b) => b.type === 'steps_guide');
  const breathBlock = blocks.find((b) => b.type === 'breathing_timer');

  const isSystem = Boolean(row.is_system_template);
  const isPublished = row.is_published !== false;
  const isActiveInSettings = isSystem
    ? activeIds.includes(slugOrKey) || activeIds.includes(row.slug)
    : true;

  return {
    id: row.slug || row.id,
    dbId: row.id,
    tenant_id: row.tenant_id || null,
    template_key: row.template_key || null,
    slug: row.slug || row.id,
    title: row.title,
    subtitle: row.subtitle || '',
    category: row.category || 'custom',
    icon: row.icon || '📿',
    shortDescription: row.short_description || row.shortDescription || '',
    introduction: row.introduction || '',
    blocks,
    display_order: row.display_order ?? 100,
    is_published: isPublished,
    is_system_template: isSystem,
    portal_position: row.portal_position || null,
    portalPosition: row.portal_position || null,
    isActive: isPublished && isActiveInSettings,
    // Legacy compatibility fields
    beads: beadBlock?.data?.beads || fallbackTemplate?.beads || undefined,
    strands: strandBlock?.data?.strands || fallbackTemplate?.strands || undefined,
    examples: strandBlock?.data?.examples || fallbackTemplate?.examples || undefined,
    steps: stepsBlock?.data?.steps || fallbackTemplate?.steps || undefined,
    breathingGuide: breathBlock?.data || fallbackTemplate?.breathingGuide || undefined,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

/**
 * Synchronous list of built-in meditations
 */
export function getMeditationsList() {
  return MEDITATIONS;
}

/**
 * Synchronous lookup of built-in meditation by ID
 */
export function getMeditationById(id) {
  return MEDITATIONS.find((m) => m.id === id || m.slug === id) || null;
}

/**
 * Async lookup of meditation by ID or slug (checks DB first, falls back to built-in)
 */
export async function getMeditationByIdOrSlug(idOrSlug, tenantSlugOrId = null) {
  try {
    const tenantId = await resolveTenantId(tenantSlugOrId);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    const sql = isUuid
      ? `SELECT * FROM meditations WHERE id = $1 LIMIT 1`
      : `
        SELECT * FROM meditations
        WHERE (slug = $1 OR template_key = $1)
          AND (tenant_id = $2 OR tenant_id IS NULL)
        ORDER BY CASE WHEN tenant_id = $2 THEN 0 ELSE 1 END
        LIMIT 1
      `;

    const params = isUuid ? [idOrSlug] : [idOrSlug, tenantId];
    const res = await query(sql, params);
    if (res.rows[0]) {
      return normalizeMeditationRow(res.rows[0]);
    }
  } catch (_) {
    // Table might not exist yet; fall back to memory
  }
  return getMeditationById(idOrSlug);
}

/**
 * Get active (or all) meditations for a tenant, merging tenant overrides over system templates
 */
export async function getActiveMeditationsList(options = {}) {
  const { includeInactive = false, tenantSlug = null, portalPosition = null } = options;

  const rawActive = await getSetting(
    'active_meditations',
    JSON.stringify(DEFAULT_ACTIVE_IDS)
  );
  let activeIds = [...DEFAULT_ACTIVE_IDS];
  try {
    const parsed = typeof rawActive === 'string' ? JSON.parse(rawActive) : rawActive;
    if (Array.isArray(parsed)) {
      activeIds = parsed;
      // Ensure new default advent_children is available unless explicitly excluded in a newer save
      if (!activeIds.includes('advent_children') && activeIds.length === 5) {
        activeIds.push('advent_children');
      }
    }
  } catch (_) {
    activeIds = [...DEFAULT_ACTIVE_IDS];
  }

  try {
    const tenantId = await resolveTenantId(tenantSlug);
    const sql = `
      SELECT *
      FROM meditations
      WHERE tenant_id = $1 OR tenant_id IS NULL
      ORDER BY display_order ASC, created_at ASC
    `;
    const res = await query(sql, [tenantId]);

    if (res.rows && res.rows.length > 0) {
      // Merge tenant overrides over system templates by template_key / slug
      const byKey = new Map();
      for (const row of res.rows) {
        const key = row.template_key || row.slug;
        const existing = byKey.get(key);
        if (!existing || (row.tenant_id && !existing.tenant_id)) {
          byKey.set(key, row);
        }
      }

      // Ensure all 6 built-in templates exist even if DB only had partial seed
      for (const builtin of MEDITATIONS) {
        if (!byKey.has(builtin.slug)) {
          byKey.set(builtin.slug, {
            ...builtin,
            short_description: builtin.shortDescription,
          });
        }
      }

      const merged = Array.from(byKey.values())
        .map((r) => normalizeMeditationRow(r, activeIds))
        .sort((a, b) => (a.display_order || 100) - (b.display_order || 100));

      return merged.filter((m) => {
        if (portalPosition && m.portal_position !== portalPosition) return false;
        return includeInactive || m.isActive;
      });
    }
  } catch (_) {
    // Graceful fallback if table hasn't been migrated yet
  }

  return MEDITATIONS.map((m) => ({
    ...m,
    isActive: activeIds.includes(m.id),
  })).filter((m) => {
    if (portalPosition && m.portal_position !== portalPosition) return false;
    return includeInactive || m.isActive;
  });
}

/**
 * Create or update a meditation (custom or override of a system template)
 */
export async function saveMeditation(data, user = null) {
  const tenantId = await resolveTenantId(data.tenant || data.tenant_id || user?.tenant_id);
  const title = (data.title || '').trim();
  if (!title) {
    throw new Error('Meditation title is required');
  }

  const slug = (data.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `meditation_${Date.now()}`).slice(0, 100);
  const subtitle = data.subtitle || '';
  const category = data.category || 'custom';
  const icon = data.icon || '📿';
  const shortDescription = data.shortDescription ?? data.short_description ?? '';
  const introduction = data.introduction || '';
  const blocks = Array.isArray(data.blocks) ? data.blocks : [];
  const displayOrder = typeof data.display_order === 'number' ? data.display_order : 100;
  const isPublished = data.is_published !== undefined ? Boolean(data.is_published) : true;
  const portalPosition = ['above', 'below'].includes(data.portal_position || data.portalPosition)
    ? (data.portal_position || data.portalPosition)
    : null;
  const templateKey = data.template_key || null;

  // Check if updating by UUID dbId or existing slug for this tenant
  const isUuid = data.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.id);

  if (isUuid || data.dbId) {
    const targetId = data.dbId || data.id;
    const existingRes = await query('SELECT * FROM meditations WHERE id = $1 LIMIT 1', [targetId]);
    const existing = existingRes.rows[0];

    if (existing) {
      // If editing a global system template directly, either update its portal_position/fields or create tenant override
      const updateSql = `
        UPDATE meditations
        SET title = $1,
            subtitle = $2,
            category = $3,
            icon = $4,
            short_description = $5,
            introduction = $6,
            blocks = $7::jsonb,
            display_order = $8,
            is_published = $9,
            portal_position = $10,
            updated_at = NOW()
        WHERE id = $11
        RETURNING *
      `;
      const updated = await query(updateSql, [
        title,
        subtitle,
        category,
        icon,
        shortDescription,
        introduction,
        JSON.stringify(blocks),
        displayOrder,
        isPublished,
        portalPosition,
        targetId,
      ]);
      return normalizeMeditationRow(updated.rows[0]);
    }
  }

  // Check if slug already exists for this tenant (or global template if matching slug)
  const checkSql = `
    SELECT * FROM meditations
    WHERE slug = $1 AND (tenant_id = $2 OR ($2 IS NULL AND tenant_id IS NULL))
    LIMIT 1
  `;
  const existingBySlug = await query(checkSql, [slug, tenantId]);

  if (existingBySlug.rows[0]) {
    const updateSql = `
      UPDATE meditations
      SET title = $1,
          subtitle = $2,
          category = $3,
          icon = $4,
          short_description = $5,
          introduction = $6,
          blocks = $7::jsonb,
          display_order = $8,
          is_published = $9,
          portal_position = $10,
          updated_at = NOW()
      WHERE id = $11
      RETURNING *
    `;
    const updated = await query(updateSql, [
      title,
      subtitle,
      category,
      icon,
      shortDescription,
      introduction,
      JSON.stringify(blocks),
      displayOrder,
      isPublished,
      portalPosition,
      existingBySlug.rows[0].id,
    ]);
    return normalizeMeditationRow(updated.rows[0]);
  }

  const insertSql = `
    INSERT INTO meditations (
      tenant_id, template_key, slug, title, subtitle, category, icon,
      short_description, introduction, blocks, display_order, is_published,
      is_system_template, portal_position, created_by_user_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, FALSE, $13, $14)
    RETURNING *
  `;
  const inserted = await query(insertSql, [
    tenantId,
    templateKey,
    slug,
    title,
    subtitle,
    category,
    icon,
    shortDescription,
    introduction,
    JSON.stringify(blocks),
    displayOrder,
    isPublished,
    portalPosition,
    user?.id || null,
  ]);
  return normalizeMeditationRow(inserted.rows[0]);
}

/**
 * Update only portal_position ('above' | 'below' | null) for a meditation
 */
export async function updateMeditationPortalPosition(idOrSlug, portalPosition, tenantSlugOrId = null) {
  const validPos = ['above', 'below'].includes(portalPosition) ? portalPosition : null;
  const med = await getMeditationByIdOrSlug(idOrSlug, tenantSlugOrId);
  if (!med) {
    throw new Error('Meditation not found');
  }

  if (med.dbId) {
    const res = await query(
      `UPDATE meditations SET portal_position = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [validPos, med.dbId]
    );
    if (res.rows[0]) return normalizeMeditationRow(res.rows[0]);
  }

  // If built-in wasn't in DB yet, save it with the portal position
  return saveMeditation({
    ...med,
    portal_position: validPos,
    tenant: tenantSlugOrId,
  });
}

/**
 * Delete a custom meditation (system templates cannot be deleted, only unpublished)
 */
export async function deleteMeditation(idOrSlug, tenantSlugOrId = null) {
  const med = await getMeditationByIdOrSlug(idOrSlug, tenantSlugOrId);
  if (!med || !med.dbId) {
    return null;
  }
  if (med.is_system_template && !med.tenant_id) {
    throw new Error('Järjestelmän oletusmeditaatiota ei voi poistaa pysyvästi, mutta sen voi piilottaa.');
  }
  const res = await query('DELETE FROM meditations WHERE id = $1 RETURNING *', [med.dbId]);
  return res.rows[0] ? normalizeMeditationRow(res.rows[0]) : null;
}
