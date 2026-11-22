import { getSetting } from './settingsService.js';

// Realistic, authentic Finnish Evangelical Lutheran Kirkkokäsikirja liturgical data
const GLORIA_PATRI = 'Kunnia Isälle ja Pojalle ja Pyhälle Hengelle, niin kuin oli alussa, nyt on ja aina, iankaikkisesta iankaikkiseen. Aamen.';
const LORDS_PRAYER = 'Isä meidän, joka olet taivaissa. Pyhitetty olkoon sinun nimesi. Tulkoon sinun valtakuntasi. Tapahtukoon sinun tahtosi, myös maan päällä niin kuin taivaassa. Anna meille tänä päivänä meidän jokapäiväinen leipämme. Ja anna meille meidän syntimme anteeksi, niin kuin mekin anteeksi annamme niille, jotka ovat meitä vastaan rikkoneet. Äläkä saata meitä kiusaukseen, vaan päästä meidät pahasta. Sillä sinun on valtakunta ja voima ja kunnia iankaikkisesti. Aamen.';

const FALLBACK_LITURGICAL_DATA = {
  holyDay: {
    name: '24. sunnuntai helluntaista',
    theme: 'Valvokaa!',
    liturgicalColor: { color: 'vihreä', english: 'green' }
  },
  dailyVerse: {
    reference: 'Ps. 103:1–4',
    text: 'Ylistä Herraa, minun sieluni, ja kaikki mitä minussa on, hänen pyhää nimeään. Ylistä Herraa, minun sieluni, äläkä unohda, mitä hyvää hän on sinulle tehnyt.',
    meditation: 'Herra on laupias ja armahtavainen, pitkämielinen ja suuri armossaan. Hän parantaa sairautesi ja kruunaa sinut armolla ja laupeudella.'
  },
  lectionary: {
    morning: {
      name: 'Aamurukous (Laudes)',
      hour: 'morning',
      timeSlot: '06:00 – 10:00',
      latinTitle: 'Laudes',
      opening: 'Herra, avaa minun huuleni, niin suuni julistaa sinun kunniaasi.\nJumala, riennä minua auttamaan. Herra, kiirehdi minun avukseni.\nKunnia Isälle ja Pojalle ja Pyhälle Hengelle, niin kuin oli alussa, nyt on ja aina, iankaikkisesta iankaikkiseen. Aamen. Halleluja.',
      hymnSuggestion: 'Aamuvirsi (esim. Virsi 538 / 547)',
      antiphon: 'Ylistetty olkoon Herra, Israelin Jumala, sillä hän on katsonut kansansa puoleen ja valmistanut sille lunastuksen.',
      psalms: [
        {
          reference: 'Ps. 63:2–9',
          text: 'Jumala, minun Jumalani, sinua minä etsin varhain.\nSieluni janoaa sinua, ruumiini ikävöi sinua kuivassa, nääntyneessä ja vedettömässä maassa.\nNiin minä katselen sinua pyhäkössä, nähdäkseni sinun voimasi ja kunniasi.\nSillä sinun armosi on parempi kuin elämä; minun huuleni ylistävät sinua.\nMinä kiitän sinua elinaikanani, kohotan käteni sinun nimeesi.'
        }
      ],
      gloriaPatri: GLORIA_PATRI,
      readings: [
        {
          reference: '1. Tess. 5:5–8',
          text: 'Te kaikki olette valkeuden lapsia ja päivän lapsia; me emme ole yön emmekä pimeyden lapsia. Älkäämme siis nukkuko niin kuin muut, vaan valvokaamme ja olkaamme raittiit.'
        }
      ],
      responsory: 'Kristus, elävän Jumalan Poika, armahda meitä.\n– Kristus, elävän Jumalan Poika, armahda meitä.\nSinä joka istut Isän oikealla puolella,\n– armahda meitä.\nKunnia Isälle ja Pojalle ja Pyhälle Hengelle.\n– Kristus, elävän Jumalan Poika, armahda meitä.',
      canticle: {
        name: 'Sakariaan kiitosvirsi (Benedictus)',
        reference: 'Luuk. 1:68–79',
        text: 'Kiitetty olkoon Herra, Israelin Jumala!\nHän on katsonut kansansa puoleen ja valmistanut sille lunastuksen.\nHän on kohottanut meille pelastuksen sarven palvelijansa Daavidin suvusta,\nniin kuin hän on muinoin luvannut pyhien profeettojensa suulla,\npelastukseksi vihollisistamme ja kaikkien niiden kädestä, jotka meitä vihaavat,\ntehdäkseen laupeuden meidän isillemme ja muistaakseen pyhän liittonsa.'
      },
      intercessions: {
        title: 'Yhteinen esirukous',
        intro: 'Rukoilkaamme Kristusta, elämämme valoa ja uuden päivän tuojaa:',
        hasParishIntentions: true,
        prayers: [
          'Herra, siunaa alkanut päivä ja varjele askeleemme rauhan teillä.',
          'Anna rakkautesi ja totuutesi valaista työmme, opintomme ja kohtaamisemme.',
          'Muista kirkkoasi, seurakuntaamme ja kaikkia sanasi palvelijoita.',
          'Tuo lohtusi ja apusi sairaille, kärsiville ja yksinäisille.'
        ]
      },
      prayer: 'Kaikkivaltias, iankaikkinen Jumala, sinä olet johdattanut meidät uuden päivän valoon. Varjele meitä tänään voimallasi, ettemme lankeaisi syntiin emmekä joutuisi mihinkään vaaraan, vaan toimisimme aina sinun tahtosi mukaan. Tätä pyydämme Herramme Jeesuksen Kristuksen kautta.',
      lordsPrayer: LORDS_PRAYER,
      blessing: 'Kiittäkäämme Herraa.\n– Jumalalle kiitos.\nHerra siunatkoon meitä, varjelkoon meitä kaikesta pahasta ja johdattakoon iankaikkiseen elämään. Aamen.'
    },
    noon: {
      name: 'Päivärukous (Seksti)',
      hour: 'noon',
      timeSlot: '11:00 – 16:00',
      latinTitle: 'Ad sextam / Sexta',
      opening: 'Jumala, riennä minua auttamaan. Herra, kiirehdi minun avukseni.\nKunnia Isälle ja Pojalle ja Pyhälle Hengelle, niin kuin oli alussa, nyt on ja aina, iankaikkisesta iankaikkiseen. Aamen.',
      hymnSuggestion: 'Päivävirsi (esim. Virsi 501 / 503)',
      antiphon: 'Herra on minun valoni ja apuni, ketä minä pelkäisin?',
      psalms: [
        {
          reference: 'Ps. 121:1–8',
          text: 'Minä nostan silmäni vuoria kohti: mistä tulee minulle apu?\nApu minulle tulee Herralta, joka on tehnyt taivaan ja maan.\nHän ei salli sinun jalkasi horjua, sinun varjelijasi ei torku.\nKatso, hän, joka Israelia varjelee, ei torku eikä nuku.\nHerra on sinun varjelijasi, Herra on suojaava varjosi sinun oikealla puolellasi.'
        }
      ],
      gloriaPatri: GLORIA_PATRI,
      readings: [
        {
          reference: 'Gal. 6:9–10',
          text: 'Älkäämme siis väsykö tekemään hyvää, sillä me saamme aikanamme niittää, jos emme lannistu. Sentähden, kun meillä vielä on aikaa, tehkäämme hyvää kaikille, mutta varsinkin uskonveljille.'
        }
      ],
      responsory: 'Herra on minun paimeneni, ei minulta mitään puutu.\n– Hän vie minut vihreille niityille ja virvoittavien vetten tykö.',
      canticle: null,
      intercessions: {
        title: 'Hetkirukous ja esirukous',
        intro: 'Pysähdymme arjen keskellä kääntämään katseemme Vapahtajaan:',
        hasParishIntentions: true,
        prayers: [
          'Herra Jeesus Kristus, sinä nousit ristille keskipäivän hetkellä pelastaaksesi maailman.',
          'Siunaa työmme hedelmät ja suo meille levollisuutta ja kärsivällisyyttä.',
          'Rukoilemme oikeudenmukaisuutta, leipää nälkäisille ja rauhaa riitojen keskelle.'
        ]
      },
      prayer: 'Herra Jeesus Kristus, sinä nousit ristille keskipäivän hetkellä pelastaaksesi maailman synnistä ja kuolemasta. Vuodata Henkesi meidän sydämiimme, että muistaisimme aina rakkautesi ja antaisimme elämämme sinun palvelukseesi.',
      lordsPrayer: LORDS_PRAYER,
      blessing: 'Herra siunatkoon meitä ja varjelkoon meitä. Herra kirkastakoon kasvonsa meille ja olkoon meille armollinen. Herra kääntäköön kasvonsa meidän puoleemme ja antakoon meille rauhan. Isän ja Pojan ja Pyhän Hengen nimeen. Aamen.'
    },
    evening: {
      name: 'Iltarukous (Vesper)',
      hour: 'evening',
      timeSlot: '17:00 – 20:00',
      latinTitle: 'Vesper',
      opening: 'Jumala, riennä minua auttamaan. Herra, kiirehdi minun avukseni.\nKunnia Isälle ja Pojalle ja Pyhälle Hengelle, niin kuin oli alussa, nyt on ja aina, iankaikkisesta iankaikkiseen. Aamen. Halleluja.',
      lucernarium: 'Valon rukous: Kristus, iltajuhlan lempeä loiste, taivaallisen kuolemattoman Isän pyhästä kunniasta. Kiitämme sinua valosta päivän laskeutuessa.',
      hymnSuggestion: 'Iltavirsi (esim. Virsi 555 / 556)',
      antiphon: 'Nouskoon minun rukoukseni suitsutusuhrina sinun kasvojesi eteen, kätteni kohottaminen iltauhrina.',
      psalms: [
        {
          reference: 'Ps. 141:1–4',
          text: 'Herra, minä huudan sinua, riennä minun tyköni, kuule minun ääneni, kun minä sinua huudan.\nNouskoon minun rukoukseni suitsutusuhrina sinun kasvojesi eteen, minun kätteni kohottaminen ehtoouhrina.\nAseta, Herra, minun suulleni vartija, vartioi minun huulteni ovea.'
        }
      ],
      gloriaPatri: GLORIA_PATRI,
      readings: [
        {
          reference: 'Luuk. 24:29',
          text: 'Jää meidän luoksemme, sillä ilta joutuu ja päivä on jo laskemassa.'
        }
      ],
      responsory: 'Sinun sanasi on lamppu, joka valaisee askeleeni, se on valo minun matkallani.\n– Sinun todistuksesi ovat minun ikuinen perintöni, ne ovat minun sydämeni ilo.',
      canticle: {
        name: 'Marian kiitosvirsi (Magnificat)',
        reference: 'Luuk. 1:46–55',
        text: 'Minun sieluni ylistää Herran suuruutta,\nminun henkeni riemuitsee Jumalasta, Vapahtajastani.\nHän on katsonut vähäisen palvelijattarensa puoleen.\nTästä lähtien kaikki sukupolvet ylistävät minua autuaaksi,\nsillä Voimallinen on tehnyt minulle suuria tekoja.\nHänen nimensä on pyhä, hänen laupeutensa pysyy polvesta polveen niille, jotka häntä pelkäävät.'
      },
      intercessions: {
        title: 'Yhteinen esirukous',
        intro: 'Rukoilkaamme Kristusta, maailman valoa, jota pimeys ei voi voittaa:',
        hasParishIntentions: true,
        prayers: [
          'Kiitämme sinua, Herra, tästä päivästä ja kaikista sen lahjoista ja varjeluksesta.',
          'Anna anteeksi erehdyksemme ja syntimme, ja anna sydämiimme sovinto ja rauha.',
          'Siunaa kotimme, läheisemme ja koko seurakuntayhteisömme.',
          'Ole lohtuna ja turvana heille, joiden ilta on ahdistuksen, sairauden tai surun varjostama.'
        ]
      },
      prayer: 'Valaise meidän pimeytemme, laupias Herra, ja varjele meitä suuressa armossasi kaikista tämän yön vaaroista ja onnettomuuksista ainosyntyisen Poikasi, meidän Vapahtajamme Jeesuksen Kristuksen tähden.',
      lordsPrayer: LORDS_PRAYER,
      blessing: 'Kiittäkäämme Herraa.\n– Jumalalle kiitos.\nKaikkivaltias ja armollinen Jumala, Isä, Poika ja Pyhä Henki, siunatkoon ja varjelkoon meitä. Aamen.'
    },
    night: {
      name: 'Yörukous (Kompletorio)',
      hour: 'night',
      timeSlot: '21:00 – 05:00',
      latinTitle: 'Completorium',
      opening: 'Kallista, Herra, korvasi minun puoleeni ja kuule minua.\nVarjele minua niin kuin silmäterääsi, kätke minut siipiesi suojaan.',
      confession: {
        title: 'Synnintunnustus ja anteeksiantamus',
        text: 'Tunnustan sinulle, Jumala, kaikkivaltias taivaallinen Isä, että olen syntinen ihminen ja rikkonut sinua vastaan ajatuksin, sanoin ja teoin. Anna minulle anteeksi Kristuksen tähden ja uudista minut Hengelläsi.',
        absolution: 'Kaikkivaltias ja armollinen Jumala antakoon meille anteeksi kaikki syntimme, vapauttakoon meidät pahasta ja johdattakoon meidät iankaikkiseen elämään. Aamen.'
      },
      hymnSuggestion: 'Yövirsi (esim. Virsi 559 / 563)',
      antiphon: 'Valvoessamme varjele meitä, Herra, nukkuessamme siunaa meitä, että valvoisimme Kristuksen kanssa ja lepäisimme rauhassa.',
      psalms: [
        {
          reference: 'Ps. 91:1–6',
          text: 'Joka Korkeimman suojassa istuu ja Kaikkivaltiaan varjossa yöpyy, hän sanoo Herralle:\n»Sinä olet minun turvani ja linnani, minun Jumalani, johon minä turvaan.»\nSillä hän päästää sinut linnustajan paulasta ja turmiollisesta rutosta.\nSulillansa hän sinua suojaa, ja sinä saat turvan hänen siipiensä alla; hänen uskollisuutensa on kilpi ja suojus.\nEt sinä pelkää yön kauhuja, et päivällä lentävää nuolta.'
        }
      ],
      gloriaPatri: GLORIA_PATRI,
      readings: [
        {
          reference: 'Jer. 14:9',
          text: 'Sinä olet kuitenkin meidän keskellämme, Herra, ja meidät on otettu sinun nimiisi. Älä jätä meitä!'
        }
      ],
      responsory: 'Sinun käsiisi, Herra, minä uskon henkeni.\n– Sinun käsiisi, Herra, minä uskon henkeni.\nSinä lunastat minut, Herra, sinä uskollinen Jumala.\n– Sinun käsiisi, Herra, minä uskon henkeni.\nKunnia Isälle ja Pojalle ja Pyhälle Hengelle.\n– Sinun käsiisi, Herra, minä uskon henkeni.',
      canticle: {
        name: 'Simeonin kiitosvirsi (Nunc Dimittis)',
        reference: 'Luuk. 2:29–32',
        text: 'Herra, nyt sinä sallit palvelijasi lähteä rauhassa, sanasi mukaan.\nMinun silmäni ovat nähneet sinun pelastuksesi,\njonka olet valmistanut kaikkien kansojen nähdä:\nvalon, joka koittaa pakanakansoille,\nja kirkkauden kansallesi Israelille.'
      },
      intercessions: null,
      prayer: 'Vieraile, Herra, tässä asunnossa ja aja kauas pois kaikki vihollisen juonet. Sinun pyhät enkelisi asukoot täällä varjellen meitä rauhassa, ja sinun siunauksesi olkoon aina meidän yllämme. Tätä pyydämme Herramme Jeesuksen Kristuksen kautta.',
      lordsPrayer: LORDS_PRAYER,
      blessing: 'Rauhallisen yön ja hyvän lopun suokoon meille kaikkivaltias ja armollinen Herra, Isä, Poika ja Pyhä Henki. Aamen.'
    },
    small: {
      name: 'Pieni rukoushetki',
      hour: 'small',
      timeSlot: 'Milloin vain',
      latinTitle: 'Oratio parva (Kirkkokäsikirja III)',
      opening: 'Isän ja Pojan ja Pyhän Hengen nimeen. Aamen.',
      hymnSuggestion: 'Laulu tai virsi (esim. Virsi 341 / Taizé-laulu)',
      antiphon: 'Herra, kuule minun rukoukseni, ota vastaan minun huutoni.',
      psalms: [
        {
          reference: 'Ps. 23:1–6',
          text: 'Herra on minun paimeneni, ei minulta mitään puutu.\nViheriäisille niityille hän vie minut lepäämään, virvoittavien vetten tykö hän minut johdattaa.\nHän virvoittaa minun sieluni, hän taluttaa minua oikealle tielle nimensä tähden.\nVaikka minä vaeltaisin pimeässä laaksossa, en minä pelkäisi mitään pahaa, sillä sinä olet minun kanssani; sinun vitsasi ja sauvasi minua lohduttavat.'
        }
      ],
      gloriaPatri: GLORIA_PATRI,
      readings: [
        {
          reference: 'Fil. 4:6–7',
          text: 'Älkää olko mistään huolissanne, vaan saattakaa aina se, mitä tarvitsette, rukouksella ja anomisella kiitoksen kanssa Jumalalle tiettäväksi. Ja Jumalan rauha, joka on kaikkea ymmärrystä ylempi, varjelee teidän sydämenne ja ajatuksenne Kristuksessa Jeesuksessa.'
        }
      ],
      responsory: 'Herra, sinun armosi on ikuinen.\n– Älä hylkää kättesi tekoa.',
      canticle: null,
      intercessions: {
        title: 'Päivän rukousjakso ja yhteinen esirukous',
        intro: 'Käännymme luottamuksella hyvän Jumalan puoleen:',
        hasParishIntentions: true,
        prayers: [
          'Pyhä Jumala, kiitämme sinua tästä hiljentymisen hetkestä ja läsnäolostasi.',
          'Tuo rauha ja lepo huolestuneille ja väsyneille.',
          'Anna viisautta päätöksentekoon ja voimaa päivän tehtäviin.',
          'Siunaa perheitämme, työyhteisöjämme ja seurakuntaamme.'
        ]
      },
      prayer: 'Herra Jumala, taivaallinen Isä, sinä tunnet meidän tarpeemme ennen kuin niitä anommekaan. Anna meille luottamus sinun hyvyyteesi ja auta meitä elämään sinun johdatuksessasi tänään ja aina. Aamen.',
      lordsPrayer: LORDS_PRAYER,
      blessing: 'Herra siunatkoon meitä ja varjelkoon meitä. Herra kirkastakoon kasvonsa meille ja olkoon meille armollinen. Herra kääntäköön kasvonsa meidän puoleemme ja antakoon meille rauhan. Isän ja Pojan ja Pyhän Hengen nimeen. Aamen.'
    }
  }
};

/**
 * Determine the nearest prayer hour based on hour of day (0-23)
 */
export function getNearestHourName(hourNumber = new Date().getHours()) {
  if (hourNumber >= 5 && hourNumber < 11) return 'morning';
  if (hourNumber >= 11 && hourNumber < 17) return 'noon';
  if (hourNumber >= 17 && hourNumber < 21) return 'evening';
  return 'night';
}

/**
 * Fetch day information from Anno API with fallback
 */
export async function fetchDayFromAnno(dateStr) {
  const isEnabled = await getSetting('anno_api_url_enabled', 'true');
  const apiUrl = await getSetting('anno_api_url', process.env.ANNO_API_URL || 'http://localhost:3000');

  if (isEnabled === 'false' || isEnabled === false) {
    return { holyDay: FALLBACK_LITURGICAL_DATA.holyDay, dailyVerse: FALLBACK_LITURGICAL_DATA.dailyVerse, source: 'fallback' };
  }

  const endpoint = dateStr 
    ? `${apiUrl.replace(/\/$/, '')}/api/v1/date/${dateStr}` 
    : `${apiUrl.replace(/\/$/, '')}/api/v1/today`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      return {
        holyDay: {
          name: data.holyDay?.name || data.weekdayMaterial?.name || FALLBACK_LITURGICAL_DATA.holyDay.name,
          theme: data.holyDay?.theme || data.weekdayMaterial?.theme || FALLBACK_LITURGICAL_DATA.holyDay.theme,
          liturgicalColor: data.holyDay?.liturgicalColor || { color: 'vihreä', english: 'green' },
          season: data.season || data.period || 'Kirkkovuosi',
          dayNumber: data.dayNumber
        },
        dailyVerse: data.dailyVerse || data.weekdayMaterial?.dailyVerse || FALLBACK_LITURGICAL_DATA.dailyVerse,
        source: 'anno-api',
        raw: data
      };
    }
  } catch (err) {
    // Network error or timeout - fall through to fallback
  }

  return { 
    holyDay: FALLBACK_LITURGICAL_DATA.holyDay, 
    dailyVerse: FALLBACK_LITURGICAL_DATA.dailyVerse, 
    source: 'fallback' 
  };
}

/**
 * Fetch lectionary and hours from Anno API with fallback, enriched with EVL Kirkkokäsikirja rubrics
 */
export async function fetchLectionaryFromAnno(dateStr) {
  const isEnabled = await getSetting('anno_api_enabled', 'true');
  const apiUrl = await getSetting('anno_api_url', process.env.ANNO_API_URL || 'http://localhost:3000');

  if (isEnabled !== 'true' && isEnabled !== true) {
    return { lectionary: FALLBACK_LITURGICAL_DATA.lectionary, source: 'fallback' };
  }

  const endpoint = dateStr 
    ? `${apiUrl.replace(/\/$/, '')}/api/v1/date/${dateStr}/lectionary`
    : `${apiUrl.replace(/\/$/, '')}/api/v1/today/lectionary`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const json = await res.json();
      const l = json.lectionary || json;
      const fb = FALLBACK_LITURGICAL_DATA.lectionary;

      // Merge dynamic readings and psalms into official Kirkkokäsikirja liturgy structures
      const hours = {
        morning: {
          ...fb.morning,
          psalms: l.morning?.psalms || fb.morning.psalms,
          readings: l.morning?.readings || fb.morning.readings,
          prayer: l.morning?.prayer || fb.morning.prayer
        },
        noon: {
          ...fb.noon,
          psalms: l.noon?.psalms || fb.noon.psalms,
          readings: l.noon?.readings || fb.noon.readings,
          prayer: l.noon?.prayer || fb.noon.prayer
        },
        evening: {
          ...fb.evening,
          psalms: l.evening?.psalms || fb.evening.psalms,
          readings: l.evening?.readings || fb.evening.readings,
          prayer: l.evening?.prayer || fb.evening.prayer
        },
        night: {
          ...fb.night,
          psalms: l.night?.psalms || fb.night.psalms,
          readings: l.night?.readings || fb.night.readings,
          prayer: l.night?.prayer || fb.night.prayer
        },
        small: {
          ...fb.small
        }
      };

      return { lectionary: hours, source: 'anno-api', raw: json };
    }
  } catch (err) {
    // Fall through to fallback
  }

  return { lectionary: FALLBACK_LITURGICAL_DATA.lectionary, source: 'fallback' };
}

/**
 * Test connectivity to an Anno API instance
 */
export async function testAnnoApi(customUrl) {
  const url = customUrl || await getSetting('anno_api_url', process.env.ANNO_API_URL || 'http://localhost:3000');
  const endpoint = `${url.replace(/\/$/, '')}/api/v1/today?cycles=false`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const start = Date.now();
    const res = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timeout);
    const latencyMs = Date.now() - start;

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        status: res.status,
        latencyMs,
        dayName: data.holyDay?.name || data.weekdayMaterial?.name || 'Tuntematon pyhäpäivä',
        season: data.season || data.period
      };
    }
    return {
      success: false,
      status: res.status,
      message: `HTTP ${res.status}: ${res.statusText}`
    };
  } catch (err) {
    return {
      success: false,
      message: err.name === 'AbortError' ? 'Yhteysaikakatkaisu (3s)' : err.message
    };
  }
}
