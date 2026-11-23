import { Link } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { PastorSealLogo } from '../../assets/churchIcons';
import { withBasePath } from '../../services/api';

/**
 * Renders individual items (Prayers of Bishop, Pastor, Staff, or Public parishioners;
 * Active/Specific Devotion; Specific Meditations; or Pyhäpäivä) that have been explicitly
 * "lifted" (pinned) to the main portal either ABOVE ('above') or BELOW ('below') the carousel.
 */
export default function PortalLiftedItems({
  position = 'above', // 'above' | 'below'
  portalConfig,
  prayers,
  devotion,
  meditations = [],
  pyhapaivaData,
  bibleData,
}) {
  const { settings } = useSettings();

  const bishopName = settings?.bishop_name || 'Matti Repo';
  const bishopDiocese = settings?.bishop_diocese || 'Tampereen hiippakunta';
  const bishopCrestUrl = settings?.bishop_crest_url || '/tampere_piispan_vaakuna.png';
  const pastorName = settings?.pastor_name || 'Kirkkoherra';
  const pastorTitle = settings?.pastor_title || 'Kirkkoherra';
  const pastorLogoUrl = settings?.pastor_logo_url || '';

  // 1. Collect lifted prayers for this position ('above' or 'below')
  const allPrayers = [
    ...(prayers?.bishop || []).map((p) => ({ ...p, type: 'bishop' })),
    ...(prayers?.pastor || []).map((p) => ({ ...p, type: 'pastor' })),
    ...(prayers?.staff || []).map((p) => ({ ...p, type: 'staff' })),
    ...(prayers?.public || []).filter((p) => p.isApproved !== false).map((p) => ({ ...p, type: 'public' })),
  ];

  const liftedPrayers = allPrayers
    .filter((p) => (p.portalPosition || p.portal_position) === position)
    .sort((a, b) => (a.portalOrder || a.portal_order || 0) - (b.portalOrder || b.portal_order || 0));

  // 2. Check if active devotion is lifted to this position
  const devotionPos =
    devotion?.portal_position ||
    devotion?.portalPosition ||
    (portalConfig?.liftActiveDevotion !== 'none' ? portalConfig?.liftActiveDevotion : null);
  const isDevotionLiftedHere = Boolean(devotion && devotionPos === position);

  // 3. Check if current Pyhäpäivä is lifted to this position
  const pyhapaivaPos =
    pyhapaivaData?.portal_position ||
    pyhapaivaData?.portalPosition ||
    pyhapaivaData?.override?.portal_position ||
    (portalConfig?.liftCurrentPyhapaiva !== 'none' ? portalConfig?.liftCurrentPyhapaiva : null);
  const isPyhapaivaLiftedHere = Boolean((pyhapaivaData || bibleData?.liturgicalInfo) && pyhapaivaPos === position);

  // 4. Collect lifted meditations for this position
  const liftedMeditationsMap = portalConfig?.liftedMeditations || {};
  const liftedMeditations = (meditations || []).filter((m) => {
    const dbPos = m.portal_position || m.portalPosition;
    const cfgPos = liftedMeditationsMap[m.id] || liftedMeditationsMap[m.template_key] || liftedMeditationsMap[m.slug];
    const effectivePos = dbPos || (cfgPos && cfgPos !== 'none' ? cfgPos : null);
    return effectivePos === position;
  });

  if (
    liftedPrayers.length === 0 &&
    !isDevotionLiftedHere &&
    !isPyhapaivaLiftedHere &&
    liftedMeditations.length === 0
  ) {
    return null;
  }

  return (
    <div
      className="space-y-4"
      data-testid={`portal-lifted-items-${position}`}
    >
      {/* Lifted Active Devotion */}
      {isDevotionLiftedHere && (
        <div className="bg-gradient-to-r from-teal-50/90 via-white to-emerald-50/70 rounded-2xl border-2 border-teal-300/80 p-5 sm:p-6 shadow-sm relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-700 text-white">
                <span>🕯️</span>
                <span>Päivän hartaus</span>
              </span>
              {devotion.liturgical_day && (
                <span className="text-xs font-semibold text-teal-900 bg-teal-100/80 px-2.5 py-0.5 rounded-full">
                  {devotion.liturgical_day}
                </span>
              )}
            </div>
            {devotion.author && (
              <span className="text-xs font-medium text-stone-600">
                ✍️ {[devotion.author.title, devotion.author.name].filter(Boolean).join(' ')}
              </span>
            )}
          </div>

          <h3 className="font-martti text-xl sm:text-2xl font-bold text-stone-900 mb-2">
            {devotion.title}
          </h3>

          {devotion.scripture_text && (
            <blockquote className="text-sm sm:text-base font-serif italic text-stone-800 border-l-3 border-teal-600 pl-3 my-2.5">
              &rdquo;{devotion.scripture_text}&rdquo;
              {devotion.scripture_reference && (
                <span className="block text-xs font-bold not-italic text-teal-900 mt-1">
                  — {devotion.scripture_reference}
                </span>
              )}
            </blockquote>
          )}

          {(devotion.meditation_content || devotion.content) && (
            <p className="text-sm sm:text-base text-stone-800 font-serif leading-relaxed line-clamp-4 whitespace-pre-line">
              {devotion.meditation_content || devotion.content}
            </p>
          )}

          <div className="mt-4 pt-3 border-t border-teal-200/60 flex items-center justify-end">
            <Link
              to="/hartaus"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors shadow-2xs"
            >
              <span>Hiljenny koko hartauteen</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      )}

      {/* Lifted Pyhäpäivä */}
      {isPyhapaivaLiftedHere && (() => {
        const holyDay = pyhapaivaData?.holyDay || pyhapaivaData || bibleData?.liturgicalInfo || {};
        const heading =
          pyhapaivaData?.heading ||
          pyhapaivaData?.customHeading ||
          holyDay.custom_heading ||
          holyDay.dayName ||
          holyDay.name ||
          'Pyhäpäivä';
        const description =
          pyhapaivaData?.description ||
          pyhapaivaData?.customDescription ||
          pyhapaivaData?.pastoralReflection ||
          holyDay.theme ||
          bibleData?.dailyVerse?.text ||
          '';

        return (
          <div className="bg-gradient-to-r from-amber-50/90 via-white to-stone-50/90 rounded-2xl border-2 border-amber-300/80 p-5 sm:p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-700 text-white">
                <span>⛪</span>
                <span>Pyhäpäivän nosto</span>
              </span>
              {holyDay.season && (
                <span className="text-xs font-medium text-amber-900">
                  {holyDay.season}
                </span>
              )}
            </div>

            <h3 className="font-martti text-xl sm:text-2xl font-bold text-stone-900 mb-1.5">
              {heading}
            </h3>

            {description && (
              <p className="text-sm sm:text-base text-stone-800 font-serif leading-relaxed">
                {description}
              </p>
            )}

            <div className="mt-4 pt-3 border-t border-amber-200/60 flex items-center justify-end">
              <Link
                to="/pyhapaiva"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold transition-colors shadow-2xs"
              >
                <span>Avaa pyhäpäivän tekstit</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        );
      })()}

      {/* Lifted Individual Prayers (Bishop, Pastor, Staff, or Public) */}
      {liftedPrayers.map((prayer) => {
        if (prayer.type === 'bishop') {
          return (
            <div
              key={prayer.id}
              className="bg-gradient-to-r from-purple-50/90 via-white to-purple-50/50 rounded-2xl border-2 border-purple-300/80 p-5 sm:p-6 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <img
                  src={withBasePath(prayer.logoUrl || bishopCrestUrl)}
                  alt="Piispan vaakuna"
                  className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-800 text-white">
                      <span>☩</span>
                      <span>Piispan esirukous</span>
                    </span>
                    <span className="text-xs font-semibold text-purple-900">
                      Piispa {bishopName} &bull; {bishopDiocese}
                    </span>
                  </div>
                  <p className="text-stone-900 font-serif text-sm sm:text-base italic leading-relaxed whitespace-pre-wrap mt-2">
                    &rdquo;{prayer.content}&rdquo;
                  </p>
                </div>
              </div>
            </div>
          );
        }

        if (prayer.type === 'pastor') {
          return (
            <div
              key={prayer.id}
              className="bg-gradient-to-r from-amber-50/90 via-white to-amber-50/40 rounded-2xl border-2 border-amber-300/80 p-5 sm:p-6 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 overflow-hidden">
                  {prayer.logoUrl || pastorLogoUrl ? (
                    <img
                      src={withBasePath(prayer.logoUrl || pastorLogoUrl)}
                      alt="Kirkkoherran sinetti"
                      className="w-9 h-9 object-contain"
                    />
                  ) : (
                    <PastorSealLogo className="w-7 h-7 text-amber-800" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-700 text-white">
                      <span>✝️</span>
                      <span>Kirkkoherran esirukous</span>
                    </span>
                    <span className="text-xs font-semibold text-amber-950">
                      {pastorTitle} {pastorName}
                    </span>
                  </div>
                  <p className="text-stone-900 font-serif text-sm sm:text-base italic leading-relaxed whitespace-pre-wrap mt-2">
                    &rdquo;{prayer.content}&rdquo;
                  </p>
                </div>
              </div>
            </div>
          );
        }

        const isStaff = prayer.type === 'staff';
        return (
          <div
            key={prayer.id}
            className={`rounded-2xl border-2 p-5 shadow-sm ${
              isStaff
                ? 'bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/40 border-blue-300/80'
                : 'bg-gradient-to-r from-primary-50/80 via-white to-stone-50/60 border-primary-300/80'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold text-white ${
                    isStaff ? 'bg-blue-700' : 'bg-primary-700'
                  }`}
                >
                  <span>{isStaff ? '🏛️' : '🙏'}</span>
                  <span>{isStaff ? 'Työalan rukousnosto' : 'Yhteinen rukousaihe'}</span>
                </span>
                {prayer.ministryGroup && isStaff && (
                  <span className="text-xs font-semibold text-blue-900 bg-blue-100/80 px-2 py-0.5 rounded-full">
                    {prayer.ministryGroup}
                  </span>
                )}
                {prayer.ministryTag && (
                  <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                    🏷️ {prayer.ministryTag}
                  </span>
                )}
              </div>
              <Link
                to="/prayers"
                className="text-xs font-semibold text-primary-800 hover:underline"
              >
                Kaikki esirukoukset &rarr;
              </Link>
            </div>
            <p className="text-stone-900 font-serif text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
              &rdquo;{prayer.content}&rdquo;
            </p>
          </div>
        );
      })}

      {/* Lifted Individual Meditations */}
      {liftedMeditations.map((med) => (
        <div
          key={med.id}
          className="bg-gradient-to-r from-teal-50/80 via-sky-50/50 to-indigo-50/60 rounded-2xl border-2 border-teal-300/80 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-800 text-white">
                <span>{med.icon || '📿'}</span>
                <span>Meditaationosto</span>
              </span>
              {med.subtitle && (
                <span className="text-xs font-semibold text-teal-900">
                  {med.subtitle}
                </span>
              )}
            </div>
            <h3 className="font-martti text-lg sm:text-xl font-bold text-stone-900">
              {med.title}
            </h3>
            {(med.short_description || med.introduction) && (
              <p className="text-xs sm:text-sm text-stone-700 font-serif line-clamp-2">
                {med.short_description || med.introduction}
              </p>
            )}
          </div>

          <Link
            to={`/meditations?tab=${encodeURIComponent(med.slug || med.template_key || med.id)}`}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shrink-0 shadow-2xs transition-colors"
          >
            <span>Aloita harjoitus</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      ))}
    </div>
  );
}
