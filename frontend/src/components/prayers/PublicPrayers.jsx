import { useTranslation } from 'react-i18next';
import PrayerCard from './PrayerCard';

function PublicPrayers({ prayers }) {
  const { t } = useTranslation();

  // Only show approved prayers in public view
  const approvedPrayers = prayers.filter((p) => p.isApproved);

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold text-primary-800 mb-4">
        {t('prayers.public.title')}
      </h2>

      {approvedPrayers.length === 0 ? (
        <p className="text-gray-500 italic">{t('prayers.public.empty')}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {approvedPrayers.map((prayer) => (
            <PrayerCard key={prayer.id} prayer={prayer} />
          ))}
        </div>
      )}
    </section>
  );
}

export default PublicPrayers;
