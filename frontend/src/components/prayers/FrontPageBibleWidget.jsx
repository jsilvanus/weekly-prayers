import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';

function FrontPageBibleWidget() {
  const { t } = useTranslation();
  const [bibleData, setBibleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeMode, setActiveMode] = useState('verse'); // 'verse' | 'hours'
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const data = await api.getBibleToday();
        if (mounted) {
          setBibleData(data);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="mb-6 p-4 rounded-xl bg-amber-50/60 border border-amber-200/70 animate-pulse text-sm text-amber-800">
        Ladataan Raamatun tekstejä ja hetkirukousta...
      </div>
    );
  }

  if (!bibleData) {
    return null;
  }

  const { dailyVerse, nearestHour, liturgicalInfo } = bibleData;

  return (
    <section className="mb-8" data-testid="frontpage-bible-widget">
      <div className="bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-stone-50/90 border border-amber-200/80 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Header bar */}
        <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/60 bg-amber-100/40">
          <div className="flex items-center gap-2.5">
            <span className="text-xl text-amber-700">📖</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-martti text-lg font-bold text-amber-950 tracking-wide">
                  {liturgicalInfo?.dayName || 'Kirkkovuosi'}
                </h2>
                {liturgicalInfo?.theme && (
                  <span className="hidden sm:inline-block text-xs text-amber-800 italic">
                    &bull; {liturgicalInfo.theme}
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-800 font-medium">
                {liturgicalInfo?.season || 'Evankelis-luterilainen kirkkovuosi'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher Tabs */}
            <div className="inline-flex bg-amber-200/60 p-1 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => { setActiveMode('verse'); setIsExpanded(true); }}
                className={`px-3 py-1 rounded-md transition-all ${
                  activeMode === 'verse'
                    ? 'bg-white text-amber-950 shadow-xs'
                    : 'text-amber-800 hover:text-amber-950'
                }`}
              >
                📜 Päivän jae
              </button>
              <button
                type="button"
                onClick={() => { setActiveMode('hours'); setIsExpanded(true); }}
                className={`px-3 py-1 rounded-md transition-all ${
                  activeMode === 'hours'
                    ? 'bg-white text-amber-950 shadow-xs'
                    : 'text-amber-800 hover:text-amber-950'
                }`}
              >
                🕊️ Hetkirukous
              </button>
            </div>

            {/* Collapse toggle */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-amber-700 hover:text-amber-950 rounded-lg hover:bg-amber-200/50 transition-colors"
              title={isExpanded ? 'Pienennä' : 'Laajenna'}
            >
              <svg
                className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content Area */}
        {isExpanded && (
          <div className="p-5 sm:p-6 transition-all">
            {activeMode === 'verse' && dailyVerse && (
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs uppercase tracking-wider font-bold text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-300/50">
                    {dailyVerse.isManual ? '⭐ Seurakunnan valitsema' : '🕊️ Päivän sana'}
                  </span>
                  <span className="font-martti text-sm font-bold text-amber-900">
                    {dailyVerse.reference}
                  </span>
                </div>

                <blockquote className="text-gray-900 font-serif text-base sm:text-lg italic leading-relaxed pl-3 sm:pl-4 border-l-3 border-amber-500 mb-4 whitespace-pre-wrap">
                  &rdquo;{dailyVerse.text}&rdquo;
                </blockquote>

                {dailyVerse.meditation && (
                  <div className="bg-white/80 border border-amber-200/60 rounded-xl p-3.5 sm:p-4 text-sm text-amber-950 leading-relaxed shadow-xs mb-3">
                    <p className="font-semibold text-xs text-amber-800 uppercase tracking-wider mb-1">
                      Mietiskely
                    </p>
                    <p>{dailyVerse.meditation}</p>
                  </div>
                )}
              </div>
            )}

            {activeMode === 'hours' && nearestHour && (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Lähin hetkirukous: {nearestHour.name}
                    </span>
                    <span className="text-xs text-stone-600 font-medium">
                      ({nearestHour.timeSlot})
                    </span>
                  </div>
                  <span className="text-xs text-amber-800 italic">
                    Viikkolektionaari
                  </span>
                </div>

                {nearestHour.antiphon && (
                  <div className="mb-3 p-3 bg-amber-100/50 rounded-xl border border-amber-200/60 text-xs text-amber-900 font-medium italic">
                    <strong>Antifoni:</strong> {nearestHour.antiphon}
                  </div>
                )}

                {/* Hour Psalms */}
                {nearestHour.psalms && nearestHour.psalms.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                        Hetken psalmi
                      </span>
                      <span className="text-xs font-semibold text-stone-700">
                        {nearestHour.psalms[0].reference}
                      </span>
                    </div>
                    <div className="bg-white/90 p-4 rounded-xl border border-stone-200 text-sm font-serif leading-relaxed whitespace-pre-wrap text-stone-900">
                      {nearestHour.psalms[0].text}
                    </div>
                  </div>
                )}

                {/* Hour Reading */}
                {nearestHour.readings && nearestHour.readings.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                        Lukukappale
                      </span>
                      <span className="text-xs font-semibold text-stone-700">
                        {nearestHour.readings[0].reference}
                      </span>
                    </div>
                    <div className="bg-white/80 p-3.5 rounded-xl border border-amber-200/60 text-sm leading-relaxed text-stone-800 italic">
                      &rdquo;{nearestHour.readings[0].text}&rdquo;
                    </div>
                  </div>
                )}

                {/* Hour Collect Prayer */}
                {nearestHour.prayer && (
                  <div className="bg-amber-100/30 p-3.5 rounded-xl border border-amber-200/60 text-xs sm:text-sm text-amber-950 leading-relaxed mb-3">
                    <strong>Rukous:</strong> {nearestHour.prayer}
                  </div>
                )}
              </div>
            )}

            {/* Link to Full Bible Page */}
            <div className="pt-3 border-t border-amber-200/60 flex flex-wrap items-center justify-between gap-3 text-xs font-medium">
              <span className="text-amber-800">
                Lähde: {dailyVerse?.source === 'manual' ? 'Seurakunnan valitsema' : 'Evankeliumikirja & Anno API'}
              </span>
              <Link
                to="/bible"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-700 text-white font-semibold hover:bg-amber-800 transition-colors shadow-xs"
              >
                <span>Siirry Raamattusivulle</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default FrontPageBibleWidget;
