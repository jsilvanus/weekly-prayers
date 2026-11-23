import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { withBasePath } from '../../services/api';
import { useTenant } from '../../context/TenantContext';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import LandingHero from '../common/LandingHero';
import LoadingSpinner from '../common/LoadingSpinner';

const LITURGICAL_COLORS = {
  vihreä: {
    name: 'Vihreä',
    english: 'green',
    bannerBg: 'from-emerald-800 via-emerald-700 to-teal-800',
    cardBg: 'bg-emerald-50/70',
    badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    dot: 'bg-emerald-600',
    accentBorder: 'border-emerald-600',
    meaning: 'Arki, kasvu, elämä ja toivo'
  },
  valkoinen: {
    name: 'Valkoinen / Kulta',
    english: 'white',
    bannerBg: 'from-amber-700 via-yellow-700 to-amber-800',
    cardBg: 'bg-amber-50/70',
    badgeBg: 'bg-amber-100 text-amber-950 border-amber-300',
    dot: 'bg-amber-400 ring-1 ring-amber-600',
    accentBorder: 'border-amber-500',
    meaning: 'Kristus-juhla, ilo, puhtaus ja valo'
  },
  violetti: {
    name: 'Violetti',
    english: 'purple',
    bannerBg: 'from-purple-900 via-purple-800 to-indigo-900',
    cardBg: 'bg-purple-50/70',
    badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
    dot: 'bg-purple-600',
    accentBorder: 'border-purple-600',
    meaning: 'Odottaminen, valmistautuminen ja katumus'
  },
  punainen: {
    name: 'Punainen',
    english: 'red',
    bannerBg: 'from-red-900 via-red-800 to-rose-900',
    cardBg: 'bg-red-50/70',
    badgeBg: 'bg-red-100 text-red-900 border-red-300',
    dot: 'bg-red-600',
    accentBorder: 'border-red-600',
    meaning: 'Pyhä Henki, todistus ja Kristuksen rakkaus'
  },
  musta: {
    name: 'Musta',
    english: 'black',
    bannerBg: 'from-stone-900 via-stone-800 to-neutral-900',
    cardBg: 'bg-stone-100',
    badgeBg: 'bg-stone-200 text-stone-900 border-stone-400',
    dot: 'bg-stone-900',
    accentBorder: 'border-stone-800',
    meaning: 'Suru, katoavaisuus ja ristin hiljaisuus'
  },
  sininen: {
    name: 'Sininen',
    english: 'blue',
    bannerBg: 'from-blue-900 via-blue-800 to-slate-900',
    cardBg: 'bg-blue-50/70',
    badgeBg: 'bg-blue-100 text-blue-900 border-blue-300',
    dot: 'bg-blue-600',
    accentBorder: 'border-blue-600',
    meaning: 'Taivas, toivo ja Marian kiitosvirsi'
  }
};

function getUpcomingSundayStr() {
  const d = new Date();
  const day = d.getDay();
  if (day !== 0) {
    d.setDate(d.getDate() + (7 - day));
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dt = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dt}`;
}

function formatDateFi(dateStr) {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    return d.toLocaleDateString('fi-FI', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
}

function formatShortDateFi(dateStr) {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-').map(Number);
    return `${parts[2]}.${parts[1]}.`;
  } catch (e) {
    return dateStr;
  }
}

async function fetchJson(endpoint) {
  const token = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('token') : null;
  const res = await fetch(withBasePath(endpoint), {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  if (!res.ok) throw new Error('Pyhäpäivän tietojen haku epäonnistui');
  return res.json();
}

export default function PyhapaivaPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentTenant, isModuleEnabled } = useTenant();
  const { settings, getModuleTitle } = useSettings();
  const { user, isWorkerOrAbove } = useAuth();

  const canSeeDisabled = isWorkerOrAbove || user?.role === 'admin';
  const isEnabled = isModuleEnabled ? isModuleEnabled('pyhapaiva') : true;

  const [selectedDate, setSelectedDate] = useState(() => {
    return searchParams.get('date') || getUpcomingSundayStr();
  });
  const [translation, setTranslation] = useState(() => {
    return searchParams.get('translation') || 'KR92';
  });
  const [fontScale, setFontScale] = useState('normal'); // 'normal' | 'large' | 'xlarge'
  const [pewSheetMode, setPewSheetMode] = useState(() => searchParams.get('view') === 'pew-sheet');

  const [dayData, setDayData] = useState(null);
  const [calendarDays, setCalendarDays] = useState([]);
  const [loading, setLoading] = useState(true);

  const parishName = currentTenant?.name || settings?.parish_name || 'Seurakunta';
  const moduleTitle = getModuleTitle ? getModuleTitle('pyhapaiva', 'Pyhäpäivä & Kirkkovuosi') : 'Pyhäpäivä & Kirkkovuosi';

  // Fetch calendar list of Sundays & Holy Days
  useEffect(() => {
    let mounted = true;
    async function loadCalendar() {
      try {
        const tenantParam = currentTenant?.slug ? `&tenant=${encodeURIComponent(currentTenant.slug)}` : '';
        const cal = await fetchJson(`/api/pyhapaiva/calendar?days=120${tenantParam}`);
        if (mounted && Array.isArray(cal?.holyDays)) {
          setCalendarDays(cal.holyDays);
        }
      } catch (e) {
        // Fallback calendar will still work via date picker
      }
    }
    loadCalendar();
    return () => { mounted = false; };
  }, [currentTenant?.slug]);

  // Fetch selected holy day readings & parish overrides
  useEffect(() => {
    let mounted = true;
    async function loadHolyDay() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedDate) params.set('date', selectedDate);
        if (translation) params.set('translation', translation);
        if (currentTenant?.slug) params.set('tenant', currentTenant.slug);
        const data = await fetchJson(`/api/pyhapaiva/day?${params.toString()}`);
        if (mounted) {
          setDayData(data);
          setLoading(false);
        }
      } catch (e) {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    loadHolyDay();
    return () => { mounted = false; };
  }, [selectedDate, translation, currentTenant?.slug]);

  const handleSelectDate = (newDate) => {
    if (!newDate) return;
    setSelectedDate(newDate);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('date', newDate);
    setSearchParams(nextParams, { replace: true });
  };

  const handleStepHolyDay = (direction) => {
    // If current date is in calendarDays, jump to prev/next holy day in list; otherwise step 7 days
    const idx = calendarDays.findIndex(d => d.date === selectedDate);
    if (idx !== -1) {
      const targetIdx = idx + direction;
      if (targetIdx >= 0 && targetIdx < calendarDays.length) {
        handleSelectDate(calendarDays[targetIdx].date);
        return;
      }
    }
    const parts = selectedDate.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    d.setDate(d.getDate() + direction * 7);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dt = String(d.getDate()).padStart(2, '0');
    handleSelectDate(`${y}-${m}-${dt}`);
  };

  const colorKey = dayData?.liturgicalColor?.color?.toLowerCase() || 'vihreä';
  const colorTheme = LITURGICAL_COLORS[colorKey] || LITURGICAL_COLORS.vihreä;

  const textSizeClass = useMemo(() => {
    if (fontScale === 'xlarge') return 'text-lg sm:text-xl leading-relaxed';
    if (fontScale === 'large') return 'text-base sm:text-lg leading-relaxed';
    return 'text-sm sm:text-base leading-relaxed';
  }, [fontScale]);

  const handlePrintPewSheet = () => {
    setPewSheetMode(true);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  if (!isEnabled && !canSeeDisabled) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="text-4xl">⛪</div>
        <h2 className="font-martti text-2xl font-bold text-stone-900">
          {moduleTitle} ei ole käytössä
        </h2>
        <p className="text-sm text-stone-600">
          Tämä osio ei ole tällä hetkellä aktivoitu seurakunnan sivustolla.
        </p>
        <Link to="/" className="inline-flex items-center gap-2 btn-primary text-xs py-2 px-4 rounded-full">
          &larr; Palaa etusivulle
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-7" data-testid="pyhapaiva-page">
      {/* Print-only stylesheet adjustments */}
      <style>{`
        @media print {
          header, footer, .no-print, [data-testid="landing-hero"] {
            display: none !important;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .print-pew-sheet {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
          }
        }
      `}</style>

      {!isEnabled && canSeeDisabled && (
        <div className="no-print bg-amber-50 border border-amber-300 text-amber-900 px-4 py-2.5 rounded-2xl text-xs sm:text-sm flex items-center gap-2 font-medium">
          <span>⚠️</span>
          <span>Pyhäpäivä-moduuli on poissa käytöstä julkisilta kävijöiltä. Ylläpitäjänä ja työntekijänä näet sivun normaalisti.</span>
        </div>
      )}

      {/* Unified Landing Hero */}
      <div className="no-print">
        <LandingHero
          currentModule="pyhapaiva"
          title={moduleTitle}
          subtitle="Kirkkovuoden pyhäpäivät, seurakunnan teema, päivän rukous ja Evankeliumikirjan lukukappaleet"
          primaryAction={{
            label: '🖨️ Tulosta pyhäpäivän lehtinen',
            onClick: handlePrintPewSheet,
            className: 'bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-white'
          }}
        />
      </div>

      {/* Interactive Church Year Calendar & Holy Day Jumper */}
      <section
        aria-label="Kirkkovuoden päivävalitsin"
        className="no-print bg-white rounded-2xl shadow-sm border border-stone-200 p-4 sm:p-6 space-y-4"
        data-testid="church-year-navigator"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleStepHolyDay(-1)}
              className="px-3 py-1.5 rounded-xl border border-stone-300 bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-stone-800 transition-colors"
              data-testid="prev-holy-day-btn"
            >
              &larr; Edellinen pyhä
            </button>
            <button
              type="button"
              onClick={() => handleSelectDate(getUpcomingSundayStr())}
              className="px-3 py-1.5 rounded-xl border border-primary-300 bg-primary-50 hover:bg-primary-100 text-xs font-bold text-primary-900 transition-colors"
              data-testid="upcoming-sunday-btn"
            >
              ⛪ Tuleva pyhä
            </button>
            <button
              type="button"
              onClick={() => handleStepHolyDay(1)}
              className="px-3 py-1.5 rounded-xl border border-stone-300 bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-stone-800 transition-colors"
              data-testid="next-holy-day-btn"
            >
              Seuraava pyhä &rarr;
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="pyhapaiva-date-picker" className="text-xs font-semibold text-stone-600">
              Valitse päivä:
            </label>
            <input
              id="pyhapaiva-date-picker"
              type="date"
              value={selectedDate}
              onChange={(e) => handleSelectDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-stone-300 bg-white text-stone-900 focus:ring-2 focus:ring-primary-600 focus:outline-hidden"
              data-testid="pyhapaiva-date-input"
            />
          </div>
        </div>

        {/* Upcoming Holy Days Pill Strip */}
        {calendarDays.length > 0 && (
          <div className="pt-2 border-t border-stone-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                Kirkkovuoden pyhäpäivät
              </span>
              {isWorkerOrAbove && (
                <Link
                  to={`/admin?domain=pyhapaiva&date=${selectedDate}`}
                  className="text-xs font-semibold text-primary-700 hover:text-primary-900 underline"
                >
                  ⚙️ Muokkaa pyhäpäivän otsikkoa ja kuvausta &rarr;
                </Link>
              )}
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
              {calendarDays.map((hd) => {
                const isSelected = hd.date === selectedDate;
                const hdColor = LITURGICAL_COLORS[hd.liturgicalColor?.color?.toLowerCase()] || LITURGICAL_COLORS.vihreä;
                return (
                  <button
                    key={hd.date}
                    type="button"
                    onClick={() => handleSelectDate(hd.date)}
                    className={`shrink-0 px-3 py-2 rounded-xl border text-left transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'border-stone-900 bg-stone-900 text-white shadow-xs'
                        : 'border-stone-200 bg-stone-50/70 hover:bg-stone-100 text-stone-800'
                    }`}
                    data-testid={`calendar-pill-${hd.date}`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${hdColor.dot}`} />
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold leading-tight truncate max-w-[165px]">
                        {hd.name}
                      </div>
                      <div className={`text-[10px] truncate max-w-[165px] ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>
                        {formatShortDateFi(hd.date)} &bull; {hd.heading}
                      </div>
                    </div>
                    {hd.isCustomHeading && (
                      <span
                        title="Seurakunnan oma otsikko/teema"
                        className="text-[10px] bg-amber-200 text-amber-950 font-bold px-1.5 py-0.2 rounded-full"
                      >
                        ★
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : dayData ? (
        <article
          className="print-pew-sheet bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden space-y-8 pb-8"
          data-testid="pyhapaiva-article"
        >
          {/* Liturgical Color Theme Header Banner */}
          <div className={`bg-gradient-to-r ${colorTheme.bannerBg} text-white p-6 sm:p-9 relative`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-xs px-3 py-1 rounded-full">
                  {dayData.season || 'Kirkkovuosi'}
                </span>
                {dayData.lectionaryYear && (
                  <span className="text-xs font-semibold bg-black/20 px-2.5 py-1 rounded-full">
                    {dayData.lectionaryYear}. vuosikerta
                  </span>
                )}
                {dayData.isCustomHeading && (
                  <span
                    className="text-xs font-bold bg-amber-300 text-amber-950 px-2.5 py-1 rounded-full"
                    data-testid="parish-custom-theme-badge"
                  >
                    ⭐ Seurakunnan teema
                  </span>
                )}
              </div>

              {/* Liturgical Color Indicator */}
              <div className="inline-flex items-center gap-2 bg-white/95 text-stone-900 px-3 py-1 rounded-full text-xs font-bold shadow-xs">
                <span className={`w-3 h-3 rounded-full ${colorTheme.dot}`} />
                <span>Liturginen väri: {colorTheme.name}</span>
              </div>
            </div>

            {/* Official Holy Day Name & Date */}
            <div className="text-xs sm:text-sm text-white/85 font-medium mb-1">
              {dayData.name} {dayData.latinName ? `(${dayData.latinName})` : ''} &bull; {formatDateFi(dayData.date)}
            </div>

            {/* Effective Heading: Parish Custom Heading OR Official Anno Heading */}
            <h2
              className="font-martti text-2xl sm:text-4xl font-bold leading-tight mt-1"
              data-testid="pyhapaiva-heading"
            >
              {dayData.heading}
            </h2>

            {/* If parish set a custom heading, show official church year theme underneath */}
            {dayData.isCustomHeading && dayData.officialHeading && dayData.officialHeading !== dayData.heading && (
              <p className="text-xs sm:text-sm text-white/80 italic mt-1.5" data-testid="official-anno-heading">
                Kirkkovuoden virallinen aihe: &rdquo;{dayData.officialHeading}&rdquo;
              </p>
            )}

            {/* Effective Description: Parish Custom Description OR Official Anno Description */}
            {dayData.description && (
              <p
                className="mt-4 text-sm sm:text-base text-white/95 leading-relaxed max-w-3xl whitespace-pre-wrap"
                data-testid="pyhapaiva-description"
              >
                {dayData.description}
              </p>
            )}
          </div>

          <div className="px-6 sm:px-9 space-y-7">
            {/* Toolbar: Translation Switcher, Font Size & Print Mode Toggle */}
            <div className="no-print flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-200">
              {/* Bible Translation Switcher */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Raamatunkäännös:
                </span>
                <div className="inline-flex rounded-xl bg-stone-100 p-1 border border-stone-200">
                  {['KR92', 'KR38', 'UT2020'].map((tr) => (
                    <button
                      key={tr}
                      type="button"
                      onClick={() => setTranslation(tr)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        translation === tr
                          ? 'bg-white text-stone-900 shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                      data-testid={`translation-btn-${tr}`}
                    >
                      {tr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Scale & Pew Sheet Print Button */}
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-xl bg-stone-100 p-1 border border-stone-200" aria-label="Tekstin koko">
                  {[
                    { id: 'normal', label: 'A' },
                    { id: 'large', label: 'A+' },
                    { id: 'xlarge', label: 'A++' }
                  ].map((sz) => (
                    <button
                      key={sz.id}
                      type="button"
                      onClick={() => setFontScale(sz.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        fontScale === sz.id
                          ? 'bg-white text-stone-900 shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {sz.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setPewSheetMode((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    pewSheetMode
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-white text-stone-800 border-stone-300 hover:bg-stone-50'
                  }`}
                  data-testid="toggle-pew-sheet-btn"
                >
                  {pewSheetMode ? '📖 Lukunäkymä' : '📄 Messulehtinen'}
                </button>

                <button
                  type="button"
                  onClick={handlePrintPewSheet}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-800 hover:bg-amber-900 text-white transition-colors shadow-2xs"
                  data-testid="print-pew-sheet-btn"
                >
                  🖨️ Tulosta
                </button>
              </div>
            </div>

            {/* Parish Service Info & Pastoral Reflection (if configured by parish) */}
            {(dayData.pastoralReflection || dayData.serviceInfo?.time || dayData.serviceInfo?.location || dayData.serviceInfo?.liturgist) && (
              <div
                className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-5 sm:p-6 space-y-3"
                data-testid="parish-service-card"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-martti text-base sm:text-lg font-bold text-amber-950 flex items-center gap-2">
                    <span>⛪</span>
                    <span>Jumalanpalvelus ja sana – {parishName}</span>
                  </h3>
                  {(dayData.serviceInfo?.time || dayData.serviceInfo?.location) && (
                    <span className="text-xs font-bold bg-white text-amber-950 px-3 py-1 rounded-full border border-amber-300">
                      {[dayData.serviceInfo.location, dayData.serviceInfo.time].filter(Boolean).join(' • ')}
                    </span>
                  )}
                </div>

                {dayData.pastoralReflection && (
                  <p className="text-stone-800 font-serif italic text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                    {dayData.pastoralReflection}
                  </p>
                )}

                {(dayData.serviceInfo?.liturgist || dayData.serviceInfo?.preacher || dayData.serviceInfo?.cantor) && (
                  <div className="flex flex-wrap gap-4 pt-2 border-t border-amber-200/60 text-xs text-amber-950">
                    {dayData.serviceInfo.liturgist && (
                      <span><strong>Liturgi:</strong> {dayData.serviceInfo.liturgist}</span>
                    )}
                    {dayData.serviceInfo.preacher && (
                      <span><strong>Saarnaaja:</strong> {dayData.serviceInfo.preacher}</span>
                    )}
                    {dayData.serviceInfo.cantor && (
                      <span><strong>Kanttori:</strong> {dayData.serviceInfo.cantor}</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Collect / Prayer of the Day (Päivän rukous) */}
            {dayData.collect && (
              <section className={`${colorTheme.cardBg} border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-2`} data-testid="pyhapaiva-collect">
                <div className="flex items-center justify-between">
                  <h3 className="font-martti text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-2">
                    <span>🙏</span>
                    <span>Päivän rukous (Kollehtarukous)</span>
                  </h3>
                  {dayData.isCustomCollect && (
                    <span className="text-[11px] font-semibold text-amber-800">Seurakunnan rukous</span>
                  )}
                </div>
                <p className={`text-stone-900 font-serif italic ${textSizeClass} whitespace-pre-wrap`}>
                  {dayData.collect}
                </p>
              </section>
            )}

            {/* Psalm of the Day (Päivän psalmi) */}
            {dayData.psalm && (
              <section className="bg-stone-50 border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-3" data-testid="pyhapaiva-psalm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-martti text-sm font-bold uppercase tracking-wider text-stone-800 flex items-center gap-2">
                    <span>🕊️</span>
                    <span>Päivän psalmi</span>
                  </h3>
                  <span className="font-martti font-bold text-sm text-stone-900">
                    {dayData.psalm.reference}
                  </span>
                </div>

                {dayData.psalm.antiphon && (
                  <div className="bg-white border-l-4 border-amber-500 p-3 rounded-r-xl text-xs sm:text-sm text-stone-800 italic">
                    <strong>Antifoni:</strong> &rdquo;{dayData.psalm.antiphon}&rdquo;
                  </div>
                )}

                <div className={`text-stone-900 font-serif ${textSizeClass} whitespace-pre-wrap pl-1`}>
                  {dayData.psalm.text}
                </div>

                {dayData.psalm.gloriaPatri && (
                  <p className="text-xs text-stone-600 italic pt-2 border-t border-stone-200">
                    {dayData.psalm.gloriaPatri}
                  </p>
                )}
              </section>
            )}

            {/* Lectionary Readings: 1st Reading, 2nd Reading, Gospel */}
            <div className={`grid gap-6 ${pewSheetMode ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
              {/* 1st Reading (VT) */}
              {dayData.readings?.firstReading && (
                <section
                  className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-3"
                  data-testid="pyhapaiva-first-reading"
                >
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
                      📖 {dayData.readings.firstReading.label || '1. lukukappale'}
                    </span>
                    <span className="font-martti font-bold text-sm sm:text-base text-stone-900">
                      {dayData.readings.firstReading.reference}
                    </span>
                  </div>
                  <p className={`text-stone-900 font-serif ${textSizeClass} whitespace-pre-wrap`}>
                    {dayData.readings.firstReading.text}
                  </p>
                </section>
              )}

              {/* 2nd Reading (Epistola) */}
              {dayData.readings?.secondReading && (
                <section
                  className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-3"
                  data-testid="pyhapaiva-second-reading"
                >
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
                      📜 {dayData.readings.secondReading.label || '2. lukukappale'}
                    </span>
                    <span className="font-martti font-bold text-sm sm:text-base text-stone-900">
                      {dayData.readings.secondReading.reference}
                    </span>
                  </div>
                  <p className={`text-stone-900 font-serif ${textSizeClass} whitespace-pre-wrap`}>
                    {dayData.readings.secondReading.text}
                  </p>
                </section>
              )}
            </div>

            {/* Gospel Reading (Evankeliumi) */}
            {dayData.readings?.gospel && (
              <section
                className={`bg-gradient-to-br from-amber-50/80 via-white to-orange-50/40 border-2 ${colorTheme.accentBorder} rounded-2xl p-6 sm:p-8 shadow-xs space-y-4`}
                data-testid="pyhapaiva-gospel"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">✝️</span>
                    <h3 className="font-martti text-base sm:text-lg font-bold uppercase tracking-wider text-stone-900">
                      {dayData.readings.gospel.label || 'Pyhä evankeliumi'}
                    </h3>
                  </div>
                  <span className="font-martti font-bold text-base sm:text-lg text-stone-950 bg-amber-100/80 px-3 py-0.5 rounded-full border border-amber-300">
                    {dayData.readings.gospel.reference}
                  </span>
                </div>

                {dayData.readings.gospel.acclamation && (
                  <p className="text-xs sm:text-sm font-semibold text-amber-900 italic">
                    {dayData.readings.gospel.acclamation}
                  </p>
                )}

                <blockquote className={`text-stone-950 font-serif ${textSizeClass} whitespace-pre-wrap`}>
                  {dayData.readings.gospel.text}
                </blockquote>
              </section>
            )}

            {/* Hymns of the Day (Päivän virret) */}
            {Array.isArray(dayData.hymns) && dayData.hymns.length > 0 && (
              <section
                className="bg-stone-50 border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-3"
                data-testid="pyhapaiva-hymns"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-martti text-sm font-bold uppercase tracking-wider text-stone-800 flex items-center gap-2">
                    <span>🎵</span>
                    <span>{dayData.isCustomHymns ? 'Jumalanpalveluksen virret' : 'Pyhäpäivän virsisuositukset'}</span>
                  </h3>
                  <span className="text-xs text-stone-500">Virsikirja</span>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {dayData.hymns.map((h, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs sm:text-sm"
                    >
                      <span className="text-stone-600 font-medium">{h.role || 'Virsi'}</span>
                      <span className="font-bold text-stone-900">
                        VK {h.number} {h.title ? `– ${h.title}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </article>
      ) : null}
    </div>
  );
}
