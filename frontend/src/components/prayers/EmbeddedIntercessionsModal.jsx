import { useEffect } from 'react';
import { usePrayers } from '../../hooks/usePrayers';
import { useTenant } from '../../context/TenantContext';
import LoadingSpinner from '../common/LoadingSpinner';

export default function EmbeddedIntercessionsModal({ isOpen, onClose }) {
  const { currentTenant } = useTenant();
  const { prayers, week, year, loading } = usePrayers(null, null, currentTenant?.slug);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const publicPrayers = prayers?.public || [];
  const staffPrayers = prayers?.staff || [];
  const pastorPrayers = prayers?.pastor || [];

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      data-testid="embedded-intercessions-modal"
    >
      <div
        className="relative bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-primary-200 overflow-hidden max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-200 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">📋</span>
              <h2 className="font-martti text-xl font-bold text-primary-950">
                Seurakunnan esirukousaiheet
              </h2>
            </div>
            <p className="text-xs text-gray-500">
              {currentTenant?.name || 'Seurakunta'} &bull; Viikko {week}, {year} &bull; Kannamme nämä aiheet Jumalan eteen
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Sulje"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Prayers Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
          {loading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              {/* Pastor's Prayer Focus */}
              {pastorPrayers.length > 0 && (
                <div className="bg-primary-50/70 border border-primary-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm">⛪</span>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-primary-900 font-martti">
                      Kirkkoherran aihe tälle viikolle
                    </h3>
                  </div>
                  {pastorPrayers.map((p) => (
                    <p key={p.id} className="text-sm text-primary-950 italic whitespace-pre-wrap">
                      &rdquo;{p.content}&rdquo;
                    </p>
                  ))}
                </div>
              )}

              {/* Staff / Ministry Prayers */}
              {staffPrayers.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    <span>👥</span>
                    <span>Työalojen ja vastuuryhmien rukousaiheet</span>
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {staffPrayers.map((p) => (
                      <div key={p.id} className="bg-blue-50/50 border border-blue-200/80 rounded-xl p-3 text-xs leading-relaxed">
                        {p.ministry_group && (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 mb-1">
                            {p.ministry_group}
                          </span>
                        )}
                        <p className="text-gray-800">{p.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Public Community Prayers */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                  <span>🕊️</span>
                  <span>Seurakuntalaisten yhteiset rukoukset ({publicPrayers.length})</span>
                </h3>
                {publicPrayers.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-2">
                    Ei julkisia esirukouksia tälle viikolle.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {publicPrayers.map((prayer) => (
                      <div
                        key={prayer.id}
                        className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-800 leading-relaxed"
                      >
                        <p className="whitespace-pre-wrap">{prayer.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 mt-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <span>&rdquo;Kuule meitä, laupias Herra Jumala.&rdquo;</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-primary-700 hover:bg-primary-800 text-white font-medium transition-colors"
          >
            Palaa hetkirukoukseen &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}
