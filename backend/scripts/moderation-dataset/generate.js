#!/usr/bin/env node
/**
 * Deterministic synthetic dataset generator for the prayer-request moderation eval.
 *
 * Writes backend/test/moderation/dataset/dataset.jsonl. Every value is synthetic:
 * invented names, example.* domains, invented street addresses. Checksums
 * (henkilötunnus, Finnish IBAN mod-97, Luhn) are computed so values are format-valid.
 * Span offsets are computed while rendering templates (JS string indices, UTF-16 units).
 *
 * Usage: npm run gen:moderation-dataset
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(HERE, '..', '..', 'test', 'moderation', 'dataset');
const OUT_FILE = resolve(OUT_DIR, 'dataset.jsonl');
const SEED = 20261126;

const LANGS = ['fi', 'sv', 'en'];
const POS_COUNT = { fi: 126, sv: 70, en: 84 };
const HN_COUNT = { fi: 54, sv: 30, en: 36 };
const HARD_TYPES = ['hetu', 'iban', 'card', 'phone', 'email', 'address', 'url', 'plate', 'dob'];

// ---------------------------------------------------------------- PRNG (mulberry32)
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);
const int = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const digits = (n) => Array.from({ length: n }, () => int(0, 9)).join('');
const pad = (n, w) => String(n).padStart(w, '0');
const letters = (n, alphabet) => Array.from({ length: n }, () => pick(alphabet.split(''))).join('');
const slug = (n) => letters(n, 'abcdefghjkmnpqrstuvwxyz23456789');
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = int(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function cycle(list, n) {
  const out = [];
  while (out.length < n) {
    for (const x of shuffle([...list])) {
      if (out.length === n) break;
      out.push(x);
    }
  }
  return out;
}

// ---------------------------------------------------------------- checksum-valid values
const HETU_CHECK = '0123456789ABCDEFHJKLMNPRSTUVWXY';

function randomHetu() {
  const year = int(1880, 2005);
  const day = int(1, 28);
  const month = int(1, 12);
  const ddmmyy = `${pad(day, 2)}${pad(month, 2)}${pad(year % 100, 2)}`;
  const sign = year < 1900 ? '+' : year < 2000 ? '-' : 'A';
  const nnn = pad(int(2, 899), 3);
  const check = HETU_CHECK[Number(ddmmyy + nnn) % 31];
  return `${ddmmyy}${sign}${nnn}${check}`;
}

function mod97(numeric) {
  let r = 0;
  for (const ch of numeric) r = (r * 10 + (ch.charCodeAt(0) - 48)) % 97;
  return r;
}

function randomIban() {
  const bban = digits(14);
  // F = 15, I = 18; rearranged BBAN + "151800" (country letters + "00")
  const check = pad(98 - mod97(`${bban}151800`), 2);
  const full = `FI${check}${bban}`;
  return rand() < 0.5 ? full.replace(/(.{4})(?=.)/g, '$1 ') : full;
}

function luhnCheckDigit(payload) {
  let sum = 0;
  let double = true;
  for (let i = payload.length - 1; i >= 0; i--) {
    let d = payload.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return String((10 - (sum % 10)) % 10);
}

function randomCard() {
  const payload = `4${digits(14)}`;
  const full = payload + luhnCheckDigit(payload);
  return rand() < 0.5 ? full.replace(/(.{4})(?=.)/g, '$1 ') : full;
}

function randomPhone() {
  const p2 = pick(['40', '41', '44', '50']);
  const sub = digits(7);
  switch (int(0, 3)) {
    case 0:
      return `+358 ${p2} ${sub.slice(0, 3)} ${sub.slice(3)}`;
    case 1:
      return `0${p2}-${sub.slice(0, 3)} ${sub.slice(3)}`;
    case 2:
      return `0${p2}${sub}`;
    default:
      return `09 ${sub.slice(0, 3)} ${sub.slice(3)}`;
  }
}

const fold = (s) => s.toLowerCase().replace(/[äå]/g, 'a').replace(/ö/g, 'o').replace(/é/g, 'e');

function randomEmail(person) {
  const local = `${fold(person.first)}.${fold(person.last)}`;
  const domain = pick(['example.fi', 'example.org', 'example.se', 'example.com']);
  const [label, tld] = domain.split('.');
  return rand() < 0.3 ? `${local} (at) ${label} (dot) ${tld}` : `${local}@${domain}`;
}

function randomAddress(lang) {
  if (lang === 'fi') {
    const stem = pick(['Kuusi', 'Koivu', 'Mänty', 'Tammi', 'Kivi', 'Metsä', 'Lintu', 'Lepä']);
    const suffix = pick(['katu', 'tie', 'kuja']);
    const letter = rand() < 0.4 ? ` ${pick(['A', 'B', 'C'])}` : '';
    const post = pick(['00100 Helsinki', '11100 Riihimäki', '33100 Tampere', '01300 Vantaa']);
    return `${stem}${suffix} ${int(1, 80)}${letter}, ${post}`;
  }
  if (lang === 'sv') {
    const stem = pick(['Ek', 'Björk', 'Lind', 'Ängs', 'Ljung']);
    const suffix = pick(['gatan', 'vägen']);
    return `${stem}${suffix} ${int(1, 80)}, ${pick(['00100 Helsingfors', '01300 Vanda'])}`;
  }
  const street = pick(['Street', 'Road', 'Avenue']);
  return `${int(1, 199)} ${pick(['Maple', 'Hill', 'Mill', 'Oak', 'River'])} ${street}`;
}

const PRAYER_WORD = { fi: 'rukous', sv: 'bon', en: 'prayer' };
function randomUrl(lang) {
  const host = pick(['example.fi', 'example.org', 'example.se']);
  const s = slug(6);
  return pick([`https://${host}/${PRAYER_WORD[lang]}/${s}`, `www.${host}/${s}?ref=${slug(4)}`]);
}

// Finnish registration plates have three letters (e.g. "JOX-279"); two-letter plates are not valid.
function randomPlate() {
  const l = letters(3, 'ABCDEFGHJKLMNOPRSTUVXY');
  return `${l}-${pad(int(1, 999), 3)}`;
}

function randomDob() {
  const d = int(1, 28);
  const m = int(1, 12);
  const y = int(1930, 2010);
  const style = int(0, 2);
  if (style === 0) return `${d}.${m}.${y}`;
  if (style === 1) return `${pad(d, 2)}.${pad(m, 2)}.${y}`;
  return `${y}-${pad(m, 2)}-${pad(d, 2)}`;
}

// ---------------------------------------------------------------- person names (fictional)
const NAMES = {
  fi: [
    { first: 'Matti', gen: 'Matin', all: 'Matille', last: 'Virtanen' },
    { first: 'Liisa', gen: 'Liisan', all: 'Liisalle', last: 'Korhonen' },
    { first: 'Kaisa', gen: 'Kaisan', all: 'Kaisalle', last: 'Mäkinen' },
    { first: 'Juha', gen: 'Juhan', all: 'Juhalle', last: 'Lahtinen' },
    { first: 'Pekka', gen: 'Pekan', all: 'Pekalle', last: 'Heikkilä' },
    { first: 'Tuija', gen: 'Tuijan', all: 'Tuijalle', last: 'Niemi' },
    { first: 'Hannu', gen: 'Hannun', all: 'Hannulle', last: 'Salo' },
    { first: 'Anna', gen: 'Annan', all: 'Annalle', last: 'Koskinen' },
  ],
  sv: [
    { first: 'Johan', gen: 'Johans', all: 'Johan', last: 'Lindqvist' },
    { first: 'Lena', gen: 'Lenas', all: 'Lena', last: 'Berglund' },
    { first: 'Erik', gen: 'Eriks', all: 'Erik', last: 'Sjöberg' },
    { first: 'Karin', gen: 'Karins', all: 'Karin', last: 'Ekholm' },
    { first: 'Gustav', gen: 'Gustavs', all: 'Gustav', last: 'Nyström' },
  ],
  en: [
    { first: 'Oliver', last: 'Brooks' },
    { first: 'Helen', last: 'Carter' },
    { first: 'Robert', last: 'Hale' },
    { first: 'Emily', last: 'Ward' },
    { first: 'Victoria', last: 'Mitchell' },
    { first: 'Richard', last: 'Reed' },
  ],
};

// ---------------------------------------------------------------- non-span pools (hard negatives)
const POOLS = {
  fi: {
    DIVINE: ['Jumala', 'Jeesus', 'Maria', 'Pietari', 'Paavali', 'Johannes', 'Daavid'],
    WORD: ['toivo', 'rauha', 'armas', 'onni', 'ilona'],
    TITLE: ['piispa', 'kirkkoherra', 'kanttori', 'diakoni'],
    CHURCH: ['Keskuskirkko', 'Pyhän Ristin kirkko', 'Lähteen seurakuntakoti'],
    BIBLE: ['Joh. 3:16', 'Ps. 23', 'Room. 8:28', 'Matt. 6:9–13', '1. Kor. 13:4'],
    TIME: ['klo 12.30', 'klo 18.00', 'klo 9.15'],
    AMOUNT: ['1 200 euroa', '350 euroa', '12 500 euroa'],
  },
  sv: {
    DIVINE: ['Gud', 'Jesus', 'Maria', 'Petrus', 'Paulus', 'Johannes', 'David'],
    WORD: ['frid', 'hopp', 'nåd', 'glädje'],
    TITLE: ['biskopen', 'kyrkoherden', 'kantorn', 'diakonen'],
    CHURCH: ['domkyrkan', 'Sankt Olofs kyrka'],
    BIBLE: ['Joh. 3:16', 'Ps. 23', 'Rom. 8:28'],
    TIME: ['kl. 12.30', 'kl. 18.00'],
    AMOUNT: ['1 200 kronor', '350 kronor'],
  },
  en: {
    DIVINE: ['God', 'Jesus', 'Mary', 'Peter', 'Paul', 'John', 'David'],
    WORD: ['hope', 'peace', 'grace', 'joy', 'faith'],
    TITLE: ['the bishop', 'the vicar', 'the cantor', 'the deacon'],
    CHURCH: ['the central church', "St. Peter's church"],
    BIBLE: ['John 3:16', 'Ps. 23', 'Rom. 8:28', 'Matt. 6:9–13'],
    TIME: ['at 12:30', 'at 6 pm'],
    AMOUNT: ['$1,200', '350 pounds'],
  },
};

// ---------------------------------------------------------------- rendering with offsets
const TOKEN_TYPE = {
  HETU: 'hetu', IBAN: 'iban', CARD: 'card', PHONE: 'phone', EMAIL: 'email', ADDRESS: 'address',
  URL: 'url', PLATE: 'plate', DOB: 'dob', NAME: 'person_name', FIRST: 'person_name',
  GEN: 'person_name', ALL: 'person_name',
};

function valueFor(token, lang, person) {
  const type = TOKEN_TYPE[token];
  const field = { NAME: null, FIRST: 'first', GEN: 'gen', ALL: 'all' }[token];
  if (token === 'NAME') return { text: `${person.first} ${person.last}`, type };
  if (field) {
    if (person[field] === undefined) throw new Error(`name form ${token} missing for ${lang}`);
    return { text: person[field], type };
  }
  switch (token) {
    case 'HETU': return { text: randomHetu(), type };
    case 'IBAN': return { text: randomIban(), type };
    case 'CARD': return { text: randomCard(), type };
    case 'PHONE': return { text: randomPhone(), type };
    case 'EMAIL': return { text: randomEmail(person), type };
    case 'ADDRESS': return { text: randomAddress(lang), type };
    case 'URL': return { text: randomUrl(lang), type };
    case 'PLATE': return { text: randomPlate(), type };
    case 'DOB': return { text: randomDob(), type };
    case 'YEAR': return { text: String(int(1900, 2025)) };
    case 'PLAINDATE': return { text: `${int(1, 28)}.${int(1, 12)}.` };
    case 'SHORTNUM': return { text: String(int(10, 999)) };
    default:
      if (POOLS[lang][token]) return { text: pick(POOLS[lang][token]) };
      throw new Error(`unknown token ${token}`);
  }
}

function render(template, lang, person) {
  let out = '';
  const spans = [];
  let last = 0;
  const re = /\{([A-Z]+)\}/g;
  let m;
  while ((m = re.exec(template)) !== null) {
    out += template.slice(last, m.index);
    const { text, type } = valueFor(m[1], lang, person);
    const start = out.length;
    out += text;
    if (type) spans.push({ type, start, end: out.length, value: text });
    last = re.lastIndex;
  }
  out += template.slice(last);
  // Self-check: every recorded offset must slice back to the inserted value.
  for (const s of spans) {
    if (out.slice(s.start, s.end) !== s.value) throw new Error(`offset self-check failed for ${s.type}`);
  }
  return { text: out, spans: spans.map(({ type, start, end }) => ({ type, start, end })) };
}

function outcomeFor(spans, ctx) {
  if (spans.some((s) => HARD_TYPES.includes(s.type))) return 'reject';
  const hasName = spans.some((s) => s.type === 'person_name');
  if (hasName && ['health', 'family', 'legal'].includes(ctx)) return 'reject';
  if (ctx === 'vague') return 'queue';
  if (hasName && ctx === 'office') return 'queue';
  if (hasName) return 'mask';
  return 'clean';
}

// ---------------------------------------------------------------- templates
// ctx: none | health | family | legal | office | vague
const POS = {
  fi: [
    ['Rukoilkaa puolestani, sillä minulla on vaikea viikko töissä.', 'none'],
    ['Rukoilemme, että {FIRST} paranisi sairaudestaan nopeasti.', 'health'],
    ['Pyydämme siunausta perheelleni ja lapsilleni tänä talvena.', 'family'],
    ['Kiitos, että {FIRST} sai uuden työpaikan syksyllä.', 'none'],
    ['Äitini {NAME} on sairaalassa leikkauksen jälkeen, rukoilkaa hänen puolestaan.', 'health'],
    ['Pyydämme {GEN} parempaa oloa, sillä hänen tilanteensa on vaikea.', 'health'],
    ['Rukoilemme {ALL} rohkeutta uuteen työhön ja uusiin haasteisiin.', 'none'],
    ['Oikeusjuttu koskee {FIRST}, ja rukoilemme oikeudenmukaisuutta.', 'legal'],
    ['Kirkkoherra {NAME} pyytää rukousta seurakunnan puolesta.', 'office'],
    ['Piispa {NAME} vierailee ensi viikolla, ja toivomme siunausta hänen työlleen.', 'office'],
    ['Naapurimme toisessa kerroksessa on yksin ja tarvitsee lohtua.', 'vague'],
    ['Rukoilemme sen puolesta, joka asuu naapurissa toisessa kerroksessa.', 'vague'],
    ['Soitin numeroon {PHONE} ja pyydän rukousta perheemme puolesta.', 'family'],
    ['Voit ottaa yhteyttä osoitteeseen {EMAIL}, jos haluat rukoilla kanssamme.', 'none'],
    ['Osoitteeni on {ADDRESS}, ja kotona tarvitsemme rauhaa.', 'none'],
    ['Tilinumeroni {IBAN} on lahjoitusta varten, rukoilkaa sen puolesta.', 'none'],
    ['Kortin numero {CARD} katosi eilen, rukoilkaa että löydän sen.', 'none'],
    ['Autoni rekisterinumero on {PLATE} ja se varastettiin eilen illalla.', 'none'],
    ['Hetuni on {HETU}, ja pyydän rukousta henkilöllisyyteni turvaamiseksi.', 'none'],
    ['Hän on syntynyt {DOB} ja tarvitsee rukousta terveytensä vuoksi.', 'health'],
    ['Lisätietoja löydät osoitteesta {URL}.', 'none'],
    ['Rukoilkaa rauhaa maailmaan ja viisautta päättäjille.', 'none'],
    ['Pyydän rukousta työttömyyteeni ja taloudelliseen tilanteeseeni.', 'none'],
    ['Kiitämme Jumalaa uudesta vauvasta perheessämme.', 'family'],
    ['Rukoilemme {GEN} puolesta, joka on menettänyt puolisonsa.', 'family'],
    ['Pyydämme lohtua {ALL}, joka suree äitiään.', 'family'],
    ['Ajoneuvo {PLATE} on rikkoutunut ja tarvitsemme turvallisuutta matkoille.', 'none'],
    ['Rukoilkaa rukouksissanne {FIRST}, joka tulee kirkkoon ensi sunnuntaina.', 'none'],
    ['Kiitos, {FIRST} kävi tänään keittiössä auttamassa meitä.', 'none'],
    ['Lapseni {FIRST} aloittaa koulun syksyllä, siunatkaa häntä.', 'family'],
    ['Rukoilkaa seurakuntamme työntekijöiden puolesta.', 'none'],
    ['Rukousaiheemme on tehdä työpaikkamme rauhallisemmaksi.', 'none'],
    ['Pyydämme {GEN} puolesta, joka on vankilassa.', 'legal'],
    ['Rukoilemme {ALL} ja hänen perheensä parasta.', 'family'],
    ['Yksi ystävistäni on sairas, rukoilkaa hänen puolestaan.', 'health'],
    ['Rukoilemme {GEN} puolesta, joka odottaa tulosta lääkärin tutkimuksessa.', 'health'],
    ['Pyydän rukousta, koska {FIRST} on lähdössä ulkomaille ja pelkään.', 'none'],
    ['Kiitämme siitä, että {FIRST} tuli mukaan kerhoon.', 'none'],
    ['Rukoilkaa puolestamme, kun muutamme uuteen kotiin.', 'none'],
    ['Pyydämme rauhaa perheeseemme ja sovintoa.', 'family'],
    ['Rukoilemme {GEN} puolesta, hän menee leikkaukseen huomenna.', 'health'],
  ],
  sv: [
    ['Vi ber för vår familj under den här svåra tiden.', 'family'],
    ['Be för {FIRST} som är sjuk och väntar på operation.', 'health'],
    ['Kyrkoherden {NAME} ber om förbön för församlingen.', 'office'],
    ['Biskopen {NAME} besöker vår församling i höst.', 'office'],
    ['Grannen på andra våningen är ensam och behöver tröst.', 'vague'],
    ['Tack för att {FIRST} hjälpte oss med flytten.', 'none'],
    ['Vi ber om fred i världen och om vishet för ledarna.', 'none'],
    ['Min mamma {NAME} har gått bort och jag sörjer.', 'family'],
    ['Be för {GEN} hälsa, hon har cancer.', 'health'],
    ['Jag har en rättegång på gång och behöver visdom inför den.', 'legal'],
    ['Rättegången gäller {FIRST} och vi ber om rättvisa.', 'legal'],
    ['Ring mig på {PHONE} om du vill be tillsammans med mig.', 'none'],
    ['Skicka gärna ett mejl till {EMAIL} så svarar jag.', 'none'],
    ['Min adress är {ADDRESS} och jag behöver förbön för vårt hem.', 'none'],
    ['Mitt personnummer {HETU} kom bort i posten.', 'none'],
    ['Bankkontot {IBAN} används för kollekten.', 'none'],
    ['Kortnumret {CARD} har spärrats efter ett bedrägeri.', 'none'],
    ['Bilen med registreringsnummer {PLATE} blev stulen i går.', 'none'],
    ['Född {DOB}, och jag ber för min hälsa.', 'health'],
    ['Mer information finns på {URL}.', 'none'],
    ['Vi ber för {FIRST} som flyttar till en ny stad.', 'none'],
    ['Be för {FIRST}, hon mår dåligt efter operationen.', 'health'],
    ['Tack för vår nya kyrkvärd {NAME}.', 'none'],
    ['Vi tackar Gud för sommaren och för skörden.', 'none'],
    ['Be för dem som saknar arbete i vår stad.', 'none'],
    ['Jag är ensam hemma med barnen och behöver styrka.', 'family'],
    ['Be för {GEN} barn som mår dåligt i skolan.', 'family'],
    ['Kyrkvärden bor i huset bredvid den gula dörren.', 'vague'],
    ['Tack för {FIRST} som sjunger i kören varje söndag.', 'none'],
    ['Vi ber för fred i Mellanöstern och för de drabbade.', 'none'],
    ['Be för min pappa {FIRST}, han är inlagd på sjukhuset.', 'health'],
    ['Min granne på tredje våningen behöver stöd efter en olycka.', 'vague'],
    ['Vi ber om vägledning i vårt beslut om framtiden.', 'none'],
    ['Ta hand om {FIRST} som har förlorat sitt jobb.', 'none'],
    ['Be för barnet som föddes {DOB} på sjukhuset.', 'health'],
    ['Ring {PHONE} om du behöver någon att prata med.', 'none'],
    ['Vårt hem ligger på {ADDRESS} och där bor vi med fyra barn.', 'none'],
    ['Tack för {FIRST} och hennes familj som hjälper till i caféet.', 'none'],
    ['Vi ber för familjen {NAME} efter händelsen.', 'family'],
    ['Ärendet gäller {FIRST}, be om ett gott utfall.', 'legal'],
    ['Hjälp {FIRST} att hitta arbete och hopp.', 'none'],
    ['Vi ber om förbön för ett lyckat möte i söndags.', 'none'],
  ],
  en: [
    ['Please pray for my mother\'s surgery next week.', 'health'],
    ['Please pray for {FIRST}, who was diagnosed with cancer last month.', 'health'],
    ['Pastor {NAME} asks for prayer for the parish this autumn.', 'office'],
    ['Bishop {NAME} will visit our congregation in November.', 'office'],
    ['Our neighbour on the second floor has been lonely since the move.', 'vague'],
    ['Thank you for {FIRST}, who helped with the food drive.', 'none'],
    ['We pray for peace in the world and wisdom for our leaders.', 'none'],
    ['My father {NAME} passed away on Tuesday, and we are grieving.', 'family'],
    ['Please pray for {FIRST}\'s recovery after the accident.', 'health'],
    ['We are facing a court case and ask for justice.', 'legal'],
    ['The court hearing involves {FIRST}, and we ask for a fair outcome.', 'legal'],
    ['Call me at {PHONE} if you would like to pray together.', 'none'],
    ['Email {EMAIL} for details about the prayer group.', 'none'],
    ['Our home is at {ADDRESS}, and we would like prayer for the house.', 'none'],
    ['My national ID is {HETU}, please pray that it gets replaced.', 'none'],
    ['Please pray that the transfer to {IBAN} goes through.', 'none'],
    ['My card {CARD} was stolen last night, please pray for the situation.', 'none'],
    ['My car with plate {PLATE} broke down on the highway.', 'none'],
    ['Born {DOB}, I am asking for strength in my illness.', 'health'],
    ['More details are at {URL}.', 'none'],
    ['Please pray for {FIRST} as they start a new job.', 'none'],
    ['Pray for {FIRST}, who is struggling with depression.', 'health'],
    ['Pray for {FIRST}, our new church warden.', 'office'],
    ['Thanks be to God for the harvest and the summer.', 'none'],
    ['Please pray for the unemployed people in our town.', 'none'],
    ['I am alone with my children and I need strength.', 'family'],
    ['Pray for {FIRST}\'s children, who are having a hard time at school.', 'family'],
    ['The man in the blue house by the river needs comfort.', 'vague'],
    ['Thank you for {FIRST} who sings in the choir every Sunday.', 'none'],
    ['We pray for peace in the Middle East and for everyone affected.', 'none'],
    ['Please pray for my brother {FIRST}, who is in hospital.', 'health'],
    ['Our neighbour on the third floor needs support after a fall.', 'vague'],
    ['We ask for guidance in our decision about the future.', 'none'],
    ['Please keep {FIRST} in your prayers, they lost their job.', 'none'],
    ['{FIRST} was born {DOB} and is now recovering in hospital.', 'health'],
    ['Ring {PHONE} if you need someone to talk to.', 'none'],
    ['We live at {ADDRESS} and we would like prayer for our family.', 'none'],
    ['Thank you to {FIRST} and her family for helping at the cafe.', 'none'],
    ['We ask for prayer for the family of {NAME} after the incident.', 'family'],
    ['The legal matter concerns {FIRST}; we pray for a good outcome.', 'legal'],
    ['Pray for a good meeting with the council on Sunday.', 'none'],
    ['Pray for {FIRST} to find housing before winter.', 'none'],
    ['Please pray for wisdom as we plan the autumn retreat.', 'none'],
  ],
};

// Hard negatives: ordinary words, divine and biblical names, titles without names,
// years, Bible references, times, amounts, plain dates and short numbers. All clean.
const HN = {
  fi: [
    ['Tänään {TITLE} johti rukoushetken ja siunasi kaikki läsnäolijat.', 'none'],
    ['Pyydämme, että {WORD} ja rauha löytyisivät jokaisen sydämestä.', 'none'],
    ['{DIVINE} siunatkoon meitä kaikkia tänä viikonloppuna.', 'none'],
    ['Kiitämme vuotta {YEAR}, jolloin {CHURCH} remontoitiin.', 'none'],
    ['Luemme {BIBLE} ja rukoilemme sen sanan mukaan.', 'none'],
    ['Keräys tuotti {AMOUNT}, ja kiitämme siitä.', 'none'],
    ['Pääsiäinen {PLAINDATE} on kiitoksen aika seurakunnassa.', 'none'],
    ['Virsi {SHORTNUM} lauletaan {TIME} sunnuntaina.', 'none'],
    ['Seurakunnan kokous on {PLAINDATE} ja kaikki ovat tervetulleita.', 'none'],
    ['Tänään luemme kertomuksen, jossa {DIVINE} rukoilee kansansa puolesta.', 'none'],
    ['Kirkossa {CHURCH} soi urut {TIME}.', 'none'],
    ['Rukoilemme {WORD} ja armoa kaikille perheille.', 'none'],
  ],
  sv: [
    ['Idag ledde {TITLE} bönestunden och välsignade alla.', 'none'],
    ['Vi ber att {DIVINE} ska ge oss {WORD} i vardagen.', 'none'],
    ['{DIVINE} välsigne oss alla i helgen.', 'none'],
    ['Vi tackar för {YEAR}, då {CHURCH} renoverades.', 'none'],
    ['Vi läser {BIBLE} och ber efter texten.', 'none'],
    ['Kollekten blev {AMOUNT} och vi tackar för gåvorna.', 'none'],
    ['Påsk {PLAINDATE} firas i {CHURCH}.', 'none'],
    ['Psalm {SHORTNUM} sjungs {TIME} på söndag.', 'none'],
    ['Gudstjänsten är {PLAINDATE} och alla är välkomna.', 'none'],
    ['{WORD} och glädje är gåvor från Gud.', 'none'],
  ],
  en: [
    ['Today {TITLE} led the prayer and blessed everyone.', 'none'],
    ['We pray that {DIVINE} will give us {WORD} this week.', 'none'],
    ['We ask that {DIVINE} blesses our congregation.', 'none'],
    ['We thank God for {YEAR}, when {CHURCH} was restored.', 'none'],
    ['Our reading is {BIBLE} this week.', 'none'],
    ['The offering reached {AMOUNT}, and we are grateful.', 'none'],
    ['Easter falls on {PLAINDATE} this year.', 'none'],
    ['Hymn {SHORTNUM} will be sung {TIME} on Sunday.', 'none'],
    ['Service on {PLAINDATE} at {CHURCH} is open to all.', 'none'],
    ['Peace and {WORD} are gifts we receive every day.', 'none'],
  ],
};

// ---------------------------------------------------------------- build
function makeItem(lang, template, ctx) {
  const person = pick(NAMES[lang]);
  const r = render(template, lang, person);
  return { lang, text: r.text, spans: r.spans, expected: outcomeFor(r.spans, ctx) };
}

// Re-render a template until its text is new (bounded), so exact duplicates are rare.
function uniqueItem(seen, lang, tpl, ctx) {
  let it = makeItem(lang, tpl, ctx);
  for (let attempt = 0; attempt < 25 && seen.has(it.text); attempt++) it = makeItem(lang, tpl, ctx);
  seen.add(it.text);
  return it;
}

function buildItems() {
  const items = [];
  const seen = new Set();
  for (const lang of LANGS) {
    for (const [tpl, ctx] of cycle(HN[lang], HN_COUNT[lang])) {
      const it = uniqueItem(seen, lang, tpl, ctx);
      if (it.expected !== 'clean' || it.spans.length !== 0) {
        throw new Error(`hard negative template produced spans or non-clean outcome (${lang})`);
      }
      items.push(it);
    }
    for (const [tpl, ctx] of cycle(POS[lang], POS_COUNT[lang])) items.push(uniqueItem(seen, lang, tpl, ctx));
  }
  shuffle(items);
  return items.map((it, i) => ({
    id: `mod-${pad(i + 1, 4)}`,
    lang: it.lang,
    text: it.text,
    spans: it.spans,
    expected: it.expected,
  }));
}

function summarize(items) {
  const byLang = {};
  const spanCounts = {};
  for (const it of items) {
    byLang[it.lang] ??= { total: 0, outcomes: {} };
    byLang[it.lang].total++;
    byLang[it.lang].outcomes[it.expected] = (byLang[it.lang].outcomes[it.expected] ?? 0) + 1;
    for (const s of it.spans) spanCounts[s.type] = (spanCounts[s.type] ?? 0) + 1;
  }
  return { byLang, spanCounts };
}

const items = buildItems();
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, items.map((it) => JSON.stringify(it)).join('\n') + '\n', 'utf8');

const { byLang, spanCounts } = summarize(items);
console.log(`wrote ${items.length} lines to ${OUT_FILE}`);
for (const lang of LANGS) {
  const o = byLang[lang].outcomes;
  console.log(`${lang}: ${byLang[lang].total} items; reject=${o.reject ?? 0} mask=${o.mask ?? 0} queue=${o.queue ?? 0} clean=${o.clean ?? 0}`);
}
console.log('spans by type:', JSON.stringify(spanCounts));
