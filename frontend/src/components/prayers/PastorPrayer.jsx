import { useTranslation } from 'react-i18next';
import { useSettings } from '../../context/SettingsContext';

function PastorPrayer({ prayers = [] }) {
  const { t } = useTranslation();
  const { settings } = useSettings();

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-martti text-xl font-bold text-primary-900">
          {t('prayers.pastor.title')}
        </h2>
      </div>

      {prayers.length === 0 ? (
        <p className="text-gray-500 italic bg-white p-4 rounded-lg border border-dashed border-gray-200">
          {t('prayers.pastor.empty')}
        </p>
      ) : (
        <div className="space-y-4">
          {prayers.map((prayer) => {
            const logoUrl = prayer.logoUrl || settings?.pastor_logo_url;

            return (
              <div
                key={prayer.id}
                className="bg-gradient-to-r from-amber-50/60 via-white to-primary-50/30 rounded-xl p-5 sm:p-6 border-l-4 border-amber-500 shadow-sm"
              >
                {/* Optional Pastor / Parish Logo */}
                {logoUrl && (
                  <div className="flex justify-end mb-2">
                    <img
                      src={logoUrl}
                      alt="Kirkkoherran sinetti"
                      className="h-10 w-12 object-contain"
                    />
                  </div>
                )}

                <p className="text-gray-900 text-base sm:text-lg whitespace-pre-wrap leading-relaxed font-aptos">
                  {prayer.content}
                </p>

                <div className="mt-4 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>{prayer.authorName || 'Kirkkoherra'}</span>
                  <span>{new Date(prayer.createdAt || prayer.startDate).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default PastorPrayer;
