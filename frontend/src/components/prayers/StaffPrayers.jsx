import { useTranslation } from 'react-i18next';
import PrayerCard from './PrayerCard';

function StaffPrayers({ prayers }) {
  const { t } = useTranslation();

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold text-primary-800 mb-4">
        {t('prayers.staff.title')}
      </h2>

      {prayers.length === 0 ? (
        <p className="text-gray-500 italic">{t('prayers.staff.empty')}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {prayers.map((prayer) => (
            <PrayerCard key={prayer.id} prayer={prayer} showMeta />
          ))}
        </div>
      )}
    </section>
  );
}

export default StaffPrayers;
