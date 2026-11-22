import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import LandingHero from '../common/LandingHero';
import EmbeddedIntercessionsModal from './EmbeddedIntercessionsModal';
import LoadingSpinner from '../common/LoadingSpinner';

const liturgicalColorsMap = {
  vihreä: { bg: 'bg-emerald-100', text: 'text-emerald-900', border: 'border-emerald-300', dot: 'bg-emerald-600', name: 'Vihreä' },
  valkoinen: { bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200', dot: 'bg-amber-400', name: 'Valkoinen' },
  violetti: { bg: 'bg-purple-100', text: 'text-purple-900', border: 'border-purple-300', dot: 'bg-purple-600', name: 'Violetti' },
  punainen: { bg: 'bg-red-100', text: 'text-red-900', border: 'border-red-300', dot: 'bg-red-600', name: 'Punainen' },
  musta: { bg: 'bg-stone-200', text: 'text-stone-900', border: 'border-stone-400', dot: 'bg-stone-800', name: 'Musta' },
  sininen: { bg: 'bg-blue-100', text: 'text-blue-900', border: 'border-blue-300', dot: 'bg-blue-600', name: 'Sininen' }
};

export default function PrayerMomentPage() {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const [bibleData, setBibleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedHour, setSelectedHour] = useState('morning');
  const [isIntercessionsModalOpen, setIsIntercessionsModalOpen] = useState(false);
  const prayerTextRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const data = await api.getBibleToday(selectedDate);
        if (mounted) {
          setBibleData(data);
          if (data.nearestHourKey) {
            setSelectedHour(data.nearestHourKey);
          }
          setLoading(false);
        }
      } catch (err) {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, [selectedDate]);

  const handlePrayNow = () => {
    const nearest = bibleData?.nearestHourKey || 'morning';
    setSelectedHour(nearest);
    if (prayerTextRef.current) {
      prayerTextRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const hoursList = [
    { key: 'morning', icon: '🌅', label: 'Aamurukous', latin: 'Laudes', slot: '06:00 – 10:00' },
    { key: 'noon', icon: '☀️', label: 'Päivärukous', latin: 'Seksti', slot: '11:00 – 16:00' },
    { key: 'evening', icon: '🌇', label: 'Iltarukous', latin: 'Vesper', slot: '17:00 – 20:00' },
    { key: 'night', icon: '🌙', label: 'Yörukous', latin: 'Kompletorio', slot: '21:00 – 05:00' },
    { key: 'small', icon: '🕊️', label: 'Pieni rukoushetki', latin: 'Kirkkokäsikirja III', slot: 'Milloin vain' },
  ];

  const currentHourData = bibleData?.liturgyOfTheHours?.[selectedHour];
  const currentColorKey = bibleData?.liturgicalInfo?.color?.color || 'vihreä';
  const colorTheme = liturgicalColorsMap[currentColorKey] || liturgicalColorsMap.vihreä;

  return (
    <div className="max-w-4xl mx-auto space-y-8" data-testid="prayer-moment-page">
      {/* Unified Landing Hero */}
      <LandingHero
        currentModule="hours"
        title="Hetkirukous"
        subtitle="Suomen evankelis-luterilaisen kirkon viralliset rukoushetket (Kirkkokäsikirja)"
        primaryAction={{
          label: 'Rukoile nyt',
          icon: '🕊️',
          onClick: handlePrayNow,
          className: 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white',
        }}
      />

      {loading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          {/* Liturgical Day & Date Header */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4">
              <div>
                <h2 className="font-martti text-xl sm:text-2xl font-bold text-stone-900">
                  {bibleData?.liturgicalInfo?.dayName || 'Hetkirukoukset'}
                </h2>
                {bibleData?.liturgicalInfo?.theme && (
                  <p className="text-sm text-stone-700 font-serif italic">
                    Aihe: &rdquo;{bibleData.liturgicalInfo.theme}&rdquo;
                  </p>
                )}
                <p className="text-xs text-stone-500 font-medium mt-0.5">
                  {bibleData?.liturgicalInfo?.season || 'Kirkkovuosi'} &bull; Päivä: {selectedDate}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${colorTheme.bg} ${colorTheme.border} ${colorTheme.text}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${colorTheme.dot}`} />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {colorTheme.name}
                  </span>
                </div>

                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg border border-stone-300 bg-white text-stone-900 focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Hour Selector Buttons */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-2" role="tablist">
              {hoursList.map((h) => {
                const isSelected = selectedHour === h.key;
                const isNearest = bibleData?.nearestHourKey === h.key;
                return (
                  <button
                    key={h.key}
                    type="button"
                    onClick={() => setSelectedHour(h.key)}
                    className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/80 shadow-xs ring-2 ring-emerald-600/20'
                        : 'border-stone-200 bg-white hover:bg-stone-50'
                    }`}
                  >
                    {isNearest && (
                      <span className="absolute -top-2 right-2 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                        Ajankohtainen
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-lg">{h.icon}</span>
                      <span className={`font-martti text-xs sm:text-sm font-bold ${isSelected ? 'text-emerald-950' : 'text-stone-900'}`}>
                        {h.label}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-500 flex flex-col">
                      <span className="italic">{h.latin}</span>
                      <span className="font-medium text-stone-600">{h.slot}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Liturgy Text Container */}
          <div
            ref={prayerTextRef}
            className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sm:p-9 space-y-7"
            data-testid="liturgy-text-container"
          >
            {/* Liturgy Header */}
            <div className="border-b border-stone-200 pb-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-wider font-bold text-emerald-800 bg-emerald-100/90 px-3 py-1 rounded-full border border-emerald-300">
                  {currentHourData?.timeSlot} &bull; {currentHourData?.latinTitle}
                </span>
                <span className="text-xs text-stone-500 italic">
                  Kirkkokäsikirjan virallinen kaava
                </span>
              </div>
              <h3 className="font-martti text-2xl sm:text-3xl font-bold text-stone-900 mt-2">
                {currentHourData?.name}
              </h3>
            </div>

            {/* 1. Johdanto & Alkusanat */}
            {currentHourData?.opening && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                  <span>✨</span>
                  <span>1. Johdanto ja alkusanat</span>
                </h4>
                <div className="bg-stone-50/90 border-l-3 border-emerald-600 p-4 rounded-r-xl text-stone-900 font-serif text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                  {currentHourData.opening}
                </div>
              </div>
            )}

            {/* Lucernarium (Vesper) */}
            {currentHourData?.lucernarium && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-2">
                  <span>🕯️</span>
                  <span>Valon rukous (Lucernarium)</span>
                </h4>
                <div className="bg-amber-50/70 border border-amber-200/80 p-4 rounded-xl text-amber-950 font-serif text-sm sm:text-base leading-relaxed italic">
                  {currentHourData.lucernarium}
                </div>
              </div>
            )}

            {/* Synnintunnustus (Kompletorio) */}
            {currentHourData?.confession && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-2">
                  <span>🙏</span>
                  <span>{currentHourData.confession.title}</span>
                </h4>
                <div className="bg-purple-50/60 border border-purple-200/80 p-4 rounded-xl space-y-2 text-stone-900 text-sm leading-relaxed">
                  <p className="font-serif italic whitespace-pre-wrap">{currentHourData.confession.text}</p>
                  <p className="font-semibold text-purple-950 pt-2 border-t border-purple-200/60">
                    {currentHourData.confession.absolution}
                  </p>
                </div>
              </div>
            )}

            {/* Virsisuositus */}
            {currentHourData?.hymnSuggestion && (
              <div className="flex items-center gap-2 text-xs text-stone-600 bg-stone-100/80 px-3.5 py-2 rounded-lg">
                <span className="font-bold text-stone-800">🎵 Virsi tai laulu:</span>
                <span>{currentHourData.hymnSuggestion}</span>
              </div>
            )}

            {/* 2. Antifoni ja Psalmi */}
            {currentHourData?.psalms && currentHourData.psalms.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                  <span>📖</span>
                  <span>2. Hetken psalmi ja antifoni</span>
                </h4>

                {currentHourData.antiphon && (
                  <div className="bg-emerald-50/60 border border-emerald-200 p-3.5 rounded-xl text-xs sm:text-sm text-emerald-950 italic">
                    <strong>Antifoni:</strong> &rdquo;{currentHourData.antiphon}&rdquo;
                  </div>
                )}

                {currentHourData.psalms.map((p, idx) => (
                  <div key={idx} className="bg-stone-50 border border-stone-200 rounded-xl p-4 sm:p-5 space-y-3">
                    <span className="font-martti font-bold text-sm text-stone-900">{p.reference}</span>
                    <p className="text-stone-900 font-serif text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                      {p.text}
                    </p>
                    {currentHourData.gloriaPatri && (
                      <p className="text-xs text-stone-600 italic pt-2 border-t border-stone-200">
                        {currentHourData.gloriaPatri}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 3. Raamatunluku */}
            {currentHourData?.readings && currentHourData.readings.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                  <span>📜</span>
                  <span>3. Raamatunluku</span>
                </h4>
                {currentHourData.readings.map((r, idx) => (
                  <div key={idx} className="bg-white border-l-4 border-emerald-500 p-4 sm:p-5 rounded-r-xl shadow-2xs">
                    <span className="font-martti font-bold text-sm text-stone-900 block mb-1">{r.reference}</span>
                    <blockquote className="text-stone-800 font-serif text-sm sm:text-base leading-relaxed italic">
                      &rdquo;{r.text}&rdquo;
                    </blockquote>
                  </div>
                ))}
              </div>
            )}

            {/* 4. Responsorio */}
            {currentHourData?.responsory && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                  <span>💬</span>
                  <span>4. Responsorio</span>
                </h4>
                <div className="bg-stone-50 border border-stone-200 p-4 rounded-xl text-stone-800 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap italic">
                  {currentHourData.responsory}
                </div>
              </div>
            )}

            {/* 5. Kiitosvirsi (Canticle: Benedictus / Magnificat / Nunc Dimittis) */}
            {currentHourData?.canticle && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                  <span>🌟</span>
                  <span>5. {currentHourData.canticle.name}</span>
                </h4>
                <div className="bg-gradient-to-r from-emerald-50/70 to-teal-50/50 border border-emerald-200 p-5 rounded-xl space-y-2">
                  <span className="font-martti font-bold text-xs text-emerald-900 uppercase tracking-wider">
                    {currentHourData.canticle.reference}
                  </span>
                  <p className="text-stone-900 font-serif text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                    {currentHourData.canticle.text}
                  </p>
                </div>
              </div>
            )}

            {/* 6. Yhteinen esirukous ja upotettu seurakunnan esirukousdialogi */}
            {currentHourData?.intercessions && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                    <span>🕊️</span>
                    <span>6. {currentHourData.intercessions.title}</span>
                  </h4>

                  {/* EMBEDDED PRAYER INTENTIONS MODAL BUTTON */}
                  <button
                    type="button"
                    onClick={() => setIsIntercessionsModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-100 hover:bg-primary-200 text-primary-900 border border-primary-300 text-xs font-bold transition-all shadow-2xs transform hover:-translate-y-0.5"
                    data-testid="open-intercessions-modal-btn"
                  >
                    <span>📋</span>
                    <span>Rukoile seurakunnan esirukousaiheiden puolesta &rarr;</span>
                  </button>
                </div>

                <div className="bg-stone-50 border border-stone-200 p-4 sm:p-5 rounded-xl space-y-2.5 text-stone-800 text-xs sm:text-sm">
                  {currentHourData.intercessions.intro && (
                    <p className="font-medium text-stone-900 italic">
                      {currentHourData.intercessions.intro}
                    </p>
                  )}
                  <ul className="space-y-2 pl-4 list-disc marker:text-emerald-600">
                    {currentHourData.intercessions.prayers.map((prayer, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {prayer}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* 7. Hetkirukous (Collect) */}
            {currentHourData?.prayer && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                  <span>🙏</span>
                  <span>Päivän hetkirukous</span>
                </h4>
                <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl text-emerald-950 font-serif text-sm sm:text-base leading-relaxed">
                  {currentHourData.prayer}
                </div>
              </div>
            )}

            {/* 8. Isä meidän */}
            {currentHourData?.lordsPrayer && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                  <span>✝️</span>
                  <span>Isä meidän -rukous</span>
                </h4>
                <div className="bg-stone-50 border border-stone-200 p-4 sm:p-5 rounded-xl text-stone-900 font-serif text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                  {currentHourData.lordsPrayer}
                </div>
              </div>
            )}

            {/* 9. Päätösylistys ja Herran siunaus */}
            {currentHourData?.blessing && (
              <div className="space-y-2 pt-2 border-t border-stone-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                  <span>✨</span>
                  <span>Päätösylistys ja Herran siunaus</span>
                </h4>
                <div className="bg-emerald-100/50 border border-emerald-300 p-4 rounded-xl text-emerald-950 font-serif text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-medium">
                  {currentHourData.blessing}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Embedded Intercessions Modal */}
      <EmbeddedIntercessionsModal
        isOpen={isIntercessionsModalOpen}
        onClose={() => setIsIntercessionsModalOpen(false)}
      />
    </div>
  );
}
