/**
 * Static Curated Meditations Service
 *
 * Provides classical Lutheran and Christian meditative traditions:
 * 1. Martin Lönnebo's Prayer Beads (Frälsarkransen / Rukoushelmet)
 * 2. Martin Luther's Catechism Meditation (Nelisäikeinen seppele / Simple Way to Pray)
 * 3. The Jesus Prayer & Breath Prayer (Sydämen rukous ja huokausrukous)
 * 4. Lectio Divina (Hengellinen kuunteleva lukeminen)
 * 5. Prayer of the Day / Examen (Päivän katselmus)
 */

import { getSetting } from './settingsService.js';

export const MEDITATIONS = [
  {
    id: 'lonnebo_beads',
    title: 'Martin Lönnebon rukoushelmet',
    subtitle: '18 helmen matka arjen ja elämän läpi (Frälsarkransen)',
    category: 'rukoushelmet',
    icon: '📿',
    shortDescription: 'Piispa Martin Lönnebon kehittämä 18 helmen rukousnauha auttaa hiljentymään, keskittymään ja kantamaan koko elämän Jumalan eteen.',
    introduction: 'Ruotsalaisen piispan Martin Lönnebon (1930–2020) vuonna 1995 kehittämät Rukoushelmet (Frälsarkransen) ovat nousseet laajasti rakastetuksi rukouksen ja hiljentymisen välineeksi pohjoismaisissa luterilaisissa kirkoissa. Helminauhassa on 18 helmeä, joista jokaisella on oma nimensä, merkityksensä ja rukouksensa. Voit kulkea helmet läpi järjestyksessä tai pysähtyä juuri siihen helmeen, joka puhuttelee sinua tänään.',
    beads: [
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
    ],
  },
  {
    id: 'luther_wreath',
    title: 'Martti Lutherin katekismusmeditaatio',
    subtitle: 'Nelisäikeinen seppele henkilökohtaiseen rukoukseen',
    category: 'luther',
    icon: '🌹',
    shortDescription: 'Vuonna 1535 Luther neuvoi parturiaan Peteriä sitomaan jokaisesta sanasta nelisäikeisen rukousseppeleen: opiksi, kiitokseksi, tunnustukseksi ja pyynnöksi.',
    introduction: 'Keväällä 1535 Martti Lutherin luottoparturi Peter Beskendorf kysyi tohtorilta: "Miten minun tulisi rukoilla?" Luther vastasi kirjoittamalla pienen teoksen "Yksinkertainen tapa rukoilla" (Ein einfältige Weise zu beten). Siinä Luther opastaa sitomaan jokaisesta Katekismuksen tai Raamatun kohdasta nelisäikeisen seppeleen (viersträhniger Kranz): 1. Mitä Jumala minulle tässä opettaa? 2. Mistä saan kiittää? 3. Missä tunnustan syntini? 4. Mitä pyydän itselleni ja toisille?',
    strands: [
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
    ],
    examples: [
      {
        id: 'first_commandment',
        title: '1. Käsky: "Minä olen Herra, sinun Jumalasi. Sinulla ei saa olla muita jumalia."',
        strands: [
          { strand: 1, text: 'Opiksi: Jumala tahtoo olla minun ainoa turvani ja korkein hyvämme. Hän opettaa, että luotan Häneen kaikessa ja pidän Häntä ainoana todellisena elämäni Herrana.' },
          { strand: 2, text: 'Kiitokseksi: Kiitän sinua, rakas Isä, että olet ilmoittanut itsesi minulle, etkä jätä minua eksyksiin epäjumalien ja pelkojen keskelle. Kiitos uskollisuudestasi ja varjeluksestasi.' },
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
    ],
  },
  {
    id: 'jesus_prayer',
    title: 'Sydämen rukous ja Jeesus-rukous',
    subtitle: 'Huokausrukous ja hengityksen rytmi',
    category: 'huokaus',
    icon: '🕯️',
    shortDescription: 'Vanha kristillinen sydämen rukous, joka yhdistyy tasaiseen hengitykseen ja johdattaa mielen sisäiseen lepoon ja Kristuksen läsnäoloon.',
    introduction: 'Jeesus-rukous ("Herra Jeesus Kristus, Jumalan Poika, armahda minua syntistä") on kristillisen kirkon vanhimpia ja laajimmin harjoitettuja rukoustapoja. Se pohjautuu sokean Bartimaioksen huutoon (Mark. 10:47) ja publikaanin rukoukseen temppelissä (Luuk. 18:13). Kun sanat yhdistetään rauhalliseen ja vapaaseen hengitykseen, rukous vähitellen siirtyy huulilta sydämeen ja rauhoittaa kehon ja mielen.',
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
  },
  {
    id: 'lectio_divina',
    title: 'Lectio Divina (Hengellinen lukeminen)',
    subtitle: 'Raamatun sanan mietiskely neljässä liikkeessä',
    category: 'lectio',
    icon: '📖',
    shortDescription: 'Varhaiskirkon ja luostarielämän klassinen menetelmä, jossa Raamattua ei lueta nopeasti tiedon vuoksi, vaan kuunnellen Jumalan henkilökohtaista puhetta.',
    introduction: 'Lectio Divina (jumalallinen tai hengellinen lukeminen) on 200-luvulla alkunsa saanut ja benediktiinimunkki Guigo II:n 1100-luvulla jäsentämä nelivaiheinen rukousmenetelmä. Se avaa Raamatun tekstin kuin kirjeen Jumalalta, jota maistellaan hitaasti.',
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
  },
  {
    id: 'examen',
    title: 'Päivän katselmus (Examen)',
    subtitle: 'Rukouksellinen katsaus kuluneeseen vuorokauteen',
    category: 'examen',
    icon: '🌙',
    shortDescription: 'Lempeä iltarukous ja päivän katselu, joka auttaa huomaamaan Jumalan läsnäolon arjen pienissä asioissa ja nukahtamaan rauhassa.',
    introduction: 'Päivän katselmus (Examen) on vuosisatoja vanha kristillinen iltahiljentyminen. Se kestää yleensä 10–15 minuuttia päivän päätteeksi. Tavoitteena ei ole suorittaa tai arvostella itseään, vaan katsoa kulunutta päivää Jumalan rakastavien silmien läpi.',
    steps: [
      { step: 1, title: '1. Asettuminen valoon', desc: 'Hiljenny. Muista, että Jumala katsoo sinua tässä hetkessä rakkaudella ja myötätunnolla.' },
      { step: 2, title: '2. Kiitos päivän lahjoista', desc: 'Mistä asioista tänään olet kiitollinen? Aamukahvista, ystävällisestä sanasta, luonnosta, selviytymisestä.' },
      { step: 3, title: '3. Päivän läpikäynti', desc: 'Käy mielessäsi läpi aamu, iltapäivä ja ilta. Missä hetkissä tunsit iloa, rauhaa tai rakkautta? Missä tunsit ahdistusta tai levottomuutta?' },
      { step: 4, title: '4. Sovitus ja anteeksianto', desc: 'Tunnusta se, missä toimit väärin tai satutit muita. Ota vastaan Jumalan anteeksiantamus ja armahda myös itseäsi.' },
      { step: 5, title: '5. Katse huomiseen', desc: 'Anna huominen päivä Jumalan käsiin. Pyydä Hänen siunaustaan tulevaan yöhön ja lepoon.' },
    ],
  },
];

export function getMeditationsList() {
  return MEDITATIONS;
}

export async function getActiveMeditationsList(options = {}) {
  const { includeInactive = false } = options;
  const rawActive = await getSetting(
    'active_meditations',
    JSON.stringify(['lonnebo_beads', 'luther_wreath', 'jesus_prayer', 'lectio_divina', 'examen'])
  );
  let activeIds = ['lonnebo_beads', 'luther_wreath', 'jesus_prayer', 'lectio_divina', 'examen'];
  try {
    activeIds = typeof rawActive === 'string' ? JSON.parse(rawActive) : rawActive;
    if (!Array.isArray(activeIds)) {
      activeIds = ['lonnebo_beads', 'luther_wreath', 'jesus_prayer', 'lectio_divina', 'examen'];
    }
  } catch (e) {
    activeIds = ['lonnebo_beads', 'luther_wreath', 'jesus_prayer', 'lectio_divina', 'examen'];
  }

  return MEDITATIONS.map((m) => ({
    ...m,
    isActive: activeIds.includes(m.id),
  })).filter((m) => includeInactive || m.isActive);
}

export function getMeditationById(id) {
  return MEDITATIONS.find((m) => m.id === id) || null;
}
