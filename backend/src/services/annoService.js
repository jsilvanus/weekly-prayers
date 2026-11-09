import { getSetting } from './settingsService.js';

// Realistic Finnish liturgical fallback data for offline / fallback mode
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
      antiphon: 'Ylistetty olkoon Herra, Israelin Jumala, sillä hän on katsonut kansansa puoleen ja valmistanut sille lunastuksen.',
      psalms: [
        {
          reference: 'Ps. 63:2–9',
          text: 'Jumala, minun Jumalani, sinua minä etsin varhain.\nSieluni janoaa sinua, ruumiini ikävöi sinua\nkuivassa, nääntyneessä ja vedettömässä maassa.\n  Niin minä katselen sinua pyhäkössä,\nnähdäkseni sinun voimasi ja kunniasi.'
        }
      ],
      readings: [
        {
          reference: '1. Tess. 5:5–8',
          text: 'Te kaikki olette valkeuden lapsia ja päivän lapsia; me emme ole yön emmekä pimeyden lapsia. Älkäämme siis nukkuko niinkuin muut, vaan valvokaamme ja olkaamme raittiit.'
        }
      ],
      prayer: 'Kaikkivaltias, iankaikkinen Jumala, sinä olet johdattanut meidät uuden päivän valoon. Varjele meitä tänään voimallasi, ettemme lankeaisi syntiin emmekä joutuisi mihinkään vaaraan, vaan toimisimme aina sinun tahtosi mukaan.'
    },
    noon: {
      name: 'Päivärukous (Seksti)',
      hour: 'noon',
      timeSlot: '11:00 – 16:00',
      antiphon: 'Herra on minun valoni ja apuni, ketä minä pelkäisin?',
      psalms: [
        {
          reference: 'Ps. 121:1–8',
          text: 'Minä nostan silmäni vuoria kohti:\nmistä tulee minulle apu?\n  Apu minulle tulee Herralta,\njoka on tehnyt taivaan ja maan.\nHän ei salli sinun jalkasi horjua,\nsinun varjelijasi ei torku.'
        }
      ],
      readings: [
        {
          reference: 'Gal. 6:9–10',
          text: 'Älkäämme siis väsykö tekemään hyvää, sillä me saamme aikanamme niittää, jos emme lannistu. Sentähden, kun meillä vielä on aikaa, tehkäämme hyvää kaikille.'
        }
      ],
      prayer: 'Herra Jeesus Kristus, sinä nousit ristille keskipäivän hetkellä pelastaaksesi maailman synnistä ja kuolemasta. Vuodata Henkesi meidän sydämiimme, että muistaisimme aina rakkautesi ja antaisimme elämämme sinun palvelukseesi.'
    },
    evening: {
      name: 'Iltarukous (Vesper)',
      hour: 'evening',
      timeSlot: '17:00 – 20:00',
      antiphon: 'Nouskoon minun rukoukseni suitsutusuhrina sinun kasvojesi eteen, kätteni kohottaminen iltauhrina.',
      psalms: [
        {
          reference: 'Ps. 141:1–4',
          text: 'Herra, minä huudan sinua, riennä minun tyköni,\nkuule minun ääneni, kun minä sinua huudan.\n  Nouskoon minun rukoukseni suitsutusuhrina\nsinun kasvojesi eteen.'
        }
      ],
      readings: [
        {
          reference: 'Luuk. 24:29',
          text: 'Jää meidän luoksemme, sillä ilta joutuu ja päivä on jo laskemassa.'
        }
      ],
      prayer: 'Valaise meidän pimeytemme, laupias Herra, ja varjele meitä suuressa armossasi kaikista tämän yön vaaroista ja onnettomuuksista ainosyntyisen Poikasi, meidän Vapahtajamme Jeesuksen Kristuksen tähden.'
    },
    night: {
      name: 'Yörukous (Kompletorio)',
      hour: 'night',
      timeSlot: '21:00 – 05:00',
      antiphon: 'Valvoessamme varjele meitä, Herra, nukkuessamme siunaa meitä, että valvoisimme Kristuksen kanssa ja lepäisimme rauhassa.',
      psalms: [
        {
          reference: 'Ps. 91:1–6',
          text: 'Joka Korkeimman suojassa istuu\nja Kaikkivaltiaan varjossa yöpyy,\n  hän sanoo Herralle:\n»Sinä olet minun turvani ja linnani,\nminun Jumalani, johon minä turvaan.»'
        }
      ],
      readings: [
        {
          reference: 'Jer. 14:9',
          text: 'Sinä olet kuitenkin meidän keskellämme, Herra, ja meidät on otettu sinun nimiisi. Älä jätä meitä!'
        }
      ],
      prayer: 'Vieraile, Herra, tässä asunnossa ja aja kauas pois kaikki vihollisen juonet. Sinun pyhät enkelisi asukoot täällä varjellen meitä rauhassa, ja sinun siunauksesi olkoon aina meidän yllämme.'
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
  const isEnabled = await getSetting('anno_api_enabled', 'true');
  const apiUrl = await getSetting('anno_api_url', process.env.ANNO_API_URL || 'http://localhost:3000');

  if (isEnabled !== 'true' && isEnabled !== true) {
    return { data: FALLBACK_LITURGICAL_DATA, source: 'fallback' };
  }

  const endpoint = dateStr 
    ? `${apiUrl.replace(/\/$/, '')}/api/v1/date/${dateStr}?cycles=false`
    : `${apiUrl.replace(/\/$/, '')}/api/v1/today?cycles=false`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      return { data, source: 'anno-api' };
    }
  } catch (err) {
    // Network error or timeout - fall through to fallback
  }

  return { data: FALLBACK_LITURGICAL_DATA, source: 'fallback' };
}

/**
 * Fetch lectionary and hours from Anno API with fallback
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
      // Format anno-api lectionary into unified hours format
      const l = json.lectionary || json;
      const hours = {
        morning: {
          name: 'Aamurukous (Laudes)',
          hour: 'morning',
          timeSlot: '06:00 – 10:00',
          antiphon: 'Herra, avaa minun huuleni, niin suuni julistaa sinun kiitostasi.',
          psalms: l.morning?.psalms || FALLBACK_LITURGICAL_DATA.lectionary.morning.psalms,
          readings: l.morning?.readings || FALLBACK_LITURGICAL_DATA.lectionary.morning.readings,
          prayer: FALLBACK_LITURGICAL_DATA.lectionary.morning.prayer
        },
        noon: {
          name: 'Päivärukous (Seksti)',
          hour: 'noon',
          timeSlot: '11:00 – 16:00',
          antiphon: 'Herra on minun paimeneni, ei minulta mitään puutu.',
          psalms: l.noon?.psalms || FALLBACK_LITURGICAL_DATA.lectionary.noon.psalms,
          readings: l.noon?.readings || FALLBACK_LITURGICAL_DATA.lectionary.noon.readings,
          prayer: FALLBACK_LITURGICAL_DATA.lectionary.noon.prayer
        },
        evening: {
          name: 'Iltarukous (Vesper)',
          hour: 'evening',
          timeSlot: '17:00 – 20:00',
          antiphon: 'Jumala, riennä minua pelastamaan, Herra, riennä minun avukseni.',
          psalms: l.evening?.psalms || FALLBACK_LITURGICAL_DATA.lectionary.evening.psalms,
          readings: l.evening?.readings || FALLBACK_LITURGICAL_DATA.lectionary.evening.readings,
          prayer: FALLBACK_LITURGICAL_DATA.lectionary.evening.prayer
        },
        night: {
          name: 'Yörukous (Kompletorio)',
          hour: 'night',
          timeSlot: '21:00 – 05:00',
          antiphon: 'Valvoessamme varjele meitä, Herra, nukkuessamme siunaa meitä.',
          psalms: FALLBACK_LITURGICAL_DATA.lectionary.night.psalms,
          readings: FALLBACK_LITURGICAL_DATA.lectionary.night.readings,
          prayer: FALLBACK_LITURGICAL_DATA.lectionary.night.prayer
        }
      };

      return { lectionary: hours, source: 'anno-api', raw: json };
    }
  } catch (err) {
    // Network error or timeout - fall through to fallback
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
