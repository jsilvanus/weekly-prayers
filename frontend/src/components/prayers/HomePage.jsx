import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePrayers } from '../../hooks/usePrayers';
import { useSettings } from '../../context/SettingsContext';
import { useTenant } from '../../context/TenantContext';
import OpeningInvocation from './OpeningInvocation';
import FrontPageBibleWidget from './FrontPageBibleWidget';
import BishopPrayer from './BishopPrayer';
import PastorPrayer from './PastorPrayer';
import MinistryPrayers from './MinistryPrayers';
import PublicPrayers from './PublicPrayers';
import LordsPrayer from './LordsPrayer';
import PrayerModal from './PrayerModal';
import LoadingSpinner from '../common/LoadingSpinner';

function HomePage() {
  const { t } = useTranslation();
  const { currentTenant, yhtyma, isPartOfYhtyma, allParishesInYhtyma, switchParish } = useTenant();
  const { prayers, week, year, loading, error, refetch } = usePrayers(null, null, currentTenant?.slug);
  const { settings } = useSettings();
  const [isPrayerModalOpen, setIsPrayerModalOpen] = useState(false);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{t('common.error')}: {error}</p>
      </div>
    );
  }

  const parishName = currentTenant?.name || settings.parish_name || 'Tuomiokirkkoseurakunta';

  return (
    <div className="max-w-4xl mx-auto">
      {/* Top Header Section */}
      <div className="text-center mb-6">
        {/* Yhtymä Member Parishes Dropdown */}
        {isPartOfYhtyma && (
          <div className="flex items-center justify-center mb-3" data-testid="yhtyma-parish-dropdown">
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

        <h1 className="text-3xl md:text-4xl font-bold text-primary-900 mb-1 font-martti tracking-tight">
          {parishName} — {t('app.title')}
        </h1>
        <p className="text-gray-600 mb-5 font-aptos text-sm sm:text-base">
          {t('app.subtitle', { week, year })}
        </p>

        {/* Top Button to open prayer submission modal dialog */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setIsPrayerModalOpen(true)}
            className="btn bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-medium px-5 py-2.5 rounded-full shadow-md hover:shadow-lg transition-all flex items-center gap-2 transform hover:-translate-y-0.5"
          >
            <span>✍️</span>
            <span>{t('prayers.submit.openButton')}</span>
          </button>
        </div>
      </div>

      {/* Liturgical opening invocation */}
      <OpeningInvocation />

      {/* Two specific Bible modes: Daily verse and Liturgy of the Hours for nearest rukoushetki */}
      <FrontPageBibleWidget />

      {/* Optional Bishop's Prayer with crest (only renders if added) */}
      <BishopPrayer prayers={prayers.bishop} />

      {/* Prayers */}
      <PastorPrayer prayers={prayers.pastor} />
      <MinistryPrayers prayers={prayers.staff} />
      <PublicPrayers prayers={prayers.public} />

      {/* Lord's Prayer (Our Father) at the end, followed by 'I prayed' button */}
      <LordsPrayer week={week} year={year} />

      {/* Modal Dialog for prayer submission */}
      <PrayerModal
        isOpen={isPrayerModalOpen}
        onClose={() => setIsPrayerModalOpen(false)}
        onSuccess={refetch}
      />
    </div>
  );
}

export default HomePage;
