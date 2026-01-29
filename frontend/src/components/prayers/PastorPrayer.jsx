import { useTranslation } from 'react-i18next';
import PrayerCard from './PrayerCard';

function PastorPrayer({ prayers }) {
  const { t } = useTranslation();

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold text-primary-800 mb-4">
        {t('prayers.pastor.title')}
      </h2>

      {prayers.length === 0 ? (
        <p className="text-gray-500 italic">{t('prayers.pastor.empty')}</p>
      ) : (
        <div className="space-y-4">
          {prayers.map((prayer) => (
            <div key={prayer.id} className="bg-primary-50 rounded-xl p-6 border-l-4 border-primary-600">
              <p className="text-gray-800 text-lg whitespace-pre-wrap">{prayer.content}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default PastorPrayer;
