import { useTranslation } from 'react-i18next';
import { usePrayers } from '../../hooks/usePrayers';
import PastorPrayer from './PastorPrayer';
import StaffPrayers from './StaffPrayers';
import PublicPrayers from './PublicPrayers';
import PrayerForm from './PrayerForm';
import PrayerCounter from './PrayerCounter';
import LoadingSpinner from '../common/LoadingSpinner';

function HomePage() {
  const { t } = useTranslation();
  const { prayers, week, year, loading, error, refetch } = usePrayers();

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
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-center text-primary-800 mb-2">
        {t('app.title')}
      </h1>
      <p className="text-center text-gray-600 mb-8">
        {t('app.subtitle', { week, year })}
      </p>

      <PastorPrayer prayers={prayers.pastor} />
      <StaffPrayers prayers={prayers.staff} />
      <PublicPrayers prayers={prayers.public} />

      <div className="grid gap-8 md:grid-cols-2 mt-8">
        <PrayerForm onSuccess={refetch} />
        <PrayerCounter week={week} year={year} />
      </div>
    </div>
  );
}

export default HomePage;
