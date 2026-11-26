import { useState, useMemo, useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import PrayerManager from './PrayerManager';
import UserManager from './UserManager';
import StaffPrayerForm from './StaffPrayerForm';
import PastorPrayerForm from './PastorPrayerForm';
import BishopPrayerForm from './BishopPrayerForm';
import HighlightManager from './HighlightManager';
import SettingsManager from './SettingsManager';
import MailingManager from './MailingManager';
import TenantManager from './TenantManager';
import BibleManager from './BibleManager';
import PyhapaivaManager from './PyhapaivaManager';
import HoursManager from './HoursManager';
import DevotionManager from './DevotionManager';
import MeditationManager from './MeditationManager';
import MeditationPage from '../prayers/MeditationPage';

export default function AdminPanel() {
  const { t } = useTranslation();
  const { isWorkerOrAbove, isCoordinatorOrAbove, isAdmin, isBishop, isDevotionAuthor, isDevotion, loading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tier 1 and Tier 2 domain definition
  const allDomains = useMemo(() => {
    const domains = [];

    // 1. Esirukoukset (Prayer Intentions)
    const prayerSubTabs = [];
    if (!isBishop || isAdmin) {
      prayerSubTabs.push({ id: 'prayers', label: t('admin.prayers.title') || 'Yleiset esirukoukset', component: PrayerManager });
      prayerSubTabs.push({ id: 'staff', label: t('admin.staff.title') || 'Työntekijän aihe', component: StaffPrayerForm });
    }
    if (isAdmin) {
      prayerSubTabs.push({ id: 'pastor', label: t('admin.pastor.title') || 'Kirkkoherran aihe', component: PastorPrayerForm });
    }
    if (isBishop || isAdmin) {
      prayerSubTabs.push({ id: 'bishop', label: t('admin.bishop.title') || 'Piispan aihe', component: BishopPrayerForm });
    }
    if (isCoordinatorOrAbove) {
      prayerSubTabs.push({ id: 'highlights', label: t('admin.highlights.title') || 'Esirukousnostot', component: HighlightManager });
    }

    if (prayerSubTabs.length > 0) {
      domains.push({
        id: 'prayers',
        label: t('nav.prayers') || 'Esirukoukset',
        icon: '🙏',
        subTabs: prayerSubTabs,
      });
    }

    // 2. Pyhäpäivä & Kirkkovuosi (Holy Day & Church Year)
    if (!isBishop || isAdmin) {
      domains.push({
        id: 'pyhapaiva',
        label: t('nav.pyhapaiva') || 'Pyhäpäivä',
        icon: '⛪',
        subTabs: [
          { id: 'pyhapaiva_hub', label: 'Kirkkovuoden pyhäpäivät & seurakunnan otsikot', component: PyhapaivaManager },
        ],
      });
    }

    // 3. Raamattu & Sana (Bible Word)
    if (!isBishop || isAdmin) {
      domains.push({
        id: 'bible',
        label: t('nav.bible') || 'Raamattu & Sana',
        icon: '📖',
        subTabs: [
          { id: 'bible_hub', label: 'Raamatuntekstit & Anno API', component: BibleManager },
        ],
      });
    }

    // 4. Hetkirukous (Liturgy of Hours)
    if (!isBishop || isAdmin) {
      domains.push({
        id: 'hours',
        label: t('nav.hours') || 'Hetkirukous',
        icon: '⏰',
        subTabs: [
          { id: 'hours_hub', label: 'Kirkkokäsikirja III -hetket', component: HoursManager },
        ],
      });
    }

    // 5. Meditaatiot (Meditations)
    if (!isBishop || isAdmin) {
      domains.push({
        id: 'meditations',
        label: t('nav.meditations') || 'Meditaatiot',
        icon: '📿',
        subTabs: [
          { id: 'meditations_builder', label: 'Meditaatioiden rakennuspalikat & hallinta', component: MeditationManager },
          { id: 'meditations_hub', label: 'Esikatselu: Meditaatiot & Hiljaisuus', component: MeditationPage },
        ],
      });
    }

    // 5. Hartaus (Devotions)
    if (isDevotionAuthor) {
      domains.push({
        id: 'hartaus',
        label: t('nav.hartaus') || 'Hartaus',
        icon: '✍️',
        subTabs: [
          { id: 'devotions', label: 'Päivän hartaudet & kirjoittaminen', component: DevotionManager },
        ],
      });
    }

    // 5. Yleiset asetukset (General Settings)
    const generalSubTabs = [];
    if (isCoordinatorOrAbove) {
      generalSubTabs.push({ id: 'settings', label: 'Seurakunnan asetukset & ilme', component: SettingsManager });
      generalSubTabs.push({ id: 'mailing', label: t('admin.mailing.tab'), component: MailingManager });
    }
    if (isAdmin) {
      generalSubTabs.push({ id: 'users', label: t('admin.users.title') || 'Käyttäjähallinta & roolit', component: UserManager });
      generalSubTabs.push({ id: 'tenants', label: '🏛️ Seurakunnat (Tenants)', component: TenantManager });
    }

    if (generalSubTabs.length > 0) {
      domains.push({
        id: 'general',
        label: 'Yleiset asetukset',
        icon: '⚙️',
        subTabs: generalSubTabs,
      });
    }

    return domains;
  }, [isAdmin, isBishop, isCoordinatorOrAbove, isDevotionAuthor, t]);

  // Determine active Domain & SubTab from URL or role-based default
  const defaultDomainId = useMemo(() => {
    if (isBishop && !isAdmin) return 'prayers';
    if (isDevotion && !isCoordinatorOrAbove && !isAdmin) return 'hartaus';
    return allDomains[0]?.id || 'prayers';
  }, [allDomains, isBishop, isAdmin, isDevotion, isCoordinatorOrAbove]);

  const urlDomain = searchParams.get('domain');
  const urlSubTab = searchParams.get('tab');

  const activeDomain = useMemo(() => {
    const found = allDomains.find((d) => d.id === urlDomain);
    return found || allDomains.find((d) => d.id === defaultDomainId) || allDomains[0];
  }, [allDomains, urlDomain, defaultDomainId]);

  const activeSubTab = useMemo(() => {
    if (!activeDomain) return null;
    const found = activeDomain.subTabs.find((s) => s.id === urlSubTab);
    return found || activeDomain.subTabs[0];
  }, [activeDomain, urlSubTab]);

  const handleSelectDomain = (domainId) => {
    const domain = allDomains.find((d) => d.id === domainId);
    const firstSubTab = domain?.subTabs[0]?.id || '';
    setSearchParams({ domain: domainId, tab: firstSubTab });
  };

  const handleSelectSubTab = (subTabId) => {
    if (activeDomain) {
      setSearchParams({ domain: activeDomain.id, tab: subTabId });
    }
  };

  if (loading) {
    return <div className="text-center py-8">{t('common.loading')}</div>;
  }

  if (!isWorkerOrAbove && !isBishop && !isDevotionAuthor) {
    return <Navigate to="/" replace />;
  }

  if (!activeDomain || !activeSubTab) {
    return <div className="text-center py-8 text-gray-500">Ei käyttöoikeuksia hallintapaneeliin.</div>;
  }

  const ActiveComponent = activeSubTab.component;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold font-martti text-primary-900">
            {t('admin.title')}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Kaksitasoinen hallintapaneeli: valitse pääalue ja sen ala-asetus.
          </p>
        </div>
      </div>

      {/* TIER 1: Main Domains */}
      <div className="bg-gray-100/80 p-1.5 rounded-2xl border border-gray-200/80 shadow-xs">
        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-thin pb-0.5" aria-label="Hallinnan pääalueet">
          {allDomains.map((domain) => {
            const isSelected = activeDomain.id === domain.id;
            return (
              <button
                key={domain.id}
                type="button"
                onClick={() => handleSelectDomain(domain.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-white text-primary-900 shadow-sm font-semibold ring-1 ring-black/5'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <span className="text-base">{domain.icon}</span>
                <span>{domain.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-gray-200/70 rounded-full font-mono text-gray-600">
                  {domain.subTabs.length}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* TIER 2: Sub-tabs under selected domain */}
      {activeDomain.subTabs.length > 1 && (
        <div className="border-b border-gray-200 pb-1 overflow-x-auto scrollbar-thin">
          <nav className="flex gap-2 min-w-max" aria-label="Alueen toiminnot">
            {activeDomain.subTabs.map((subTab) => {
              const isSelected = activeSubTab.id === subTab.id;
              return (
                <button
                  key={subTab.id}
                  type="button"
                  onClick={() => handleSelectSubTab(subTab.id)}
                  className={`pb-2.5 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'border-primary-600 text-primary-700 font-semibold'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                  }`}
                >
                  {subTab.label}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Active Component */}
      <div className="animate-fadeIn">
        <ActiveComponent />
      </div>
    </div>
  );
}
