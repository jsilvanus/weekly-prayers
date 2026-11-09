import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import PrayerCard from './PrayerCard';

function PublicPrayers({ prayers = [] }) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);

  // Only approved prayers in public view
  const approvedPrayers = prayers.filter((p) => p.isApproved);

  // Separate highlighted (highlightPriority > 0)
  const highlighted = useMemo(() => {
    return approvedPrayers
      .filter((p) => (p.highlightPriority || 0) > 0)
      .sort((a, b) => (b.highlightPriority || 0) - (a.highlightPriority || 0))
      .slice(0, 4);
  }, [approvedPrayers]);

  const highlightedIds = useMemo(() => new Set(highlighted.map((p) => p.id)), [highlighted]);

  const nonHighlighted = useMemo(() => {
    return approvedPrayers.filter((p) => !highlightedIds.has(p.id));
  }, [approvedPrayers, highlightedIds]);

  // Two random prayers if non-highlighted are shown initially
  const randomTwo = useMemo(() => {
    if (nonHighlighted.length <= 2) return nonHighlighted;
    // Stable pseudo-random based on id or first two
    return nonHighlighted.slice(0, 2);
  }, [nonHighlighted]);

  // Determine what is displayed when collapsed:
  // If we have highlighted items, show highlighted items (+ 2 random if none highlighted)
  // If showAll is true, show ALL approved prayers.
  const displayedItems = showAll
    ? approvedPrayers
    : highlighted.length > 0
    ? highlighted
    : randomTwo;

  const totalCount = approvedPrayers.length;
  const isCollapsible = totalCount > displayedItems.length || showAll;

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-primary-800">
            {t('prayers.public.title')}
          </h2>
          <p className="text-xs text-gray-500">
            {highlighted.length > 0
              ? `${t('prayers.highlighted')}: ${highlighted.length} kpl`
              : 'Seurakuntalaisten jättämät rukousaiheet'}
          </p>
        </div>

        {totalCount > 2 && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-semibold text-primary-600 hover:text-primary-800"
          >
            {showAll ? t('prayers.showLess') : t('prayers.seeAll', { count: totalCount })}
          </button>
        )}
      </div>

      {approvedPrayers.length === 0 ? (
        <div className="bg-white rounded-lg border border-dashed border-gray-300 p-6 text-center text-gray-500 italic">
          {t('prayers.public.empty')}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {displayedItems.map((prayer) => {
              const isPrayerHighlighted = (prayer.highlightPriority || 0) > 0;

              if (isPrayerHighlighted) {
                return (
                  <div
                    key={prayer.id}
                    className="relative bg-amber-50/50 rounded-xl border border-amber-300 p-4 shadow-sm hover:shadow transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800">
                          ⭐ {t('prayers.highlighted')}
                        </span>
                        {prayer.isYhtymaWide && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-100 text-indigo-900 border border-indigo-200" title="Yhtymän laajuinen rukousaihe">
                            🏛️ Yhtymän yhteinen
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(prayer.createdAt || prayer.startDate).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {prayer.content}
                    </p>
                  </div>
                );
              }

              return (
                <PrayerCard key={prayer.id} prayer={prayer} showMeta />
              );
            })}
          </div>

          {/* Bottom see all button if not already expanded */}
          {totalCount > 2 && !showAll && (
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="btn-secondary text-xs px-4 py-2"
              >
                {t('prayers.seeAll', { count: totalCount })}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default PublicPrayers;
