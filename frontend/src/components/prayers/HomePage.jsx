import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePrayers } from '../../hooks/usePrayers';
import { useTenant } from '../../context/TenantContext';
import LandingHero from '../common/LandingHero';
import OpeningInvocation from './OpeningInvocation';
import BishopPrayer from './BishopPrayer';
import PastorPrayer from './PastorPrayer';
import MinistryPrayers from './MinistryPrayers';
import PublicPrayers from './PublicPrayers';
import LordsPrayer from './LordsPrayer';
import PrayerModal from './PrayerModal';
import LoadingSpinner from '../common/LoadingSpinner';

function HomePage() {
  const { t } = useTranslation();
  const { currentTenant } = useTenant();
  const { prayers, week, year, loading, error, refetch } = usePrayers(null, null, currentTenant?.slug);
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

  return (
    <div className="max-w-4xl mx-auto" data-testid="prayer-intentions-page">
      {/* Unified Landing Hero */}
      <LandingHero
        currentModule="prayers"
        title={t('app.title') || 'Viikon esirukoukset'}
        subtitle={t('app.subtitle', { week, year })}
        primaryAction={{
          label: t('prayers.submit.openButton') || 'Jätä esirukouspyyntö',
          icon: '✍️',
          onClick: () => setIsPrayerModalOpen(true),
        }}
      />

      {/* Liturgical opening invocation */}
      <OpeningInvocation />

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
