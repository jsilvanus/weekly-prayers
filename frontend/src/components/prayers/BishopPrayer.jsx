import { useTranslation } from 'react-i18next';
import { useSettings } from '../../context/SettingsContext';
import { BishopCrestLogo } from '../../assets/churchIcons';

function BishopPrayer({ prayers = [] }) {
  const { t } = useTranslation();
  const { settings } = useSettings();

  // Strictly return null if no bishop's prayer has been added
  if (!prayers || prayers.length === 0) {
    return null;
  }

  const prayer = prayers[0];
  const bishopTitle = t('prayers.bishop.pill') || 'Piispa';
  const bishopName = settings?.bishop_name || 'Matti Repo';
  const authorDisplay = prayer.authorName || `${bishopTitle} ${bishopName}`;
  const crestUrl = prayer.logoUrl || settings?.bishop_crest_url || '/tampere_piispan_vaakuna.png';

  return (
    <section className="mb-8" data-testid="bishop-prayer-section">
      <div className="bg-gradient-to-r from-purple-50/90 via-purple-50/60 to-indigo-50/70 border-l-4 border-purple-700 rounded-r-xl shadow-sm p-5 sm:p-6 text-purple-950">
        <div className="flex items-center justify-between gap-3 mb-3 pb-2 border-b border-purple-200/50">
          <div className="flex items-center gap-2.5">
            <span className="text-xl text-purple-800">☩</span>
            <div>
              <h2 className="font-martti text-xl font-bold text-purple-950 tracking-wide">
                {t('prayers.bishop.title')}
              </h2>
              <span className="text-xs text-purple-700 font-medium">
                {authorDisplay}
              </span>
            </div>
          </div>

          {/* Bishop's Crest (Vaakuna) */}
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-900 border border-purple-200">
              {bishopTitle}
            </span>
            <div className="shrink-0 drop-shadow-sm" title={`Piispa ${bishopName} - vaakuna`}>
              <img
                src={crestUrl}
                alt="Piispan vaakuna"
                className="w-12 h-14 object-contain"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/tampere_piispan_vaakuna.png';
                }}
              />
            </div>
          </div>
        </div>

        <blockquote className="text-gray-900 whitespace-pre-wrap leading-relaxed text-base italic pl-3 border-l-3 border-purple-400 my-3">
          &rdquo;{prayer.content}&rdquo;
        </blockquote>

        {/* Visibility footer without dateranges */}
        <div className="flex items-center justify-between text-xs text-purple-700 font-medium pt-2 border-t border-purple-100">
          <span className="font-semibold text-purple-800">
            {settings?.bishop_diocese || 'Tampereen hiippakunta'}
          </span>
          <span>Hiippakunnan esirukousyhteys</span>
        </div>
      </div>
    </section>
  );
}

export default BishopPrayer;
