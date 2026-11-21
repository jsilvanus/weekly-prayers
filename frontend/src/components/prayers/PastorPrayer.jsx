import { useTranslation } from 'react-i18next';
import { useSettings } from '../../context/SettingsContext';
import { withBasePath } from '../../services/api';

function PastorPrayer({ prayers = [] }) {
  const { t } = useTranslation();
  const { settings } = useSettings();

  // If disabled in settings or no prayer available
  if (settings?.show_pastor_prayer === 'false' || !prayers || prayers.length === 0) {
    return null;
  }

  // Only one visible at a time (highest Z-priority and active date, similar to BishopPrayer)
  const prayer = prayers[0];
  const pastorTitle = settings?.pastor_title || t('prayers.pastor.pill') || 'Kirkkoherra';
  const pastorName = settings?.pastor_name || 'Kirkkoherra';
  const logoUrl = settings?.pastor_logo_url ? withBasePath(settings.pastor_logo_url) : null;

  return (
    <section className="mb-8" data-testid="pastor-prayer-section">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-martti text-xl font-bold text-primary-900">
          {t('prayers.pastor.title')}
        </h2>
      </div>

      <div className="bg-gradient-to-r from-amber-50/60 via-white to-primary-50/30 rounded-xl p-5 sm:p-6 border-l-4 border-amber-500 shadow-sm">
        {/* Optional Pastor / Parish Logo from Parish settings & Yhtymä-wide badge */}
        {(logoUrl || prayer.isYhtymaWide) && (
          <div className="flex items-center justify-between mb-3">
            {prayer.isYhtymaWide ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-900 border border-indigo-200">
                🏛️ Yhtymän yhteinen
              </span>
            ) : <span />}
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Kirkkoherran sinetti"
                className="h-10 w-12 object-contain"
              />
            )}
          </div>
        )}

        <p className="text-gray-900 text-base sm:text-lg whitespace-pre-wrap leading-relaxed font-aptos">
          {prayer.content}
        </p>

        <div className="mt-4 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span className="font-semibold text-primary-950">
            {pastorTitle} {pastorName}
          </span>
          <span>{new Date(prayer.createdAt || prayer.startDate).toLocaleDateString('fi-FI')}</span>
        </div>
      </div>
    </section>
  );
}

export default PastorPrayer;
