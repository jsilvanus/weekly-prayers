import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { useTenant } from '../../context/TenantContext';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { usePrayers } from '../../hooks/usePrayers';
import { usePrayerCount } from '../../hooks/usePrayerCount';
import PortalCarousel from './PortalCarousel';
import PortalLiftedItems from './PortalLiftedItems';
import PortalSectionRenderer from './PortalSectionRenderer';
import PrayerModal from '../prayers/PrayerModal';
import DailyVerseModal from '../bible/DailyVerseModal';

export default function PortalPage() {
  const { t } = useTranslation();
  const {
    currentTenant,
    yhtyma,
    isPartOfYhtyma,
    allParishesInYhtyma,
    switchParish,
    isModuleEnabled,
    portalConfig: tenantPortalConfig,
  } = useTenant();
  const { settings, portalConfig: settingsPortalConfig, getModuleTitle } = useSettings();
  const { user, isWorkerOrAbove } = useAuth();

  const portalConfig = tenantPortalConfig || settingsPortalConfig;
  const parishName = currentTenant?.name || settings?.parish_name || 'Tuomiokirkkoseurakunta';
  const brandName = settings?.brand_name || 'Rukoushetki';

  // Prayers and weekly prayer counter
  const { prayers, week, year, refetch: refetchPrayers } = usePrayers(null, null, currentTenant?.slug);
  const { count: prayerCount, increment: incrementPrayerCount } = usePrayerCount(week, year);

  // Additional portal data (Today's Devotion, Bible/Hours, Pyhäpäivä, Meditations)
  const [devotion, setDevotion] = useState(null);
  const [bibleData, setBibleData] = useState(null);
  const [pyhapaivaData, setPyhapaivaData] = useState(null);
  const [meditations, setMeditations] = useState([]);

  // Modals directly operable on the root portal
  const [isPrayerModalOpen, setIsPrayerModalOpen] = useState(false);
  const [isVerseModalOpen, setIsVerseModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const slug = currentTenant?.slug;

    // 1. Fetch Today's Devotion
    api
      .getTodayDevotion(null, slug)
      .then((res) => {
        if (mounted && res?.devotion) {
          setDevotion(res.devotion);
        }
      })
      .catch(() => {});

    // 2. Fetch Bible Today & Liturgy of Hours
    api
      .getBibleToday()
      .then((res) => {
        if (mounted && res) {
          setBibleData(res);
        }
      })
      .catch(() => {});

    // 3. Fetch Pyhäpäivä data if endpoint exists
    const fetchPyhapaiva =
      typeof api.getPyhapaivaDay === 'function'
        ? api.getPyhapaivaDay(null, slug)
        : typeof api.getHolyDay === 'function'
        ? api.getHolyDay(null, slug)
        : fetch(`/api/pyhapaiva/day${slug ? `?tenant=${encodeURIComponent(slug)}` : ''}`).then((r) =>
            r.ok ? r.json() : null
          );

    fetchPyhapaiva
      .then((res) => {
        if (mounted && res) {
          setPyhapaivaData(res.day || res);
        }
      })
      .catch(() => {});

    // 4. Fetch Meditations
    if (typeof api.getMeditations === 'function') {
      api
        .getMeditations(false)
        .then((res) => {
          if (mounted && res?.meditations) {
            setMeditations(res.meditations);
          }
        })
        .catch(() => {});
    }

    return () => {
      mounted = false;
    };
  }, [currentTenant?.slug]);

  const activePrayersCount = useMemo(() => {
    const b = prayers?.bishop?.length || 0;
    const pa = prayers?.pastor?.length || 0;
    const st = prayers?.staff?.length || 0;
    const pub = (prayers?.public || []).filter((p) => p.isApproved !== false).length;
    return b + pa + st + pub;
  }, [prayers]);

  const aboveSections = useMemo(() => {
    return (portalConfig?.sections || [])
      .filter((s) => s.visible && s.position === 'above')
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [portalConfig?.sections]);

  const belowSections = useMemo(() => {
    return (portalConfig?.sections || [])
      .filter((s) => s.visible && s.position !== 'above')
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [portalConfig?.sections]);

  const canSeeDisabled = isWorkerOrAbove || user?.role === 'admin';
  const navPills = [
    { id: 'hartaus', to: '/hartaus', icon: '🕯️', defaultLabel: 'Hartaus' },
    { id: 'hours', to: '/prayer-moment', icon: '⏰', defaultLabel: 'Hetkirukous' },
    { id: 'pyhapaiva', to: '/pyhapaiva', icon: '⛪', defaultLabel: 'Pyhäpäivä' },
    { id: 'prayers', to: '/prayers', icon: '🙏', defaultLabel: 'Esirukoukset' },
    { id: 'meditations', to: '/meditations', icon: '📿', defaultLabel: 'Meditaatiot' },
    { id: 'bible', to: '/bible', icon: '📖', defaultLabel: 'Raamattu & Sana' },
  ].filter((m) => isModuleEnabled(m.id) || canSeeDisabled);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn" data-testid="parish-portal-page">
      {/* 1. Portal Welcome Header & Yhtymä Parish Switcher */}
      <header className="text-center space-y-3">
        {isPartOfYhtyma && (
          <div className="flex items-center justify-center" data-testid="portal-yhtyma-dropdown">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-slate-100/90 to-blue-50/90 border border-slate-300/80 rounded-full px-3.5 py-1 shadow-2xs text-xs sm:text-sm text-slate-700">
              <span className="flex items-center gap-1.5 font-medium text-slate-600">
                <span className="text-sm">🏛️</span>
                <span className="hidden sm:inline">{yhtyma?.name || 'Seurakuntayhtymä'}:</span>
              </span>
              <div className="relative inline-flex items-center">
                <select
                  value={currentTenant?.slug}
                  onChange={(e) => switchParish(e.target.value)}
                  className="appearance-none font-bold text-primary-900 bg-white border border-primary-300 hover:border-primary-500 rounded-full pl-3 pr-7 py-0.5 cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-xs sm:text-sm transition-all"
                  aria-label="Valitse seurakunta seurakuntayhtymässä"
                >
                  {allParishesInYhtyma.map((parish) => (
                    <option key={parish.slug} value={parish.slug}>
                      {parish.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2.5 text-primary-700">
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        <div>
          <h1 className="font-martti text-3xl sm:text-4xl font-bold text-primary-900 tracking-tight">
            {parishName} &mdash; {brandName}
          </h1>
          <p className="text-gray-600 font-aptos text-sm sm:text-base max-w-2xl mx-auto mt-1">
            {settings?.parish_subtitle || 'Seurakunnan rukous-, hartaus- ja hiljentymiselämä verkossa'}
          </p>
        </div>

        {/* Quick Module Navigation Pills */}
        {navPills.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {navPills.map((pill) => {
              const enabled = isModuleEnabled(pill.id);
              const title = getModuleTitle ? getModuleTitle(pill.id, pill.defaultLabel) : pill.defaultLabel;
              return (
                <Link
                  key={pill.id}
                  to={pill.to}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs sm:text-sm font-medium transition-all shadow-2xs ${
                    enabled
                      ? 'bg-white border-gray-300 text-gray-700 hover:text-primary-800 hover:border-primary-400 hover:bg-primary-50'
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}
                >
                  <span>{pill.icon}</span>
                  <span>{title}</span>
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* 2. ABOVE-CAROUSEL ZONE: Lifted Individual Items + Above-Carousel Module Sections */}
      <PortalLiftedItems
        position="above"
        portalConfig={portalConfig}
        prayers={prayers}
        devotion={devotion}
        meditations={meditations}
        pyhapaivaData={pyhapaivaData}
        bibleData={bibleData}
      />

      {aboveSections.length > 0 && (
        <div className="space-y-6" data-testid="portal-sections-above">
          {aboveSections.map((sec) => (
            <PortalSectionRenderer
              key={sec.id}
              sectionId={sec.id}
              prayers={prayers}
              devotion={devotion}
              bibleData={bibleData}
              pyhapaivaData={pyhapaivaData}
              meditations={meditations}
              prayerCount={prayerCount}
              onIncrementPrayerCount={incrementPrayerCount}
              onOpenPrayerModal={() => setIsPrayerModalOpen(true)}
              onOpenDailyVerseModal={() => setIsVerseModalOpen(true)}
            />
          ))}
        </div>
      )}

      {/* 3. MOBILE-FIRST HERO CAROUSEL */}
      <PortalCarousel
        carouselConfig={portalConfig?.carousel}
        devotion={devotion}
        bibleData={bibleData}
        pyhapaivaData={pyhapaivaData}
        prayerCount={prayerCount}
        onIncrementPrayerCount={incrementPrayerCount}
        onOpenPrayerModal={() => setIsPrayerModalOpen(true)}
        onOpenDailyVerseModal={() => setIsVerseModalOpen(true)}
        activePrayersCount={activePrayersCount}
      />

      {/* 4. BELOW-CAROUSEL ZONE: Lifted Individual Items + Below-Carousel Module Sections */}
      <PortalLiftedItems
        position="below"
        portalConfig={portalConfig}
        prayers={prayers}
        devotion={devotion}
        meditations={meditations}
        pyhapaivaData={pyhapaivaData}
        bibleData={bibleData}
      />

      {belowSections.length > 0 && (
        <div className="space-y-6" data-testid="portal-sections-below">
          {belowSections.map((sec) => (
            <PortalSectionRenderer
              key={sec.id}
              sectionId={sec.id}
              prayers={prayers}
              devotion={devotion}
              bibleData={bibleData}
              pyhapaivaData={pyhapaivaData}
              meditations={meditations}
              prayerCount={prayerCount}
              onIncrementPrayerCount={incrementPrayerCount}
              onOpenPrayerModal={() => setIsPrayerModalOpen(true)}
              onOpenDailyVerseModal={() => setIsVerseModalOpen(true)}
            />
          ))}
        </div>
      )}

      {/* Prayer Submission Modal directly on `/` */}
      <PrayerModal
        isOpen={isPrayerModalOpen}
        onClose={() => setIsPrayerModalOpen(false)}
        onSuccess={refetchPrayers}
      />

      {/* Daily Verse Modal directly on `/` */}
      <DailyVerseModal
        isOpen={isVerseModalOpen}
        onClose={() => setIsVerseModalOpen(false)}
        dailyVerse={bibleData?.dailyVerse}
        liturgicalInfo={bibleData?.liturgicalInfo}
      />
    </div>
  );
}
