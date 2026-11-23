import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { useSettings } from '../../context/SettingsContext';

const LITURGICAL_SLIDE_THEMES = {
  vihreä: 'from-emerald-800 via-teal-800 to-emerald-950 border-emerald-600/40',
  valkoinen: 'from-amber-700 via-yellow-800 to-stone-900 border-amber-400/50',
  violetti: 'from-purple-800 via-indigo-900 to-purple-950 border-purple-500/40',
  punainen: 'from-rose-800 via-red-900 to-stone-950 border-rose-500/40',
  musta: 'from-stone-800 via-neutral-900 to-black border-stone-600/40',
  sininen: 'from-sky-800 via-blue-900 to-slate-950 border-sky-500/40',
};

const HOUR_META = {
  morning: { icon: '🌅', title: 'Aamurukous (Laudes)', slot: '06:00 – 10:00' },
  noon: { icon: '☀️', title: 'Päivärukous (Seksti)', slot: '11:00 – 16:00' },
  evening: { icon: '🌇', title: 'Iltarukous (Vesper)', slot: '17:00 – 20:00' },
  night: { icon: '🌙', title: 'Yörukous (Kompletorio)', slot: '21:00 – 05:00' },
  small: { icon: '🕊️', title: 'Pieni rukoushetki', slot: 'Milloin vain' },
};

export default function PortalCarousel({
  carouselConfig,
  devotion,
  bibleData,
  pyhapaivaData,
  prayerCount = 0,
  onIncrementPrayerCount,
  onOpenPrayerModal,
  onOpenDailyVerseModal,
  activePrayersCount = 0,
}) {
  const { isModuleEnabled } = useTenant();
  const { getModuleTitle } = useSettings();

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [justPrayed, setJustPrayed] = useState(false);
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  const nearestHourKey = bibleData?.nearestHourKey || 'morning';
  const currentHourMeta = HOUR_META[nearestHourKey] || HOUR_META.morning;
  const currentHourData = bibleData?.liturgyOfTheHours?.[nearestHourKey] || bibleData?.nearestHour || null;

  const holyDayInfo = pyhapaivaData?.holyDay || pyhapaivaData || bibleData?.liturgicalInfo || {};
  const liturgicalColorKey = (
    holyDayInfo?.liturgicalColor?.color ||
    holyDayInfo?.color?.color ||
    holyDayInfo?.color ||
    'vihreä'
  ).toLowerCase();
  const pyhapaivaGradient = LITURGICAL_SLIDE_THEMES[liturgicalColorKey] || LITURGICAL_SLIDE_THEMES.vihreä;

  const handlePrayedClick = async (e) => {
    e.stopPropagation();
    if (justPrayed || !onIncrementPrayerCount) return;
    setJustPrayed(true);
    await onIncrementPrayerCount();
    setTimeout(() => setJustPrayed(false), 2500);
  };

  // Build available slides according to config order, visibility, and active modules
  const slides = useMemo(() => {
    const configSlides = Array.isArray(carouselConfig?.slides)
      ? [...carouselConfig.slides].sort((a, b) => (a.order || 0) - (b.order || 0))
      : [
          { id: 'hartaus', visible: true, order: 1 },
          { id: 'hours', visible: true, order: 2 },
          { id: 'pyhapaiva', visible: true, order: 3 },
          { id: 'prayers', visible: true, order: 4 },
        ];

    const list = [];

    for (const s of configSlides) {
      if (!s.visible) continue;
      if (!isModuleEnabled(s.id)) continue;

      if (s.id === 'hartaus') {
        const authorName = devotion?.author
          ? [devotion.author.title, devotion.author.name].filter(Boolean).join(' ')
          : 'Seurakunta';
        const snippet =
          devotion?.meditation_content ||
          devotion?.content ||
          devotion?.scripture_text ||
          'Hiljenny tämän päivän valmiiksi kirjoitetun hartauden, Raamatun sanan ja rukouksen äärelle.';

        list.push({
          id: 'hartaus',
          badge: `🕯️ ${getModuleTitle('hartaus', 'Päivän hartaus')}`,
          subBadge: devotion?.liturgical_day || devotion?.target_date || 'Tänään',
          title: devotion?.title || 'Päivän hartaushetki',
          subtitle: `Kirjoittaja: ${authorName}`,
          description: snippet,
          gradient: 'from-teal-800 via-emerald-850 to-teal-950 border-teal-500/40',
          primaryCta: {
            label: 'Lue päivän hartaus',
            icon: '🕯️',
            to: '/hartaus',
          },
          secondaryCta: devotion?.youtube_url || devotion?.audio_url
            ? {
                label: 'Kuuntele / Katso',
                icon: '🎧',
                to: '/hartaus',
              }
            : null,
        });
      } else if (s.id === 'hours') {
        const antiphonPreview =
          currentHourData?.antiphon ||
          currentHourData?.opening ||
          'Suomen evankelis-luterilaisen kirkon viralliset rukoushetket (Kirkkokäsikirja III).';

        list.push({
          id: 'hours',
          badge: `🕊️ ${getModuleTitle('hours', 'Hetkirukous')} juuri nyt`,
          subBadge: `${currentHourMeta.icon} ${currentHourMeta.slot}`,
          title: currentHourData?.name || currentHourMeta.title,
          subtitle: 'Kirkkokäsikirja III • Hetkirukous',
          description: antiphonPreview,
          gradient: 'from-emerald-900 via-teal-900 to-slate-900 border-emerald-500/40',
          primaryCta: {
            label: 'Rukoile nyt',
            icon: '🕊️',
            to: `/prayer-moment?hour=${nearestHourKey}`,
          },
          secondaryCta: {
            label: 'Pieni rukoushetki',
            icon: '⏱️',
            to: '/prayer-moment?hour=small',
          },
        });
      } else if (s.id === 'pyhapaiva') {
        const heading =
          pyhapaivaData?.heading ||
          pyhapaivaData?.customHeading ||
          holyDayInfo?.custom_heading ||
          holyDayInfo?.dayName ||
          holyDayInfo?.name ||
          'Kirkkovuoden pyhäpäivä';
        const themeText =
          pyhapaivaData?.description ||
          pyhapaivaData?.customDescription ||
          holyDayInfo?.theme ||
          bibleData?.dailyVerse?.text ||
          'Tutustu pyhäpäivän evankeliumiin, lukukappaleisiin, päivän psalmiin ja rukoukseen.';
        const gospelRef =
          pyhapaivaData?.readings?.gospel?.reference
            ? `${pyhapaivaData?.name || holyDayInfo?.season || 'Evankeliumi'} • ${pyhapaivaData.readings.gospel.reference}`
            : bibleData?.dailyVerse?.reference ||
              holyDayInfo?.season ||
              'Evankeliumikirja';

        list.push({
          id: 'pyhapaiva',
          badge: `⛪ ${getModuleTitle('pyhapaiva', 'Pyhäpäivä')}`,
          subBadge: `Liturginen väri: ${liturgicalColorKey}`,
          title: heading,
          subtitle: gospelRef,
          description: themeText,
          gradient: pyhapaivaGradient,
          primaryCta: {
            label: 'Pyhäpäivän tekstit',
            icon: '⛪',
            to: '/pyhapaiva',
          },
          secondaryCta: onOpenDailyVerseModal
            ? {
                label: 'Päivän sana',
                icon: '📜',
                onClick: onOpenDailyVerseModal,
              }
            : {
                label: 'Raamattu & Sana',
                icon: '📖',
                to: '/bible',
              },
        });
      } else if (s.id === 'prayers') {
        list.push({
          id: 'prayers',
          badge: `🙏 ${getModuleTitle('prayers', 'Seurakunnan rukousyhteisö')}`,
          subBadge: activePrayersCount > 0 ? `${activePrayersCount} rukousaihetta` : 'Yhteinen esirukous',
          title: 'Kannamme toisiamme rukouksin',
          subtitle: `Tällä viikolla rukoiltu yhdessä ${prayerCount} kertaa`,
          description:
            'Jätä oma esirukouspyyntösi seurakunnan yhteiseen esirukoukseen tai liity mukaan rukoilemaan toisten puolesta.',
          gradient: 'from-primary-800 via-primary-900 to-slate-900 border-primary-500/40',
          isPrayerSlide: true,
          primaryCta: {
            label: 'Jätä rukouspyyntö',
            icon: '✍️',
            onClick: onOpenPrayerModal,
            to: onOpenPrayerModal ? undefined : '/prayers',
          },
          secondaryCta: {
            label: 'Kaikki esirukoukset',
            icon: '📋',
            to: '/prayers',
          },
        });
      }
    }

    return list;
  }, [
    carouselConfig?.slides,
    isModuleEnabled,
    getModuleTitle,
    devotion,
    currentHourData,
    currentHourMeta,
    nearestHourKey,
    pyhapaivaData,
    holyDayInfo,
    liturgicalColorKey,
    pyhapaivaGradient,
    bibleData,
    prayerCount,
    activePrayersCount,
    onOpenPrayerModal,
    onOpenDailyVerseModal,
  ]);

  // Keep activeIndex in bounds
  useEffect(() => {
    if (activeIndex >= slides.length && slides.length > 0) {
      setActiveIndex(0);
    }
  }, [slides.length, activeIndex]);

  // Auto-advance timer
  useEffect(() => {
    const autoMs = carouselConfig?.autoPlayMs ?? 7000;
    if (!carouselConfig?.enabled || slides.length <= 1 || isPaused || autoMs <= 0) {
      return undefined;
    }

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, autoMs);

    return () => clearInterval(timer);
  }, [carouselConfig?.enabled, carouselConfig?.autoPlayMs, slides.length, isPaused]);

  if (!carouselConfig?.enabled || slides.length === 0) {
    return null;
  }

  const currentSlide = slides[activeIndex] || slides[0];

  const handleTouchStart = (e) => {
    setIsPaused(true);
    touchStartX.current = e.targetTouches[0]?.clientX ?? null;
    touchEndX.current = null;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0]?.clientX ?? null;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current !== null && touchEndX.current !== null) {
      const deltaX = touchStartX.current - touchEndX.current;
      if (Math.abs(deltaX) > 40) {
        if (deltaX > 0) {
          setActiveIndex((prev) => (prev + 1) % slides.length);
        } else {
          setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
        }
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
    setTimeout(() => setIsPaused(false), 3000);
  };

  return (
    <section
      className="relative select-none"
      aria-roledescription="carousel"
      aria-label="Seurakunnan ajankohtaiset nostot"
      data-testid="portal-hero-carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Main Carousel Card */}
      <div
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${currentSlide.gradient} text-white border shadow-lg transition-all duration-500 p-6 sm:p-9 min-h-[270px] sm:min-h-[300px] flex flex-col justify-between`}
      >
        {/* Subtle decorative glow */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-black/20 blur-2xl" />

        {/* Top Bar: Badges & Slide Counter */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/15 backdrop-blur-md border border-white/25 text-white">
              {currentSlide.badge}
            </span>
            {currentSlide.subBadge && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-black/25 text-white/90 border border-white/15">
                {currentSlide.subBadge}
              </span>
            )}
          </div>

          <span className="text-xs font-mono text-white/75 bg-black/20 px-2.5 py-0.5 rounded-full">
            {activeIndex + 1} / {slides.length}
          </span>
        </div>

        {/* Center Content: Title, Subtitle & Snippet */}
        <div className="relative z-10 my-5 max-w-2xl space-y-2">
          <h2 className="font-martti text-2xl sm:text-4xl font-bold leading-tight tracking-tight text-white drop-shadow-2xs">
            {currentSlide.title}
          </h2>
          {currentSlide.subtitle && (
            <p className="text-xs sm:text-sm font-semibold text-amber-200/95 tracking-wide">
              {currentSlide.subtitle}
            </p>
          )}
          {currentSlide.description && (
            <p className="text-sm sm:text-base text-white/90 font-serif leading-relaxed line-clamp-2 sm:line-clamp-3">
              {currentSlide.description}
            </p>
          )}
        </div>

        {/* Bottom CTA Actions & Quick Prayer Counter */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-2.5">
            {currentSlide.primaryCta && (
              currentSlide.primaryCta.to ? (
                <Link
                  to={currentSlide.primaryCta.to}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-slate-950 hover:bg-amber-50 font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                >
                  <span>{currentSlide.primaryCta.icon}</span>
                  <span>{currentSlide.primaryCta.label}</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={currentSlide.primaryCta.onClick}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-slate-950 hover:bg-amber-50 font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                >
                  <span>{currentSlide.primaryCta.icon}</span>
                  <span>{currentSlide.primaryCta.label}</span>
                </button>
              )
            )}

            {/* Interactive "Olen rukoillut" counter button on the Prayer Community slide */}
            {currentSlide.isPrayerSlide && (
              <button
                type="button"
                onClick={handlePrayedClick}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-xs sm:text-sm border transition-all ${
                  justPrayed
                    ? 'bg-emerald-500 text-white border-emerald-300 shadow-md scale-95'
                    : 'bg-white/15 hover:bg-white/25 text-white border-white/30 backdrop-blur-xs'
                }`}
                data-testid="carousel-prayed-btn"
              >
                <span>{justPrayed ? '🕊️' : '🙏'}</span>
                <span>{justPrayed ? 'Kiitos rukouksestasi!' : `Olen rukoillut (${prayerCount})`}</span>
              </button>
            )}

            {currentSlide.secondaryCta && (
              currentSlide.secondaryCta.to ? (
                <Link
                  to={currentSlide.secondaryCta.to}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs sm:text-sm font-semibold backdrop-blur-xs transition-all"
                >
                  <span>{currentSlide.secondaryCta.icon}</span>
                  <span>{currentSlide.secondaryCta.label}</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={currentSlide.secondaryCta.onClick}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs sm:text-sm font-semibold backdrop-blur-xs transition-all"
                >
                  <span>{currentSlide.secondaryCta.icon}</span>
                  <span>{currentSlide.secondaryCta.label}</span>
                </button>
              )
            )}
          </div>

          {/* Prev / Next Arrow Buttons */}
          {slides.length > 1 && (
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                type="button"
                onClick={() => setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length)}
                aria-label="Edellinen dia"
                className="w-9 h-9 rounded-full bg-black/25 hover:bg-black/40 border border-white/20 text-white flex items-center justify-center transition-colors"
              >
                &larr;
              </button>
              <button
                type="button"
                onClick={() => setActiveIndex((prev) => (prev + 1) % slides.length)}
                aria-label="Seuraava dia"
                className="w-9 h-9 rounded-full bg-black/25 hover:bg-black/40 border border-white/20 text-white flex items-center justify-center transition-colors"
              >
                &rarr;
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile-First Touch-Friendly Slide Pills / Dots */}
      {slides.length > 1 && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2" role="tablist">
          {slides.map((s, idx) => {
            const isActive = idx === activeIndex;
            const shortNames = {
              hartaus: '🕯️ Päivän hartaus',
              hours: '🕊️ Hetkirukous',
              pyhapaiva: '⛪ Pyhäpäivä',
              prayers: '🙏 Rukousyhteisö',
            };
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveIndex(idx)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                  isActive
                    ? 'bg-primary-800 text-white border-primary-800 shadow-xs scale-105'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300 hover:bg-primary-50/50'
                }`}
              >
                <span>{shortNames[s.id] || s.badge}</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
