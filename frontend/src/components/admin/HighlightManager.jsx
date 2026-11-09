import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePrayers } from '../../hooks/usePrayers';
import { api } from '../../services/api';

function HighlightManager() {
  const { t } = useTranslation();
  const { prayers, refetch, loading } = usePrayers();
  const [filterType, setFilterType] = useState('all');
  const [filterGroup, setFilterGroup] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);
  const [customZInputs, setCustomZInputs] = useState({});

  // Combine approved ministry and parishioner prayers
  const allEligiblePrayers = [
    ...prayers.staff.map((p) => ({ ...p, categoryLabel: 'ministry' })),
    ...prayers.public.filter((p) => p.isApproved).map((p) => ({ ...p, categoryLabel: 'parishioner' })),
  ];

  const todayStr = new Date().toISOString().split('T')[0];

  // Helper to check if a prayer is currently active by date range
  const isCurrentlyActive = (p) => {
    return (!p.startDate || p.startDate <= todayStr) && (!p.endDate || p.endDate >= todayStr);
  };

  // Sort prayers with positive z-values
  const highlightedQueue = allEligiblePrayers
    .filter((p) => (p.highlightPriority || 0) > 0)
    .sort((a, b) => (b.highlightPriority || 0) - (a.highlightPriority || 0));

  // Active top 4
  const activeHighlights = highlightedQueue.filter(isCurrentlyActive).slice(0, 4);
  const activeIds = new Set(activeHighlights.map((p) => p.id));

  // In line (queue) for when active ones expire
  const standbyQueue = highlightedQueue.filter((p) => !activeIds.has(p.id) && isCurrentlyActive(p));
  const expiredHighlights = highlightedQueue.filter((p) => p.endDate && p.endDate < todayStr);

  const handleSetPriority = async (id, priority) => {
    setActionLoading(id);
    try {
      await api.updatePrayerHighlight(id, priority);
      refetch();
    } catch (error) {
      alert(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCustomSubmit = (id) => {
    const val = parseInt(customZInputs[id], 10);
    if (!isNaN(val) && val >= 0) {
      handleSetPriority(id, val);
    }
  };

  // Filter list for bottom table
  let displayList = allEligiblePrayers;
  if (filterType === 'ministry') {
    displayList = displayList.filter((p) => p.categoryLabel === 'ministry');
  } else if (filterType === 'parishioner') {
    displayList = displayList.filter((p) => p.categoryLabel === 'parishioner');
  } else if (filterType === 'highlighted') {
    displayList = displayList.filter((p) => (p.highlightPriority || 0) > 0);
  }

  if (filterGroup !== 'all') {
    displayList = displayList.filter((p) => (p.ministryGroup || 'local') === filterGroup);
  }

  if (loading) {
    return <div className="text-center py-8">{t('common.loading')}</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-primary-800">
          {t('admin.highlights.title')}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {t('admin.highlights.desc')}
        </p>
      </div>

      {/* Highlights Dashboard Widget */}
      <div className="grid gap-4 md:grid-cols-2 mb-8">
        {/* Active Top 1-4 */}
        <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
              <span>⭐</span> {t('admin.highlights.activeHighlights')}
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-200 text-amber-900">
              {activeHighlights.length}/4
            </span>
          </div>

          {activeHighlights.length === 0 ? (
            <p className="text-xs text-amber-800 italic py-2">
              Ei aktiivisia nostoja. Aseta alta rukouksille Z-arvo nostaaksesi ne esiin.
            </p>
          ) : (
            <div className="space-y-2.5">
              {activeHighlights.map((p, idx) => (
                <div
                  key={p.id}
                  className="bg-white rounded-lg p-3 border border-amber-200 text-xs shadow-sm"
                >
                  <div className="flex items-center justify-between font-semibold mb-1">
                    <span className="text-amber-800">
                      #{idx + 1} Z-arvo: {p.highlightPriority} ({p.categoryLabel === 'ministry' ? 'Työala' : 'Seurakuntalainen'})
                    </span>
                    <span className="text-gray-500 font-normal">
                      Päättyy: {p.endDate || 'Toistaiseksi'}
                    </span>
                  </div>
                  <p className="text-gray-700 line-clamp-2">
                    {p.content}
                  </p>
                  <div className="mt-2 text-right">
                    <button
                      onClick={() => handleSetPriority(p.id, 0)}
                      disabled={actionLoading === p.id}
                      className="text-[11px] text-red-600 hover:text-red-800 font-medium"
                    >
                      Poista nosto
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Next in Line (Queue & Auto-replacement preview) */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <span>⏱️</span> Seuraavana jonossa (Z-korvaajat)
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">
              {standbyQueue.length} jonossa
            </span>
          </div>

          {standbyQueue.length === 0 ? (
            <div className="text-xs text-gray-500 italic py-2">
              <p>Ei rukouksia jonossa.</p>
              <p className="mt-1">
                Vinkki: Voit antaa useammalle rukoukselle eri Z-arvoja (esim. Z=15, Z=10, Z=5). Kun ylempänä oleva rukous vanhenee aikataulunsa mukaan, seuraava aktiivinen nousee automaattisesti Top 1–4 -nostoihin.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {standbyQueue.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-lg p-2.5 border border-slate-200 text-xs"
                >
                  <div className="flex items-center justify-between font-medium text-slate-700 mb-1">
                    <span>Z={p.highlightPriority} &bull; {p.categoryLabel === 'ministry' ? 'Työala' : 'Seurakuntalainen'}</span>
                    <span className="text-gray-500">{p.startDate} &rarr; {p.endDate}</span>
                  </div>
                  <p className="text-gray-600 line-clamp-1">{p.content}</p>
                </div>
              ))}
            </div>
          )}

          {expiredHighlights.length > 0 && (
            <div className="mt-3 pt-2 border-t border-slate-200 text-xs text-gray-500">
              <span className="text-red-500 font-medium">Vanhentuneet nostot ({expiredHighlights.length} kpl):</span> Nämä ovat ohittaneet loppupäivämääränsä ja väistyneet automaattisesti.
            </div>
          )}
        </div>
      </div>

      {/* Filter and List of Prayers to Highlight */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 text-sm">
            Kaikki hyväksytyt rukousaiheet ({displayList.length})
          </h3>

          <div className="flex flex-wrap gap-1.5 text-xs">
            <button
              onClick={() => { setFilterType('all'); setFilterGroup('all'); }}
              className={`px-2.5 py-1 rounded-md ${filterType === 'all' && filterGroup === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Kaikki
            </button>
            <button
              onClick={() => setFilterType('highlighted')}
              className={`px-2.5 py-1 rounded-md ${filterType === 'highlighted' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              ⭐ Vain nostetut
            </button>
            <button
              onClick={() => setFilterType('ministry')}
              className={`px-2.5 py-1 rounded-md ${filterType === 'ministry' && filterGroup === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Työalat
            </button>
            <button
              onClick={() => { setFilterType('ministry'); setFilterGroup('local'); }}
              className={`px-2.5 py-1 rounded-md ${filterGroup === 'local' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700'}`}
            >
              📍 Paikalliset (Ryhmä 1)
            </button>
            <button
              onClick={() => { setFilterType('ministry'); setFilterGroup('international'); }}
              className={`px-2.5 py-1 rounded-md ${filterGroup === 'international' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700'}`}
            >
              🌍 Kansainväliset (Ryhmä 2)
            </button>
            <button
              onClick={() => { setFilterType('parishioner'); setFilterGroup('all'); }}
              className={`px-2.5 py-1 rounded-md ${filterType === 'parishioner' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Seurakuntalaiset
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {displayList.map((prayer) => {
            const isHighlighted = (prayer.highlightPriority || 0) > 0;
            const active = isCurrentlyActive(prayer);

            return (
              <div
                key={prayer.id}
                className={`p-3.5 rounded-lg border transition-all ${
                  isHighlighted
                    ? 'border-amber-300 bg-amber-50/30'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        prayer.categoryLabel === 'ministry'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {prayer.categoryLabel === 'ministry' ? 'Työala' : 'Seurakuntalainen'}
                    </span>

                    {prayer.categoryLabel === 'ministry' && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {prayer.ministryGroup === 'international' ? '🌍 Kansainvälinen' : '📍 Paikallinen'}
                      </span>
                    )}

                    {prayer.ministryTag && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700">
                        🏷️ {prayer.ministryTag}
                      </span>
                    )}

                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        active
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {active ? '● Aktiivinen aikavälillä' : '○ Ei aktiivinen nyt'}
                    </span>
                  </div>

                  <div className="text-xs text-gray-500">
                    Aikaväli: <strong>{prayer.startDate}</strong> &rarr; <strong>{prayer.endDate}</strong>
                  </div>
                </div>

                <p className="text-gray-800 text-sm mb-3 whitespace-pre-wrap">
                  {prayer.content}
                </p>

                {/* Priority / Z-value controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 font-medium">
                      Nykyinen Z-arvo:
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        isHighlighted
                          ? 'bg-amber-200 text-amber-900'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {prayer.highlightPriority || 0}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isHighlighted ? (
                      <button
                        onClick={() => handleSetPriority(prayer.id, 0)}
                        disabled={actionLoading === prayer.id}
                        className="btn-danger text-xs py-1 px-2.5"
                      >
                        Poista nosto
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleSetPriority(prayer.id, 10)}
                          disabled={actionLoading === prayer.id}
                          className="btn bg-amber-500 hover:bg-amber-600 text-white text-xs py-1 px-2.5"
                        >
                          ⭐ Nosta (Z=10)
                        </button>
                        <button
                          onClick={() => handleSetPriority(prayer.id, 20)}
                          disabled={actionLoading === prayer.id}
                          className="btn bg-amber-600 hover:bg-amber-700 text-white text-xs py-1 px-2.5"
                        >
                          🌟 Korkea (Z=20)
                        </button>
                      </>
                    )}

                    {/* Custom Z-value input */}
                    <div className="flex items-center gap-1 ml-2">
                      <input
                        type="number"
                        min="0"
                        max="999"
                        placeholder="Muu Z"
                        value={customZInputs[prayer.id] ?? ''}
                        onChange={(e) =>
                          setCustomZInputs({
                            ...customZInputs,
                            [prayer.id]: e.target.value,
                          })
                        }
                        className="input py-1 px-2 text-xs w-16"
                      />
                      <button
                        type="button"
                        onClick={() => handleCustomSubmit(prayer.id)}
                        disabled={actionLoading === prayer.id}
                        className="btn-secondary text-xs py-1 px-2"
                      >
                        Aseta
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default HighlightManager;
