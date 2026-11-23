import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useTenant } from '../../context/TenantContext';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import LandingHero from '../common/LandingHero';
import LoadingSpinner from '../common/LoadingSpinner';
import BlockRenderer, { getYouTubeEmbedId } from '../common/blocks/BlockRenderer';
import { ensureDevotionBlocks } from '../common/blocks/legacyDevotionAdapter';

export { getYouTubeEmbedId };

export default function DevotionPage() {
  const { t } = useTranslation();
  const { currentTenant, isModuleEnabled } = useTenant();
  const { getModuleTitle } = useSettings();
  const { user, isWorkerOrAbove } = useAuth();
  const canSeeDisabled = isWorkerOrAbove || user?.role === 'admin' || user?.role === 'devotion';
  const isEnabled = isModuleEnabled('hartaus');

  const [devotion, setDevotion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPrintView, setIsPrintView] = useState(false);
  const [printLayout, setPrintLayout] = useState('indented'); // 'standard' | 'indented' | 'compact'
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
    return () => {
      mounted = false;
    };
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

  const youtubeId = devotion?.youtube_url ? getYouTubeEmbedId(devotion.youtube_url) : null;
  const moduleTitle = getModuleTitle ? getModuleTitle('hartaus', 'Päivän hartaus') : 'Päivän hartaus';

  if (!isEnabled && !canSeeDisabled) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="text-4xl">🕯️</div>
        <h2 className="font-martti text-2xl font-bold text-stone-900">
          {moduleTitle} ei ole käytössä
        </h2>
        <p className="text-sm text-stone-600">
          Tämä osio ei ole tällä hetkellä aktivoitu seurakunnan sivustolla.
        </p>
        <Link to="/" className="inline-flex items-center gap-2 btn-primary text-xs py-2 px-4 rounded-full">
          &larr; Siirry etusivulle
        </Link>
      </div>
    );
  }

  const hasCustomBlocks = Array.isArray(devotion?.blocks) && devotion.blocks.length > 0;
  const resolvedBlocks = ensureDevotionBlocks(devotion).filter(
    // Avoid duplicating top-level YouTube video if youtubeId is already rendered above
    (b) => !(youtubeId && b.id === 'devotion-youtube')
  );

  return (
    <div className="max-w-3xl mx-auto space-y-8" data-testid="devotion-page">
      {!isEnabled && canSeeDisabled && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 px-4 py-2.5 rounded-2xl text-xs sm:text-sm flex items-center gap-2 font-medium print:hidden">
          <span>⚠️</span>
          <span>
            Hartaus on poissa käytöstä julkisilta kävijöiltä. Ylläpitäjänä ja työntekijänä näet
            sivun normaalisti.
          </span>
        </div>
      )}

      {/* Unified Landing Hero */}
      <div className="print:hidden">
        <LandingHero
          currentModule="hartaus"
          title={moduleTitle}
          subtitle="Valmiiksi valmisteltu rukous- ja hiljentymishetki tälle päivälle"
          primaryAction={{
            label: 'Hiljenny päivän hartauteen',
            icon: '🕯️',
            onClick: scrollToDevotion,
            className:
              'bg-gradient-to-r from-teal-700 to-emerald-800 hover:from-teal-800 hover:to-emerald-900 text-white',
          }}
        />
      </div>

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
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-teal-700 via-emerald-600 to-teal-800 print:hidden" />

          {/* Devotion Header */}
          <div className="border-b border-stone-200 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <span className="text-xs uppercase tracking-wider font-bold text-teal-800 bg-teal-100/80 px-3 py-1 rounded-full border border-teal-300/60">
                {devotion.liturgical_day || 'Päivän hartaus'}
              </span>
              <div className="flex items-center gap-2">
                <time className="text-xs text-stone-500 font-medium" dateTime={devotion.target_date}>
                  {devotion.target_date}
                </time>
                <button
                  type="button"
                  onClick={() => setIsPrintView((prev) => !prev)}
                  className={`print:hidden px-3 py-1 rounded-full text-xs font-semibold border transition-colors flex items-center gap-1 ${
                    isPrintView
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-300'
                  }`}
                >
                  <span>🖨️</span>
                  <span>{isPrintView ? 'Normaalinäkymä' : 'Tulosta käsiohjelma'}</span>
                </button>
              </div>
            </div>

            <h2 className="font-martti text-2xl sm:text-4xl font-bold text-stone-900 leading-tight">
              {devotion.title}
            </h2>

            {/* Writer Attribution */}
            <div className="mt-4 flex items-center gap-3 pt-3 border-t border-stone-100">
              <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-800 font-bold text-sm shrink-0">
                ✍️
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-teal-900">
                  Kirjoittaja
                </p>
                <p className="text-sm font-medium text-stone-800">{getAuthorDisplay()}</p>
              </div>
            </div>

            {isPrintView && (
              <div className="mt-4 pt-3 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2 print:hidden">
                <div className="flex items-center gap-2 text-xs text-stone-700">
                  <span className="font-semibold">Käsiohjelman taitto:</span>
                  <select
                    value={printLayout}
                    onChange={(e) => setPrintLayout(e.target.value)}
                    className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs"
                  >
                    <option value="indented">⇥ Sisennetty laulu- ja psalmitaitto</option>
                    <option value="standard">☰ Tavallinen 1-palstainen</option>
                    <option value="compact">📖 Kompakti 2-palstainen lehtinen</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold"
                >
                  🖨️ Avaa tulostusikkuna
                </button>
              </div>
            )}
          </div>

          {/* Optional YouTube Video Embed */}
          {youtubeId && !isPrintView && (
            <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-sm border border-stone-200 bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
                title={devotion.title || 'Hartausvideo'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>
          )}

          {/* Optional Audio Link / Player */}
          {devotion.audio_url && !isPrintView && (
            <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl">🎧</span>
              <div className="flex-1">
                <p className="text-xs font-bold text-teal-950 uppercase tracking-wide">
                  Kuuntele hartaus
                </p>
                <audio controls className="w-full mt-1.5 h-8">
                  <source src={devotion.audio_url} />
                  Selaimesi ei tue äänentoistoa.
                </audio>
              </div>
            </div>
          )}

          {/* Unified Building Blocks Renderer for both Legacy and Modular Block Devotions */}
          {(hasCustomBlocks || resolvedBlocks.length > 0) && (
            <BlockRenderer
              blocks={resolvedBlocks}
              printLayout={printLayout}
              isPrint={isPrintView}
            />
          )}

          {/* Traditional Concluding Blessing (shown if blocks don't already end with a blessing block) */}
          {!resolvedBlocks.some((b) => b.type === 'blessing' || b.type === 'liturgical_blessing') && (
            <div className="pt-6 border-t border-stone-200 text-center space-y-2">
              <span className="text-xs uppercase tracking-wider font-bold text-teal-900">
                Herran siunaus
              </span>
              <p className="text-stone-800 font-serif text-sm sm:text-base leading-relaxed italic max-w-xl mx-auto">
                Herra siunatkoon meitä ja varjelkoon meitä. Herra kirkastakoon kasvonsa meille ja
                olkoon meille armollinen. Herra kääntäköön kasvonsa meidän puoleemme ja antakoon
                meille rauhan. Isän ja Pojan ja Pyhän Hengen nimeen. Aamen.
              </p>
            </div>
          )}
        </article>
      ) : null}
    </div>
  );
}
