import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePrayers } from '../../hooks/usePrayers';
import { useSettings } from '../../context/SettingsContext';
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
  const { prayers, week, year, loading, error, refetch } = usePrayers();
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

  const parishName = settings.parish_name || 'Tuomiokirkkoseurakunta';

  return (
    <div className="max-w-4xl mx-auto">
      {/* Top Header Section */}
      <div className="text-center mb-6">
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
