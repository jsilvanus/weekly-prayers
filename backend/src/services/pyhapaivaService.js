import { query } from '../db/index.js';
import { getTenantBySlugOrId, getTenantHierarchy } from './tenantService.js';
import { fetchDayFromAnno } from './annoService.js';

/**
 * Format Date to YYYY-MM-DD in local time
 */
export function toDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD into a local Date object
 */
export function parseDateString(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return new Date();
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return new Date();
  return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
}

/**
 * Add days to a Date or YYYY-MM-DD string
 */
export function addDays(dateInput, days) {
  const d = typeof dateInput === 'string' ? parseDateString(dateInput) : new Date(dateInput);
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

/**
 * Calculate Easter Sunday for a given year (Anonymous Gregorian algorithm)
 */
export function getEasterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day, 12, 0, 0);
}

/**
 * Calculate 1st Sunday of Advent for a given year (Sunday between Nov 27 and Dec 3)
 */
export function getFirstAdventSunday(year) {
  const nov27 = new Date(year, 10, 27, 12, 0, 0);
  const dayOfWeek = nov27.getDay(); // 0 = Sunday
  const offset = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  return new Date(year, 10, 27 + offset, 12, 0, 0);
}

/**
 * Resolve tenant ID from slug, identifier, or fallback to default
 */
async function resolveTenantId(tenantSlugOrId) {
  try {
    if (tenantSlugOrId) {
      const t = await getTenantBySlugOrId(tenantSlugOrId);
      if (t) return t.id;
    }
    const hierarchy = await getTenantHierarchy(null);
    return hierarchy?.tenant?.id || null;
  } catch (err) {
    return 'e2000000-0000-0000-0000-000000000010';
  }
}

/**
 * Authentic EVL Evankeliumikirja Lectionary Catalog for Sundays and Holy Days
 */
const HOLY_DAY_CATALOG = {
  '1_advent': {
    code: '1_advent',
    name: '1. adventtisunnuntai',
    latinName: 'Dominica I Adventus',
    season: 'Adventtiaika',
    color: { color: 'valkoinen', english: 'white', description: 'Riemun, kiitoksen ja Kristuksen kuninkuuden väri (1. adventti)' },
    heading: 'Sinun kuninkaasi tulee',
    description: 'Ensimmäisenä adventtisunnuntaina alkaa uusi kirkkovuosi. Päivän tekstit puhuvat Jeesuksen ratsastamisesta Jerusalemiin nöyränä rauhan kuninkaana. Seurakunta laulaa Hoosiannaa ja valmistautuu ottamaan vastaan Vapahtajan.',
    collect: 'Rakas taivaallinen Isä. Me kiitämme sinua Poikasi Jeesuksen Kristuksen tulemisesta maailmaan. Hän on meidän Vapahtajamme ja elämämme kuningas. Valmista sydämemme ottamaan hänet vastaan. Kuule meitä Poikasi Jeesuksen Kristuksen, meidän Herramme tähden. Aamen.',
    psalm: {
      antiphon: 'Siunattu olkoon hän, joka tulee Herran nimessä! Hoosianna korkeuksissa! (Matt. 21:9)',
      reference: 'Ps. 24:1–10',
      text: 'Herran on maa ja kaikki mitä siinä on,\nmaanpiiri ja ne jotka siinä asuvat.\nHän on perustanut sen merten päälle,\nlujittanut sen virtojen ylle.\nKuka saa nousta Herran vuorelle,\nkuka astua hänen pyhään paikkaansa?\nNostakaa päähänne, te portit,\nnouskaa, te ikuiset ovet,\nniin kunnian kuningas käy sisään!\nKuka on tuo kunnian kuningas?\nHän on Herra, väkevä ja voimallinen,\nHerra, sotaväen Jumala – hän on kunnian kuningas!'
    },
    readings: {
      KR92: {
        firstReading: {
          label: '1. lukukappale',
          reference: 'Sak. 9:9–10',
          text: 'Iloitse suuresti, tytär Siion, riemuitse, tytär Jerusalem! Katso, kuninkaasi tulee sinun luoksesi! Hän on oikeamielinen ja voittoisa, hän on nöyrä ja ratsastaa aasilla, aasintammansa varsalla. Hän hävittää sotavaunut Efraimista ja hevoset Jerusalemista, sotajouset murretaan, ja hän julistaa rauhaa kansoille. Hänen valtansa ulottuu merestä mereen, Eufratvirrasta maan ääriin saakka.'
        },
        secondReading: {
          label: '2. lukukappale',
          reference: 'Room. 13:11–14',
          text: 'Te tiedätte, millainen aika nyt on käsillä: teidän on jo hetki herätä unesta. Pelastus on nyt meitä lähempänä kuin silloin, kun aloimme uskoa. Yö on kulunut pitkälle, päivä jo sarastaa. Hylätkäämme siis pimeyden teot ja pukeutukaamme valon varustukseen. Eläkäämme säädyllisesti niin kuin päivällä eletään. Pukekaa yllenne Herra Jeesus Kristus.'
        },
        gospel: {
          label: 'Evankeliumi',
          reference: 'Matt. 21:1–9',
          acclamation: 'Halleluja. Siunattu olkoon hän, joka tulee Herran nimessä! Halleluja.',
          text: 'Kun he lähestyivät Jerusalemia ja tulivat Betfageen Öljymäen rinteelle, Jeesus lähetti edellään kaksi opetuslasta ja sanoi heille: »Menkää tuohon kylään, joka on edessänne. Te löydätte sieltä heti kiinni sidotun aasintamman ja sen vierestä varsan. Päästäkää ne ja tuokaa minulle. Jos joku sanoo teille jotakin, vastatkaa, että Herra tarvitsee niitä mutta palauttaa ne pian.»\nTämä tapahtui, jotta kävisi toteen profeetan sana:\n– Sanokaa tytär Siionille:\nKatso, kuninkaasi tulee luoksesi\nnöyränä ja ratsastaen aasilla,\njuhtana varsalla.\nOpetuslapset menivät ja tekivät niin kuin Jeesus oli käskenyt. He toivat aasin ja varsan ja panivat niiden selkään vaatteitaan, ja Jeesus istuutui aasin selkään. Suuri väkijoukko levitti vaatteitaan tielle, toiset taas katkoivat puista oksia ja levittivät tielle ne. Ja ihmiset, niin ne, jotka kulkivat hänen edellään, kuin ne, jotka seurasivat perässä, huusivat:\n– Hoosianna Daavidin Pojalle! Siunattu olkoon hän, joka tulee Herran nimessä! Hoosianna korkeuksissa!'
        }
      },
      KR38: {
        firstReading: {
          label: '1. lukukappale',
          reference: 'Sak. 9:9–10',
          text: 'Iloitse suuresti, tytär Siion, riemuitse, tytär Jerusalem, sillä sinun kuninkaasi tulee sinulle! Vanhurskas ja auttaja hän on, on nöyrä ja ratsastaa aasilla, aasintamman varsalla. Ja hän julistaa rauhaa pakanoille. Ja hänen herrautensa on ulottuva merestä mereen, Eufrat-virrasta maan ääriin saakka.'
        },
        secondReading: {
          label: '2. lukukappale',
          reference: 'Room. 13:11–14',
          text: 'Ja tehkää tämä, koska tunnette tämän ajan, että jo on hetki teidän unesta nousta; sillä pelastus on nyt meitä lähempänä kuin silloin, kun uskoon tulimme. Yö on pitkälle kulunut, ja päivä on lähellä. Pankaamme sentähden pois pimeyden teot, ja pukeutukaamme valkeuden varustuksiin.'
        },
        gospel: {
          label: 'Evankeliumi',
          reference: 'Matt. 21:1–9',
          acclamation: 'Halleluja. Siunattu olkoon hän, joka tulee Herran nimessä! Halleluja.',
          text: 'Ja kun he lähestyivät Jerusalemia ja tulivat Betfageen, Öljymäelle, silloin Jeesus lähetti kaksi opetuslasta ja sanoi heille: »Menkää kylään, joka on edessänne, niin te kohta löydätte aasintamman sidottuna ja varsan sen kanssa; päästäkää ne ja tuokaa minulle.» ... Ja kansanjoukot, jotka kulkivat hänen edellään ja jotka seurasivat, huusivat sanoen: »Hoosianna Daavidin pojalle! Siunattu olkoon hän, joka tulee Herran nimessä. Hoosianna korkeuksissa!»'
        }
      },
      UT2020: {
        firstReading: {
          label: '1. lukukappale (VT KR92)',
          reference: 'Sak. 9:9–10',
          text: 'Iloitse suuresti, tytär Siion, riemuitse, tytär Jerusalem! Katso, kuninkaasi tulee sinun luoksesi! Hän on oikeamielinen ja voittoisa, hän on nöyrä ja ratsastaa aasilla, aasintammansa varsalla.'
        },
        secondReading: {
          label: '2. lukukappale (UT2020)',
          reference: 'Room. 13:11–14',
          text: 'Tiedättehän, millaista aikaa elämme: teidän on jo korkea aika herätä. Pelastus on nyt lähempänä meitä kuin silloin, kun aloimme uskoa. Yö on jo väistymässä ja päivä koittaa. Riisukaamme siis pimeyden teot ja pukeutukaamme valon varusteisiin. Pukeutukaa Herraan Jeesukseen Kristukseen.'
        },
        gospel: {
          label: 'Evankeliumi (UT2020)',
          reference: 'Matt. 21:1–9',
          acclamation: 'Halleluja. Siunattu olkoon hän, joka tulee Herran nimessä! Halleluja.',
          text: 'Kun he lähestyivät Jerusalemia ja saapuivat Betfageen Öljymäen rinteelle, Jeesus lähetti edeltä kaksi opetuslasta. Hän sanoi heille: »Menkää tuohon edessä olevaan kylään. Heti sinne tultuanne löydätte kiinni sidotun aasintamman ja sen vierestä varsan. Päästäkää ne irti ja tuokaa minulle.» ... Sekä Jeesuksen edellä kulkevat että häntä seuraavat ihmiset huusivat:\n– Hoosianna Daavidin Pojalle! Siunattu olkoon hän, joka tulee Herran nimessä! Hoosianna korkeuksissa!'
        }
      }
    },
    hymnSuggestions: [
      { role: 'Alkuvirsi', number: '1', title: 'Hoosianna, Daavidin Poika' },
      { role: 'Päivän virsi', number: '2', title: 'Avaja porttis, ovesi' },
      { role: 'Saarnavirsi', number: '4', title: 'Iloitse, morsian' },
      { role: 'Ehtoollisvirsi', number: '15', title: 'Tiellä ken vaeltaa' }
    ]
  },
  '2_advent': {
    code: '2_advent',
    name: '2. adventtisunnuntai',
    latinName: 'Dominica II Adventus',
    season: 'Adventtiaika',
    color: { color: 'violetti', english: 'purple', description: 'Odotuksen, valmistautumisen ja parannuksen väri' },
    heading: 'Kuninkaasi tulee kunniassa',
    description: 'Toisena adventtisunnuntaina katse suuntautuu aikojen loppuun ja Kristuksen paluuseen kunniassaan. Samalla rohkaistaan seurakuntaa nostamaan päänsä, sillä vapautus on lähellä.',
    collect: 'Pyhä Jumala, taivaallinen Isä. Sinun Poikasi Jeesus Kristus on luvannut tulla takaisin kunniassaan. Pidä meidät valppaina ja rohkaise meitä toivolla, kun maailman murheet ahdistavat. Tätä pyydämme Herramme Jeesuksen Kristuksen kautta. Aamen.',
    psalm: {
      antiphon: 'Katsokaa: meidän Jumalamme tulee ja pelastaa meidät. (Jes. 35:4)',
      reference: 'Ps. 80:2–4, 15–20',
      text: 'Kuule meitä, Israelin paimen,\nsinä joka kerubien päällä istut, ilmesty loistossasi!\nHerätä voimasi ja tule avuksemme!\nJumala, saata meidät ennallemme,\nanna kasvojesi loistaa, niin me pelastumme!'
    },
    readings: {
      KR92: {
        firstReading: {
          label: '1. lukukappale',
          reference: 'Jes. 35:3–6',
          text: 'Vahvistakaa hervonneet kädet, voimistakaa horjuvat polvet! Sanokaa niille, jotka sydämessään hätäilevät: »Olkaa lujat, älkää pelätkö! Katsokaa, teidän Jumalanne! Kosto lähestyy, Jumalan tuomio tulee. Hän itse tulee ja pelastaa teidät.» Silloin sokeiden silmät avautuvat ja kuurojen korvat aukenevat. Silloin rampa hyppii kuin peura ja mykän kieli riemuitsee.'
        },
        secondReading: {
          label: '2. lukukappale',
          reference: 'Hepr. 10:35–39',
          text: 'Älkää siis heittäkö pois rohkeuttanne, sillä se palkitaan runsaasti. Te tarvitsette kestäväisyyttä, jotta pystyisitte täyttämään Jumalan tahdon ja saavuttaisitte sen, mikä on luvattu. Sillä vielä hetkinen, aivan lyhyt hetki, niin saapuu se, joka on tuleva, hän ei viivy.'
        },
        gospel: {
          label: 'Evankeliumi',
          reference: 'Luuk. 21:25–36',
          acclamation: 'Halleluja. Nostakaa päänne, sillä teidän vapautuksenne on lähellä. Halleluja.',
          text: 'Jeesus sanoi opetuslapsilleen: »Auringossa, kuussa ja tähdissä näkyy merkkejä. Meren aallot pauhaavat ja järkyttävät kansoja, ja ihmiset pelkäävät ja ovat neuvottomia. ... Ja silloin he näkevät Ihmisen Pojan tulevan pilvessä suurella voimalla ja kirkkaudella. Kun tämä alkaa tapahtua, rohkaiskaa mielenne ja nostakaa päänne, sillä teidän vapautuksenne on lähellä.»'
        }
      }
    },
    hymnSuggestions: [
      { role: 'Alkuvirsi', number: '7', title: 'Valmistu, Herran kansa' },
      { role: 'Päivän virsi', number: '10', title: 'Iloitse, kaikki kristikunta' },
      { role: 'Päätösvirsi', number: '160', title: 'Se päivä koittaa' }
    ]
  },
  '3_advent': {
    code: '3_advent',
    name: '3. adventtisunnuntai',
    latinName: 'Dominica III Adventus (Gaudete)',
    season: 'Adventtiaika',
    color: { color: 'violetti', english: 'purple', description: 'Valmistautumisen ja tienraivaajan väri' },
    heading: 'Tehkää tie kuninkaalle',
    description: 'Kolmannen adventtisunnuntain keskushahmo on Johannes Kastaja, joka kutsuu raivaamaan tien Herralle. Katumus ja kääntymys avaavat sydämen ottamaan vastaan tulevan Vapahtajan.',
    collect: 'Herra Jumala, taivaallinen Isä. Sinä lähetit Johannes Kastajan valmistamaan tietä Pojallesi. Avaa meidän korvamme kuulemaan sanasi kutsu ja käännä sydämemme sinun puoleesi. Tätä pyydämme Herramme Jeesuksen Kristuksen kautta. Aamen.',
    psalm: {
      antiphon: 'Raivatkaa Herralle tie autiomaahan, tasoittakaa yli aron valtatie meidän Jumalallemme! (Jes. 40:3)',
      reference: 'Ps. 85:9–14',
      text: 'Minä kuuntelen, mitä Herra Jumala puhuu.\nHän lupaa rauhan kansalleen, omilleen –\nälkööt he enää kääntykö hulluuden tielle!\nHänen apunsa on lähellä niitä, jotka häntä pelkäävät.\nArmo ja uskollisuus kohtaavat,\noikeus ja rauha suutelevat toisiaan.'
    },
    readings: {
      KR92: {
        firstReading: {
          label: '1. lukukappale',
          reference: 'Jes. 40:3–8',
          text: 'Huuto kuuluu: – Raivatkaa Herralle tie autiomaahan, tasoittakaa yli aron valtatie meidän Jumalallemme! Jokainen laakso täytettäköön, jokainen vuori ja kukkula madallettakoon. Ruoho kuivuu, kukka lakastuu, mutta meidän Jumalamme sana pysyy iäti.'
        },
        secondReading: {
          label: '2. lukukappale',
          reference: '1. Kor. 4:1–5',
          text: 'Meitä on pidettävä Kristuksen palvelijoina ja Jumalan salaisuuksien taloudenhoitajina. Tällaiselta taloudenhoitajalta vaaditaan ennen kaikkea, että hän on luotettava. Älkää siis lausuko tuomiota ennen kuin aika on, ennen kuin Herra tulee.'
        },
        gospel: {
          label: 'Evankeliumi',
          reference: 'Matt. 11:2–10',
          acclamation: 'Halleluja. Minä lähetän sanansaattajani sinun edelläsi, hän raivaa sinulle tien. Halleluja.',
          text: 'Kun Johannes vankilassa kuuli Kristuksen teoista, hän lähetti opetuslapsiaan kysymään häneltä: »Oletko sinä se, jonka on määrä tulla, vai pitääkö meidän odottaa toista?» Jeesus vastasi heille: »Menkää ja kertokaa Johannekselle, mitä kuulette ja näette: Sokeat saavat näkönsä ja rammat kävelevät, spitaaliset puhdistuvat ja kuurot kuulevat, kuolleet herätetään henkiin ja köyhille julistetaan ilosanomaa. Autuas se, joka ei minua torju.»'
        }
      }
    },
    hymnSuggestions: [
      { role: 'Alkuvirsi', number: '8', title: 'Nyt sytytämme kynttilän' },
      { role: 'Päivän virsi', number: '9', title: 'Koko maailma iloitsee' }
    ]
  },
  '4_advent': {
    code: '4_advent',
    name: '4. adventtisunnuntai',
    latinName: 'Dominica IV Adventus (Rorate)',
    season: 'Adventtiaika',
    color: { color: 'violetti', english: 'purple', description: 'Pyhän odotuksen ja Marian kiitosvirren väri' },
    heading: 'Herra on lähellä',
    description: 'Neljäs adventtisunnuntai on jo aivan joulun kynnyksellä. Päivän keskiössä on Jeesuksen äiti Maria, joka ottaa nöyrästi ja iloiten vastaan lupauksen Vapahtajan syntymästä.',
    collect: 'Pyhä Jumala. Sinä valitsit nuoren Marian Poikasi äidiksi. Anna meillekin rohkeus luottaa sinun lupauksiisi ja iloita siitä, että Herra on lähellä. Tätä pyydämme Herramme Jeesuksen Kristuksen kautta. Aamen.',
    psalm: {
      antiphon: 'Tiukkukaa, taivaat, ylhäältä, pilvet, satakaa vanhurskautta! (Jes. 45:8)',
      reference: 'Ps. 145:13–21',
      text: 'Herra on uskollinen sanoissaan\nja laupias kaikissa teoissaan.\nHerra tukee kaikkia, jotka ovat lankeamaisillaan,\nhän nostaa pystyyn kaikki maahan painetut.\nHerra on lähellä kaikkia, jotka huutavat häntä,\nkaikkia, jotka vilpittömästi huutavat häntä avuksi.'
    },
    readings: {
      KR92: {
        firstReading: {
          label: '1. lukukappale',
          reference: 'Sef. 3:14–17',
          text: 'Iloitse, tytär Siion! Huuda riemusta, Israel! Iloitse ja riemuitse koko sydämestäsi, tytär Jerusalem! Herra, sinun Jumalasi, on sinun keskelläsi, sankari, joka auttaa. Hän iloitsee sinusta riemuiten, hän uudistaa sinut rakkaudessaan.'
        },
        secondReading: {
          label: '2. lukukappale',
          reference: 'Fil. 4:4–7',
          text: 'Iloitkaa aina Herrassa! Sanon vielä kerran: iloitkaa! Tulkoon teidän lempeytenne kaikkien ihmisten tietoon. Herra on lähellä. Älkää olko mistään huolissanne, vaan saattakaa aina se, mitä tarvitsette, rukouksella ja anomisella kiitoksen kanssa Jumalalle tiettäväksi. Ja Jumalan rauha, joka on kaikkea ymmärrystä ylempi, varjelee teidän sydämenne ja ajatuksenne Kristuksessa Jeesuksessa.'
        },
        gospel: {
          label: 'Evankeliumi',
          reference: 'Luuk. 1:39–45',
          acclamation: 'Halleluja. Autuas sinä, joka uskoit, sillä se sana on täyttyvä, minkä Herra sinulle puhui. Halleluja.',
          text: 'Muutaman päivän kuluttua Maria lähti matkaan ja kiiruhti Juudean vuoriseudulle erääseen kaupunkiin. Hän meni Sakariaan taloon ja tervehti Elisabetia. Kun Elisabet kuuli Marian tervehdyksen, lapsi hypähti hänen kohdussaan ja hän täyttyi Pyhällä Hengellä. Hän huusi kovalla äänellä ja sanoi: »Siunattu olet sinä, naisista siunatuin, ja siunattu sinun kohtusi hedelmä! Autuas sinä, joka uskoit! Herran sinulle antama lupaus on täyttyvä.»'
        }
      }
    },
    hymnSuggestions: [
      { role: 'Alkuvirsi', number: '13', title: 'Nyt sytytämme kynttilän (4. säk.)' },
      { role: 'Päivän virsi', number: '50', title: 'Jeesuksen äiti, Maria' }
    ]
  },
  'christmas_day': {
    code: 'christmas_day',
    name: 'Joulupäivä',
    latinName: 'Nativitas Domini',
    season: 'Jouluaika',
    color: { color: 'valkoinen', english: 'white', description: 'Kristus-juhlan, valon ja taivaallisen ilon väri' },
    heading: 'Teille on syntynyt Vapahtaja',
    description: 'Joulupäivänä kirkko juhlii Jumalan Pojan syntymää ihmiseksi. Sana tuli lihaksi ja asui meidän keskellämme.',
    collect: 'Kaikkivaltias Jumala, rakas taivaallinen Isä. Sinä annoit ainoan Poikasi syntyä maailmaan meidän Vapahtajaksemme. Valaise pimeytemme hänen valollaan ja täytä sydämemme joulun rauhalla. Tätä pyydämme Herramme Jeesuksen Kristuksen kautta. Aamen.',
    psalm: {
      antiphon: 'Meille on syntynyt lapsi, poika on annettu meille. (Jes. 9:5)',
      reference: 'Ps. 96:1–13',
      text: 'Laulakaa Herralle uusi laulu,\nlaulakaa Herralle, kaikki maa!\nLaulakaa Herralle, kiittäkää hänen nimeään,\njulistakaa päivästä päivään hänen pelastustekojaan!'
    },
    readings: {
      KR92: {
        firstReading: {
          label: '1. lukukappale',
          reference: 'Jes. 9:1–6',
          text: 'Kansa, joka pimeydessä vaeltaa, näkee suuren valon. Niille, jotka asuvat kuoleman varjon maassa, loistaa kirkkaus. Sillä lapsi on syntynyt meille, poika on annettu meille. Hän kantaa valtaa harteillaan, ja hänen nimensä on Ihmeellinen Neuvontuoja, Väkevä Jumala, Iankaikkinen Isä, Rauhaniruhtinas.'
        },
        secondReading: {
          label: '2. lukukappale',
          reference: 'Tit. 2:11–14',
          text: 'Jumalan armo on näet ilmestynyt pelastukseksi kaikille ihmisille. Se kasvattaa meitä hylkäämään jumalattomuuden ja maailmalliset himot ja elämään tässä maailmassa siveästi, oikeamielisesti ja hurskaasti.'
        },
        gospel: {
          label: 'Evankeliumi',
          reference: 'Luuk. 2:1–14',
          acclamation: 'Halleluja. Teille on tänään Daavidin kaupungissa syntynyt Vapahtaja, joka on Kristus, Herra. Halleluja.',
          text: 'Siihen aikaan antoi keisari Augustus käskyn, että koko valtakunnassa oli toimitettava verollepano. ... Mutta enkeli sanoi heille: »Älkää pelätkö! Minä ilmoitan teille ilosanoman, suuren ilon koko kansalle. Tänään on teille Daavidin kaupungissa syntynyt Vapahtaja. Hän on Kristus, Herra.»'
        }
      }
    },
    hymnSuggestions: [
      { role: 'Alkuvirsi', number: '21', title: 'Enkeli taivaan lausui näin' },
      { role: 'Päivän virsi', number: '27', title: 'Juhlimaan tulkaa' }
    ]
  },
  'judgment_sunday': {
    code: 'judgment_sunday',
    name: 'Tuomiosunnuntai (Kristuksen kuninkuuden sunnuntai)',
    latinName: 'Dominica Ultima per Annum',
    season: 'Kirkkovuoden päätös',
    color: { color: 'vihreä', english: 'green', description: 'Toivon, iankaikkisen elämän ja lähimmäisenrakkauden väri' },
    heading: 'Kristus, kaikkien kuningas',
    description: 'Tuomiosunnuntai päättää kirkkovuoden. Päivän tekstit kertovat Kristuksesta kaikkien kansojen kuninkaana ja tuomarina, joka kohtaa meidät pienimmissä ja apua tarvitsevissa lähimmäisissämme.',
    collect: 'Kaikkivaltias, iankaikkinen Jumala. Sinä olet asettanut Poikasi Jeesuksen Kristuksen kaiken herraksi ja kuninkaaksi. Avaa silmämme näkemään hänet avun tarpeessa olevissa lähimmäisissämme ja palvelemaan häntä rakkaudessa. Tätä pyydämme Herramme Jeesuksen Kristuksen kautta. Aamen.',
    psalm: {
      antiphon: 'Herra on kuningas! Hän on pukeutunut majesteettiuteen. (Ps. 93:1)',
      reference: 'Ps. 143:1–10',
      text: 'Herra, kuule rukoukseni,\nota korviisi minun avunhuutoni!\nVastaa minulle, sinä uskollinen ja vanhurskas!\nÄlä käy oikeutta palvelijaasi vastaan,\nsillä sinun edessäsi ei yksikään ihminen ole syytön.\nOsoita minulle armosi heti aamun koittaessa,\nsillä sinuun minä turvaan.\nOpeta minua tekemään tahtosi,\nsillä sinä olet minun Jumalani.\nSinun hyvä henkesi johdattakoon minua tasaista maata!'
    },
    readings: {
      KR92: {
        firstReading: {
          label: '1. lukukappale',
          reference: 'Dan. 7:9–10, 13–14',
          text: 'Minun katsellessani asetettiin valtaistuimet ja Ikiaikainen istuutui. Hänen vaatteensa olivat valkeat kuin lumi ja hänen hiuksensa kuin puhdas villa. ... Minä näin yöllisessä näyssäni, kuinka taivaan pilvissä tuli Ihmisen Pojan kaltainen. Hän saapui Ikiaikaisen luo, ja hänet saatettiin Ikiaikaisen eteen. Ja hänelle annettiin valta, kunnia ja kuninkuus, ja kaikki kansat, kansakunnat ja kielet palvelivat häntä. Hänen valtansa on iankaikkinen valta, joka ei katoa, eikä hänen kuninkuutensa koskaan häviä.'
        },
        secondReading: {
          label: '2. lukukappale',
          reference: '2. Kor. 5:1–10',
          text: 'Me tiedämme, että vaikka tämä meidän maallinen telttamajamme puretaankin, Jumalalla on taivaassa meitä varten ikuinen asunto, joka ei ole ihmiskätten työtä. ... Sillä meidän kaikkien on tultava Kristuksen tuomioistuimen eteen, jotta kukin saisi sen mukaan, mitä ajallisessa elämässään on tehnyt, hyvää tai pahaa.'
        },
        gospel: {
          label: 'Evankeliumi',
          reference: 'Matt. 25:31–46',
          acclamation: 'Halleluja. Kaikki, mitä te olette tehneet yhdelle näistä vähäisimmistä veljistäni, sen te olette tehneet minulle. Halleluja.',
          text: 'Jeesus sanoi opetuslapsilleen: »Kun Ihmisen Poika tulee kirkkaudessaan ja kaikki enkelit hänen kanssaan, silloin hän istuutuu kirkkautensa valtaistuimelle. Kaikki kansat kootaan hänen eteensä, ja hän erottaa ihmiset toisistaan, niin kuin paimen erottaa lampaat vuohista. Hän asettaa lampaat oikealle ja vuohet vasemmalle puolelleen. Silloin Kuningas sanoo oikealla puolellaan oleville: ’Tulkaa tänne, te Isäni siunaamat! Te saatte nyt periä valtakunnan, joka on ollut valmiina teitä varten maailman luomisesta asti. Minun oli nälkä, ja te annoitte minulle ruokaa. Minun oli jano, ja te annoitte minulle juotavaa. Minä olin koditon, ja te otitte minut luoksenne. Minä olin alasti, ja te vaatetitte minut. Minä olin sairas, ja te kävitte minua katsomassa. Minä olin vankilassa, ja te tulitte minun luokseni.’ ... ’Totisesti: kaiken, mitä te olette tehneet yhdelle näistä vähäisimmistä veljistäni, sen te olette tehneet minulle.’»'
        }
      },
      KR38: {
        firstReading: {
          label: '1. lukukappale',
          reference: 'Dan. 7:9–10, 13–14',
          text: 'Minun sitä katsellessani valtaistuimet asetettiin, ja Vanhaikäinen istuutui. ... Ja katso, taivaan pilvissä tuli Ihmisen Pojan kaltainen; ja hän saapui Vanhaikäisen tykö, ja hänet saatettiin tämän eteen. Ja hänelle annettiin valta, kunnia ja valtakunta.'
        },
        secondReading: {
          label: '2. lukukappale',
          reference: '2. Kor. 5:1–10',
          text: 'Sillä me tiedämme, että vaikka tämä meidän maallinen majamme hajotetaankin maahan, meillä on asumus Jumalalta, iankaikkinen maja taivaissa, joka ei ole käsin tehty. ... Sillä meidän kaikkien pitää ilmestymän Kristuksen tuomioistuimen eteen.'
        },
        gospel: {
          label: 'Evankeliumi',
          reference: 'Matt. 25:31–46',
          acclamation: 'Halleluja. Kaikki, mitä olette tehneet yhdelle näistä minun vähimmistä veljistäni, sen te olette tehneet minulle. Halleluja.',
          text: 'Mutta kun Ihmisen Poika tulee kirkkaudessaan ja kaikki enkelit hänen kanssaan, silloin hän istuu kirkkautensa valtaistuimelle. Ja hänen eteensä kootaan kaikki kansat, ja hän erottaa toiset toisista, niinkuin paimen erottaa lampaat vuohista. ... Ja Kuningas vastaa ja sanoo heille: »Totisesti minä sanon teille: kaikki, mitä olette tehneet yhdelle näistä minun vähimmistä veljistäni, sen te olette tehneet minulle.»'
        }
      },
      UT2020: {
        firstReading: {
          label: '1. lukukappale (VT KR92)',
          reference: 'Dan. 7:9–10, 13–14',
          text: 'Minä näin yöllisessä näyssäni, kuinka taivaan pilvissä tuli Ihmisen Pojan kaltainen. Hänelle annettiin valta, kunnia ja kuninkuus, ja kaikki kansat, kansakunnat ja kielet palvelivat häntä.'
        },
        secondReading: {
          label: '2. lukukappale (UT2020)',
          reference: '2. Kor. 5:1–10',
          text: 'Me tiedämme, että vaikka tämä meidän maallinen telttamajamme puretaankin, Jumalalla on taivaassa meitä varten ikuinen rakennus, joka ei ole ihmiskätten työtä. Meidän kaikkien on näet astuttava Kristuksen tuomioistuimen eteen.'
        },
        gospel: {
          label: 'Evankeliumi (UT2020)',
          reference: 'Matt. 25:31–46',
          acclamation: 'Halleluja. Kaiken, minkä olette tehneet yhdelle näistä vähäisimmistä veljistäni, sen te olette tehneet minulle. Halleluja.',
          text: '»Kun Ihmisen Poika tulee loistossaan kaikkien enkeliensä kanssa, hän asettuu loistavalle valtaistuimelleen. Kaikki kansat kootaan hänen eteensä, ja hän erottelee ihmiset toisistaan niin kuin paimen erottelee lampaat vuohista. ... Kuningas vastaa heille: ’Minä vakuutan teille: kaiken, minkä olette tehneet yhdelle näistä vähäisimmistä veljistäni, sen te olette tehneet minulle.’»'
        }
      }
    },
    hymnSuggestions: [
      { role: 'Alkuvirsi', number: '149', title: 'Rauhan Herra, siunaa meitä' },
      { role: 'Päivän virsi', number: '156', title: 'On kirkas aamu koittava' },
      { role: 'Saarnavirsi', number: '431', title: 'Ken on mun lähimmäiseni' }
    ]
  },
  'vigilance_sunday': {
    code: 'vigilance_sunday',
    name: 'Valvomisen sunnuntai',
    latinName: 'Dominica Penultima per Annum',
    season: 'Helluntain jälkeinen aika',
    color: { color: 'vihreä', english: 'green', description: 'Uskon kasvun, toivon ja valppauden väri' },
    heading: 'Valvokaa!',
    description: 'Kirkkovuoden toiseksi viimeinen sunnuntai kutsuu kristittyjä hengelliseen valppauteen ja luottamukseen Kristuksen paluuta odotettaessa.',
    collect: 'Herra Jeesus Kristus. Sinä kehotat meitä valvomaan ja pitämään uskon liekin palavana. Herätä meidät välinpitämättömyyden unesta ja anna Pyhän Henkesi öljyä lamppuihimme. Sinulle olkoon kiitos ja kunnia nyt ja aina. Aamen.',
    psalm: {
      antiphon: 'Olkaa valmiit, sillä Ihmisen Poika tulee hetkellä, jota ette aavista. (Luuk. 12:40)',
      reference: 'Ps. 139:1–12, 23–24',
      text: 'Herra, sinä tutkit minua ja tunnet minut.\nIstunpa tai nousen, sinä sen tiedät,\nsinä ymmärrät ajatukseni jo kaukaa.\nTutki minut, Jumala, katso sydämeeni,\nkoettele minua, katso ajatuksiini\nja johdata minua ikuisella tiellä.'
    },
    readings: {
      KR92: {
        firstReading: {
          label: '1. lukukappale',
          reference: 'Aam. 8:9–12',
          text: 'Sinä päivänä – sanoo Herra Jumala – minä annan auringon laskea keskipäivällä ja pimennän maan keskellä kirkasta päivää. Katso, päivät tulevat, jolloin minä lähetän maahan nälän, en leivän nälkää enkä veden janoa, vaan Herran sanojen kuulemisen nälän.'
        },
        secondReading: {
          label: '2. lukukappale',
          reference: '1. Tess. 5:1–11',
          text: 'Te tiedätte itsekin aivan hyvin, että Herran päivä tulee kuin varas yöllä. Mutta te, ystävät, ette elä pimeydessä, eikä tuo päivä pääse yllättämään teitä kuin varas. Te kaikki olette valon lapsia ja päivän lapsia. Älkäämme siis nukkuko niin kuin muut, vaan valvokaamme ja pysykäämme raittiina.'
        },
        gospel: {
          label: 'Evankeliumi',
          reference: 'Matt. 25:1–13',
          acclamation: 'Halleluja. Valvokaa siis, sillä ette tiedä päivää ettekä hetkeä. Halleluja.',
          text: 'Jeesus sanoi opetuslapsilleen: »Silloin taivasten valtakunta on oleva kuin kymmenen neitsyttä, jotka ottivat lamppunsa ja lähtivät sulhasta vastaan. Viisi heistä oli tyhmää ja viisi viisasta. Tyhmät ottivat lamppunsa mutta eivät varanneet mukaansa öljyä. Viisaat sitä vastoin ottivat lamppujensa lisäksi öljyastian. ... Valvokaa siis, sillä te ette tiedä päivää ettekä hetkeä.»'
        }
      }
    },
    hymnSuggestions: [
      { role: 'Alkuvirsi', number: '154', title: 'Nouse, sielu, valppahasti' },
      { role: 'Päivän virsi', number: '155', title: 'Jo heräjä, oi kristikunta' }
    ]
  },
  'ordinary_sunday': {
    code: 'ordinary_sunday',
    name: 'Helluntain jälkeisen ajan sunnuntai',
    latinName: 'Dominica post Pentecosten',
    season: 'Helluntain jälkeinen aika',
    color: { color: 'vihreä', english: 'green', description: 'Elämän, kasvun ja arjen kristillisyyden väri' },
    heading: 'Kristuksen seuraajana arjessa',
    description: 'Helluntain jälkeisen ajan pyhäpäivät kutsuvat elämään todeksi kristillistä uskoa, toivoa ja rakkautta jokapäiväisessä elämässä.',
    collect: 'Kaikkivaltias, armollinen Jumala. Sinä kutsut meidät yhteyteesi ja lähimmäistemme palvelukseen. Vahvista meissä uskoa, toivoa ja rakkautta Pyhän Henkesi voimalla. Tätä pyydämme Herramme Jeesuksen Kristuksen kautta. Aamen.',
    psalm: {
      antiphon: 'Ylistä Herraa, minun sieluni, äläkä unohda, mitä hyvää hän on sinulle tehnyt. (Ps. 103:2)',
      reference: 'Ps. 103:1–8',
      text: 'Ylistä Herraa, minun sieluni,\nja kaikki mitä minussa on, hänen pyhää nimeään.\nYlistä Herraa, minun sieluni,\näläkä unohda, mitä hyvää hän on sinulle tehnyt.\nHän antaa anteeksi kaikki syntisi\nja parantaa kaikki sairautesi,\nhän lunastaa henkesi tuonelasta\nja kruunaa sinut armolla ja laupeudella.'
    },
    readings: {
      KR92: {
        firstReading: {
          label: '1. lukukappale',
          reference: '5. Moos. 6:4–9',
          text: 'Kuule, Israel! Herra on meidän Jumalamme, Herra yksin. Rakasta Herraa, Jumalaasi, koko sydämestäsi, koko sielustasi ja koko voimastasi. Nämä sanat, jotka minä tänään sinulle annan, painukoot sydämeesi.'
        },
        secondReading: {
          label: '2. lukukappale',
          reference: 'Kol. 3:12–17',
          text: 'Te olette Jumalan valittuja, pyhiä ja hänelle rakkaita. Pukekaa siis yllenne sydämellinen armahtavaisuus, ystävällisyys, nöyryys, lempeys ja kärsivällisyys. Ja kaiken tämän lisäksi pukekaa yllenne rakkaus, sillä se tekee kaiken täydelliseksi. Vallitkoon teidän sydämissänne Kristuksen rauha.'
        },
        gospel: {
          label: 'Evankeliumi',
          reference: 'Matt. 22:34–40',
          acclamation: 'Halleluja. Sinun sanasi on totuus, Herra. Pyhitä meidät totuudessasi. Halleluja.',
          text: 'Eräs lainopettaja kysyi Jeesukselta koetellakseen häntä: »Opettaja, mikä on lain suurin käsky?» Jeesus vastasi hänelle: »’Rakasta Herraa, Jumalaasi, koko sydämestäsi, koko sielustasi ja koko mielestäsi.’ Tämä on käskyistä suurin ja ensimmäinen. Toinen yhtä tärkeä on tämä: ’Rakasta lähimmäistäsi niin kuin itseäsi.’ Näiden kahden käskyn varassa ovat laki ja profeetat.»'
        }
      }
    },
    hymnSuggestions: [
      { role: 'Alkuvirsi', number: '201', title: 'Tule, Pyhä Henki, luoksemme' },
      { role: 'Päivän virsi', number: '430', title: 'Saman Herran palvelijoita' },
      { role: 'Päätösvirsi', number: '341', title: 'Kiitos sulle, Jumalani' }
    ]
  }
};

/**
 * Determine the next or matching Sunday/Holy Day for a given date
 */
export function resolveHolyDayKeyForDate(dateStr) {
  const d = parseDateString(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();

  // Fixed major feasts
  if (month === 12 && (day === 24 || day === 25)) return 'christmas_day';

  const firstAdvent = getFirstAdventSunday(year);
  const firstAdventStr = toDateString(firstAdvent);
  const diffDays = Math.round((d.getTime() - firstAdvent.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays >= -2 && diffDays <= 4) return '1_advent';
  if (diffDays >= 5 && diffDays <= 11) return '2_advent';
  if (diffDays >= 12 && diffDays <= 18) return '3_advent';
  if (diffDays >= 19 && diffDays <= 25) return '4_advent';
  if (diffDays >= -9 && diffDays < -2) return 'judgment_sunday';
  if (diffDays >= -16 && diffDays < -9) return 'vigilance_sunday';

  return 'ordinary_sunday';
}

/**
 * Get the upcoming (or current if today is Sunday/Holy Day) holy day date string
 */
export function getUpcomingSundayOrHolyDay(fromDateStr = null) {
  const d = fromDateStr ? parseDateString(fromDateStr) : new Date();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  if (month === 12 && (day === 24 || day === 25 || day === 26)) {
    return toDateString(d);
  }
  const dayOfWeek = d.getDay(); // 0 = Sunday
  if (dayOfWeek === 0) return toDateString(d);
  const daysUntilSunday = 7 - dayOfWeek;
  d.setDate(d.getDate() + daysUntilSunday);
  return toDateString(d);
}

/**
 * Build deterministic EVL liturgical day data for any date and translation
 */
export function buildFallbackHolyDayData(dateStr, translation = 'KR92') {
  const key = resolveHolyDayKeyForDate(dateStr);
  const entry = HOLY_DAY_CATALOG[key] || HOLY_DAY_CATALOG.ordinary_sunday;
  const d = parseDateString(dateStr);
  const firstAdvent = getFirstAdventSunday(d.getFullYear());
  const churchYearStart = d >= firstAdvent ? d.getFullYear() : d.getFullYear() - 1;
  const lectionaryYear = ((churchYearStart - 1999) % 3) + 1;

  const normalizedTrans = ['KR92', 'KR38', 'UT2020'].includes(String(translation).toUpperCase())
    ? String(translation).toUpperCase()
    : 'KR92';

  const transReadings = entry.readings[normalizedTrans] || entry.readings.KR92;

  return {
    date: dateStr,
    holyDayCode: entry.code,
    name: entry.name,
    latinName: entry.latinName,
    season: entry.season,
    lectionaryYear,
    liturgicalColor: entry.color,
    officialHeading: entry.heading,
    officialDescription: entry.description,
    translation: normalizedTrans,
    availableTranslations: ['KR92', 'KR38', 'UT2020'],
    psalm: {
      ...entry.psalm,
      gloriaPatri: 'Kunnia Isälle ja Pojalle ja Pyhälle Hengelle, niin kuin oli alussa, nyt on ja aina, iankaikkisesta iankaikkiseen. Aamen.'
    },
    readings: {
      firstReading: transReadings.firstReading,
      secondReading: transReadings.secondReading,
      gospel: transReadings.gospel
    },
    collect: entry.collect,
    hymnSuggestions: entry.hymnSuggestions || [],
    source: 'evl-fallback'
  };
}

/**
 * Merge Anno API response with EVL fallback and parish holy_day_overrides
 */
export async function getHolyDayForDate({ date = null, tenant = null, translation = 'KR92' } = {}) {
  const targetDate = date || getUpcomingSundayOrHolyDay();
  const tenantId = await resolveTenantId(tenant);
  const baseData = buildFallbackHolyDayData(targetDate, translation);

  // 1. Try enriching from Anno API if available
  try {
    const annoRes = await fetchDayFromAnno(targetDate);
    if (annoRes && annoRes.source === 'anno-api' && annoRes.raw) {
      const raw = annoRes.raw;
      const hd = raw.holyDay || raw.weekdayMaterial || {};
      if (hd.name) baseData.name = hd.name;
      if (hd.theme) baseData.officialHeading = hd.theme;
      if (hd.description) baseData.officialDescription = hd.description;
      if (hd.liturgicalColor) {
        baseData.liturgicalColor = {
          ...baseData.liturgicalColor,
          ...hd.liturgicalColor
        };
      }
      if (raw.season || raw.period) baseData.season = raw.season || raw.period;
      if (hd.texts?.firstReading?.reference) {
        baseData.readings.firstReading = {
          label: '1. lukukappale',
          reference: hd.texts.firstReading.reference,
          text: hd.texts.firstReading.text || baseData.readings.firstReading.text
        };
      }
      if (hd.texts?.secondReading?.reference) {
        baseData.readings.secondReading = {
          label: '2. lukukappale',
          reference: hd.texts.secondReading.reference,
          text: hd.texts.secondReading.text || baseData.readings.secondReading.text
        };
      }
      if (hd.texts?.gospel?.reference) {
        baseData.readings.gospel = {
          ...baseData.readings.gospel,
          reference: hd.texts.gospel.reference,
          text: hd.texts.gospel.text || baseData.readings.gospel.text
        };
      }
      if (hd.psalm?.reference) {
        baseData.psalm = {
          ...baseData.psalm,
          reference: hd.psalm.reference,
          text: hd.psalm.text || baseData.psalm.text
        };
      }
      if (hd.collect || hd.prayer) {
        baseData.collect = hd.collect || hd.prayer;
      }
      baseData.source = 'anno-api';
    }
  } catch (err) {
    // Keep baseData fallback
  }

  // 2. Check parish-specific override from holy_day_overrides table
  let overrideRow = null;
  if (tenantId) {
    try {
      const res = await query(
        `SELECT * FROM holy_day_overrides
         WHERE tenant_id = $1 AND target_date = $2
         LIMIT 1`,
        [tenantId, targetDate]
      );
      overrideRow = res.rows[0] || null;
    } catch (err) {
      // Table might not exist yet before migration runs
      overrideRow = null;
    }
  }

  const hasActiveOverride = Boolean(overrideRow && overrideRow.is_published !== false);

  const customHeading = hasActiveOverride && overrideRow.custom_heading
    ? overrideRow.custom_heading.trim()
    : null;
  const customDescription = hasActiveOverride && overrideRow.custom_description
    ? overrideRow.custom_description.trim()
    : null;
  const pastoralReflection = hasActiveOverride && overrideRow.pastoral_reflection
    ? overrideRow.pastoral_reflection.trim()
    : null;
  const customCollect = hasActiveOverride && overrideRow.custom_collect
    ? overrideRow.custom_collect.trim()
    : null;

  const customHymns = hasActiveOverride && Array.isArray(overrideRow.custom_hymns) && overrideRow.custom_hymns.length > 0
    ? overrideRow.custom_hymns
    : null;
  const serviceInfo = hasActiveOverride && overrideRow.service_info && typeof overrideRow.service_info === 'object'
    ? overrideRow.service_info
    : {};
  const blocks = hasActiveOverride && Array.isArray(overrideRow.blocks)
    ? overrideRow.blocks
    : [];

  // Apply optional reading overrides if configured by parish
  let mergedReadings = { ...baseData.readings };
  if (hasActiveOverride && overrideRow.readings_override && typeof overrideRow.readings_override === 'object') {
    const ro = overrideRow.readings_override;
    if (ro.firstReading?.reference || ro.firstReading?.text) {
      mergedReadings.firstReading = { ...mergedReadings.firstReading, ...ro.firstReading };
    }
    if (ro.secondReading?.reference || ro.secondReading?.text) {
      mergedReadings.secondReading = { ...mergedReadings.secondReading, ...ro.secondReading };
    }
    if (ro.gospel?.reference || ro.gospel?.text) {
      mergedReadings.gospel = { ...mergedReadings.gospel, ...ro.gospel };
    }
  }

  return {
    date: targetDate,
    tenantId,
    holyDayCode: overrideRow?.holy_day_code || baseData.holyDayCode,
    name: baseData.name,
    latinName: baseData.latinName,
    season: baseData.season,
    lectionaryYear: baseData.lectionaryYear,
    liturgicalColor: baseData.liturgicalColor,
    // Effective heading & description (Parish custom override OR Anno official default)
    heading: customHeading || baseData.officialHeading,
    description: customDescription || baseData.officialDescription,
    officialHeading: baseData.officialHeading,
    officialDescription: baseData.officialDescription,
    isCustomHeading: Boolean(customHeading),
    isCustomDescription: Boolean(customDescription),
    pastoralReflection,
    collect: customCollect || baseData.collect,
    officialCollect: baseData.collect,
    isCustomCollect: Boolean(customCollect),
    psalm: baseData.psalm,
    readings: mergedReadings,
    translation: baseData.translation,
    availableTranslations: baseData.availableTranslations,
    hymns: customHymns || baseData.hymnSuggestions,
    officialHymns: baseData.hymnSuggestions,
    isCustomHymns: Boolean(customHymns),
    serviceInfo,
    blocks,
    portalPosition: overrideRow?.portal_position || null,
    hasOverride: Boolean(overrideRow),
    override: overrideRow || null,
    source: baseData.source
  };
}

/**
 * Generate a calendar list of Sundays and Holy Days around a starting date
 */
export async function getChurchYearCalendar({ from = null, days = 90, tenant = null } = {}) {
  const startDateStr = from || addDays(toDateString(), -14);
  const totalDays = Math.min(Math.max(parseInt(days, 10) || 90, 14), 366);
  const tenantId = await resolveTenantId(tenant);

  // Load any parish overrides in this range
  const endDateStr = addDays(startDateStr, totalDays);
  let overridesByDate = {};
  if (tenantId) {
    try {
      const res = await query(
        `SELECT * FROM holy_day_overrides
         WHERE tenant_id = $1 AND target_date >= $2 AND target_date <= $3`,
        [tenantId, startDateStr, endDateStr]
      );
      for (const row of res.rows) {
        const dStr = typeof row.target_date === 'string'
          ? row.target_date.split('T')[0]
          : toDateString(new Date(row.target_date));
        overridesByDate[dStr] = row;
      }
    } catch (err) {
      overridesByDate = {};
    }
  }

  const holyDays = [];
  for (let i = 0; i <= totalDays; i++) {
    const curDateStr = addDays(startDateStr, i);
    const d = parseDateString(curDateStr);
    const isSunday = d.getDay() === 0;
    const isFixedFeast = (d.getMonth() === 11 && (d.getDate() === 24 || d.getDate() === 25 || d.getDate() === 26)) ||
                         (d.getMonth() === 0 && (d.getDate() === 1 || d.getDate() === 6));
    const ov = overridesByDate[curDateStr];

    if (isSunday || isFixedFeast || ov) {
      const fb = buildFallbackHolyDayData(curDateStr, 'KR92');
      holyDays.push({
        date: curDateStr,
        holyDayCode: ov?.holy_day_code || fb.holyDayCode,
        name: fb.name,
        latinName: fb.latinName,
        season: fb.season,
        liturgicalColor: fb.liturgicalColor,
        officialHeading: fb.officialHeading,
        heading: (ov && ov.custom_heading) ? ov.custom_heading : fb.officialHeading,
        description: (ov && ov.custom_description) ? ov.custom_description : fb.officialDescription,
        isCustomHeading: Boolean(ov && ov.custom_heading),
        isCustomDescription: Boolean(ov && ov.custom_description),
        hasOverride: Boolean(ov),
        portalPosition: ov?.portal_position || null,
        gospelReference: fb.readings?.gospel?.reference || ''
      });
    }
  }

  return {
    from: startDateStr,
    to: endDateStr,
    upcomingHolyDayDate: getUpcomingSundayOrHolyDay(),
    holyDays
  };
}

/**
 * List all saved parish holy day overrides for a tenant
 */
export async function listHolyDayOverrides(tenant = null) {
  const tenantId = await resolveTenantId(tenant);
  if (!tenantId) return [];

  try {
    const res = await query(
      `SELECT h.*, u.name as updated_by_name
       FROM holy_day_overrides h
       LEFT JOIN users u ON h.updated_by_user_id = u.id
       WHERE h.tenant_id = $1
       ORDER BY h.target_date ASC`,
      [tenantId]
    );
    return res.rows.map(row => ({
      ...row,
      target_date: typeof row.target_date === 'string'
        ? row.target_date.split('T')[0]
        : toDateString(new Date(row.target_date))
    }));
  } catch (err) {
    return [];
  }
}

/**
 * Upsert a parish holy day override for a specific target_date
 */
export async function saveHolyDayOverride(targetDate, data = {}, user = null) {
  if (!targetDate) {
    throw new Error('Päivämäärä (target_date) on pakollinen.');
  }

  const tenantId = data.tenant_id || await resolveTenantId(data.tenant || data.tenant_slug || user?.tenantId);
  if (!tenantId) {
    throw new Error('Seurakuntaa (tenant) ei voitu tunnistaa.');
  }

  const {
    holy_day_code = null,
    custom_heading = null,
    custom_description = null,
    pastoral_reflection = null,
    custom_collect = null,
    custom_hymns = [],
    service_info = {},
    readings_override = null,
    blocks = null,
    portal_position = null,
    is_published = true
  } = data;

  const cleanPortalPos = ['above', 'below'].includes(portal_position) ? portal_position : null;

  const sql = `
    INSERT INTO holy_day_overrides (
      tenant_id, target_date, holy_day_code,
      custom_heading, custom_description, pastoral_reflection, custom_collect,
      custom_hymns, service_info, readings_override, blocks,
      portal_position, is_published, updated_by_user_id, created_at, updated_at
    ) VALUES (
      $1, $2, $3,
      $4, $5, $6, $7,
      $8, $9, $10, $11,
      $12, $13, $14, NOW(), NOW()
    )
    ON CONFLICT (tenant_id, target_date) DO UPDATE SET
      holy_day_code = COALESCE(EXCLUDED.holy_day_code, holy_day_overrides.holy_day_code),
      custom_heading = EXCLUDED.custom_heading,
      custom_description = EXCLUDED.custom_description,
      pastoral_reflection = EXCLUDED.pastoral_reflection,
      custom_collect = EXCLUDED.custom_collect,
      custom_hymns = EXCLUDED.custom_hymns,
      service_info = EXCLUDED.service_info,
      readings_override = EXCLUDED.readings_override,
      blocks = EXCLUDED.blocks,
      portal_position = EXCLUDED.portal_position,
      is_published = EXCLUDED.is_published,
      updated_by_user_id = EXCLUDED.updated_by_user_id,
      updated_at = NOW()
    RETURNING *
  `;

  const values = [
    tenantId,
    targetDate,
    holy_day_code || resolveHolyDayKeyForDate(targetDate),
    custom_heading ? custom_heading.trim() : null,
    custom_description ? custom_description.trim() : null,
    pastoral_reflection ? pastoral_reflection.trim() : null,
    custom_collect ? custom_collect.trim() : null,
    JSON.stringify(Array.isArray(custom_hymns) ? custom_hymns : []),
    JSON.stringify(service_info && typeof service_info === 'object' ? service_info : {}),
    readings_override ? JSON.stringify(readings_override) : null,
    blocks ? JSON.stringify(blocks) : null,
    cleanPortalPos,
    is_published !== false,
    user?.id || null
  ];

  const res = await query(sql, values);
  return res.rows[0];
}

/**
 * Delete a parish holy day override by date or UUID (reverts to Anno default)
 */
export async function deleteHolyDayOverride(dateOrId, tenant = null) {
  const tenantId = await resolveTenantId(tenant);
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(dateOrId));

  if (isUuid) {
    const res = await query('DELETE FROM holy_day_overrides WHERE id = $1 RETURNING *', [dateOrId]);
    return res.rows[0] || null;
  }

  const res = await query(
    'DELETE FROM holy_day_overrides WHERE tenant_id = $1 AND target_date = $2 RETURNING *',
    [tenantId, dateOrId]
  );
  return res.rows[0] || null;
}
