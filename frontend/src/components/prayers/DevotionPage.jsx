import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { useTenant } from '../../context/TenantContext';
import LandingHero from '../common/LandingHero';
import LoadingSpinner from '../common/LoadingSpinner';

export default function DevotionPage() {
  const { t } = useTranslation();
  const { currentTenant } = useTenant();
  const [devotion, setDevotion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const devotionCardRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    async function fetchDevotion() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getTodayDevotion(null, currentTenant?.slug);
        if (mounted) {
          setDevotion(data.devotion);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Hartauden lataus epäonnistui');
          setLoading(false);
        }
      }
    }
    fetchDevotion();
    return () => { mounted = false; };
  }, [currentTenant?.slug]);

  const scrollToDevotion = () => {
    if (devotionCardRef.current) {
      devotionCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const getAuthorDisplay = () => {
    if (!devotion?.author) return null;
    const { name, title } = devotion.author;
    if (title && name) {
      return `${title} ${name}`;
    }
    return name || 'Seurakunta';
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8" data-testid="devotion-page">
      {/* Unified Landing Hero */}
      <LandingHero
        currentModule="hartaus"
        title="Päivän hartaus"
        subtitle="Valmiiksi valmisteltu rukous- ja hiljentymishetki tälle päivälle"
        primaryAction={{
          label: 'Hiljenny päivän hartauteen',
          icon: '🕯️',
          onClick: scrollToDevotion,
          className: 'bg-gradient-to-r from-teal-700 to-emerald-800 hover:from-teal-800 hover:to-emerald-900 text-white',
        }}
      />

      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl text-center">
          <p className="font-medium">{error}</p>
        </div>
      ) : devotion ? (
        <article
          ref={devotionCardRef}
          className="bg-white rounded-3xl shadow-sm border border-stone-200 p-6 sm:p-10 space-y-8 animate-fade-in relative overflow-hidden"
          data-testid="devotion-article"
        >
          {/* Top Decorative Border */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-teal-700 via-emerald-600 to-teal-800" />

          {/* Devotion Header */}
          <div className="border-b border-stone-200 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <span className="text-xs uppercase tracking-wider font-bold text-teal-800 bg-teal-100/80 px-3 py-1 rounded-full border border-teal-300/60">
                {devotion.liturgical_day || 'Päivän hartaus'}
              </span>
              <time className="text-xs text-stone-500 font-medium" dateTime={devotion.target_date}>
                {devotion.target_date}
              </time>
            </div>

            <h2 className="font-martti text-2xl sm:text-4xl font-bold text-stone-900 leading-tight">
              {devotion.title}
            </h2>

            {/* Writer Attribution (Respectfully visible, strictly designated author) */}
            <div className="mt-4 flex items-center gap-3 pt-3 border-t border-stone-100">
              <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-800 font-bold text-sm shrink-0">
                ✍️
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-teal-900">
                  Kirjoittaja
                </p>
                <p className="text-sm font-medium text-stone-800">
                  {getAuthorDisplay()}
                </p>
              </div>
            </div>
          </div>

          {/* Optional Audio Link / Player */}
          {devotion.audio_url && (
            <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl">🎧</span>
              <div className="flex-1">
                <p className="text-xs font-bold text-teal-950 uppercase tracking-wide">Kuuntele hartaus</p>
                <audio controls className="w-full mt-1.5 h-8">
                  <source src={devotion.audio_url} />
                  Selaimesi ei tue äänentoistoa.
                </audio>
              </div>
            </div>
          )}

          {/* FORMAT A: Single Clear Text Block */}
          {devotion.format === 'single_block' && devotion.content && (
            <div className="prose prose-stone max-w-none text-stone-900 font-serif text-base sm:text-lg leading-relaxed whitespace-pre-wrap">
              {devotion.content}
            </div>
          )}

          {/* FORMAT B: Structured Devotion */}
          {devotion.format === 'structured' && (
            <div className="space-y-7">
              {/* Scripture Reading */}
              {devotion.scripture_text && (
                <div className="bg-stone-50 border-l-4 border-teal-600 p-5 rounded-r-2xl">
                  {devotion.scripture_reference && (
                    <p className="text-xs font-bold uppercase tracking-wider text-teal-900 mb-2">
                      {devotion.scripture_reference}
                    </p>
                  )}
                  <blockquote className="text-stone-900 font-serif text-base sm:text-lg italic leading-relaxed whitespace-pre-wrap">
                    &rdquo;{devotion.scripture_text}&rdquo;
                  </blockquote>
                </div>
              )}

              {/* Priest's Meditation */}
              {devotion.meditation_content && (
                <div className="text-stone-900 font-serif text-base sm:text-lg leading-relaxed whitespace-pre-wrap">
                  {devotion.meditation_content}
                </div>
              )}

              {/* Closing Prayer */}
              {devotion.closing_prayer && (
                <div className="bg-teal-50/60 border border-teal-200 p-5 rounded-2xl space-y-2">
                  <h3 className="font-martti text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🙏</span>
                    <span>Rukous</span>
                  </h3>
                  <p className="text-stone-900 font-serif text-sm sm:text-base leading-relaxed italic whitespace-pre-wrap">
                    {devotion.closing_prayer}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Hymn Suggestion (if present) */}
          {devotion.hymn_suggestion && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs sm:text-sm text-stone-700">
              <span className="text-lg">🎵</span>
              <div>
                <span className="font-bold text-stone-900">Virsi tai musiikki: </span>
                <span>{devotion.hymn_suggestion}</span>
              </div>
            </div>
          )}

          {/* Traditional Concluding Blessing */}
          <div className="pt-6 border-t border-stone-200 text-center space-y-2">
            <span className="text-xs uppercase tracking-wider font-bold text-teal-900">Herran siunaus</span>
            <p className="text-stone-800 font-serif text-sm sm:text-base leading-relaxed italic max-w-xl mx-auto">
              Herra siunatkoon meitä ja varjelkoon meitä. Herra kirkastakoon kasvonsa meille ja olkoon meille armollinen. Herra kääntäköön kasvonsa meidän puoleemme ja antakoon meille rauhan. Isän ja Pojan ja Pyhän Hengen nimeen. Aamen.
            </p>
          </div>
        </article>
      ) : null}
    </div>
  );
}
