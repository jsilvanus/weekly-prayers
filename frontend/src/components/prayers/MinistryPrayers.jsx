import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PrayerCard from './PrayerCard';

function MinistryPrayers({ prayers = [] }) {
  const { t } = useTranslation();
  const [selectedMinistry, setSelectedMinistry] = useState('ALL');
  const [showAllNonHighlighted, setShowAllNonHighlighted] = useState(false);

  // Extract all unique ministry tags from available prayers
  const availableTags = Array.from(
    new Set(prayers.map((p) => p.ministryTag).filter(Boolean))
  );

  // Filter prayers by ministry tag
  let filteredPrayers = prayers;
  if (selectedMinistry !== 'ALL') {
    filteredPrayers = filteredPrayers.filter((p) => p.ministryTag === selectedMinistry);
  }

  // Separate highlighted (z-value > 0) and regular prayers
  // Sorted by highlightPriority DESC, so highest Z value comes first
  const highlightedPrayers = filteredPrayers
    .filter((p) => (p.highlightPriority || 0) > 0)
    .sort((a, b) => (b.highlightPriority || 0) - (a.highlightPriority || 0))
    .slice(0, 4); // Show top 1-4 highlighted

  const highlightedIds = new Set(highlightedPrayers.map((p) => p.id));
  const regularPrayers = filteredPrayers.filter((p) => !highlightedIds.has(p.id));

  // Determine which regular prayers to display
  const displayedRegular = showAllNonHighlighted
    ? regularPrayers
    : regularPrayers.slice(0, 2);

  return (
    <section className="mb-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-xl font-semibold text-primary-800">
            {t('prayers.staff.title')}
          </h2>
          <p className="text-xs text-gray-500">
            {t('prayers.filterByMinistry')}
          </p>
        </div>

        {regularPrayers.length > 2 && (
          <button
            type="button"
            onClick={() => setShowAllNonHighlighted(!showAllNonHighlighted)}
            className="text-xs font-semibold text-primary-600 hover:text-primary-800"
          >
            {showAllNonHighlighted
              ? t('prayers.showLess')
              : t('prayers.seeAll', { count: filteredPrayers.length })}
          </button>
        )}
      </div>

      {/* Ministry tag filter pills (public filtering level) */}
      {availableTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-5 pb-2 border-b border-gray-100">
          <button
            onClick={() => setSelectedMinistry('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedMinistry === 'ALL'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('ministries.all')}
          </button>
          {availableTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedMinistry(tag)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedMinistry === tag
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🏷️ {tag}
            </button>
          ))}
        </div>
      )}

      {filteredPrayers.length === 0 ? (
        <div className="bg-white rounded-lg border border-dashed border-gray-300 p-6 text-center text-gray-500 italic">
          {t('prayers.staff.empty')}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Highlighted prayers (top 1-4 z-values) */}
          {highlightedPrayers.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                <span className="text-amber-500">⭐</span>
                <span>{t('prayers.highlighted')} ({highlightedPrayers.length})</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {highlightedPrayers.map((prayer) => (
                  <div
                    key={prayer.id}
                    className="relative bg-amber-50/50 rounded-xl border border-amber-300 p-4 shadow-sm transition-all hover:shadow"
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
                      {prayer.ministryTag && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          {prayer.ministryTag}
                        </span>
                      )}
                    </div>

                    <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {prayer.content}
                    </p>

                    <div className="mt-3 pt-2 border-t border-amber-200/60 flex items-center justify-between text-xs text-gray-500">
                      <span>{prayer.authorName || 'Työala'}</span>
                      <span>{new Date(prayer.createdAt || prayer.startDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Regular prayers */}
          {regularPrayers.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {displayedRegular.map((prayer) => (
                <div
                  key={prayer.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:border-gray-200 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {prayer.isYhtymaWide && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-100 text-indigo-900 border border-indigo-200" title="Yhtymän laajuinen rukousaihe">
                          🏛️ Yhtymän yhteinen
                        </span>
                      )}
                      {prayer.ministryTag && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700">
                          {prayer.ministryTag}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(prayer.createdAt || prayer.startDate).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-gray-800 whitespace-pre-wrap">
                    {prayer.content}
                  </p>

                  <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>{prayer.authorName || 'Työala'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* See all / Show less toggle */}
          {regularPrayers.length > 2 && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setShowAllNonHighlighted(!showAllNonHighlighted)}
                className="btn-secondary text-xs px-4 py-1.5"
              >
                {showAllNonHighlighted
                  ? t('prayers.showLess')
                  : t('prayers.seeAll', { count: filteredPrayers.length })}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default MinistryPrayers;
