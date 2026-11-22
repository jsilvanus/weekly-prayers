import { useEffect } from 'react';

export default function DailyVerseModal({ isOpen, onClose, dailyVerse, liturgicalInfo }) {
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

  if (!isOpen || !dailyVerse) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      data-testid="daily-verse-modal"
    >
      <div
        className="relative bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-amber-200/80 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 via-orange-400 to-amber-600" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-100 transition-colors"
          aria-label="Sulje"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Modal Header */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-2xl">📜</span>
            <span className="text-xs uppercase tracking-wider font-bold text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-300/60">
              {dailyVerse.isManual ? 'Seurakunnan valitsema' : 'Päivän sana'}
            </span>
          </div>
          <h2 className="font-martti text-xl sm:text-2xl font-bold text-amber-950">
            {dailyVerse.title || liturgicalInfo?.dayName || 'Päivän sana'}
          </h2>
          {liturgicalInfo?.theme && (
            <p className="text-xs text-amber-800 italic font-medium mt-0.5">
              Kirkkovuoden aihe: &rdquo;{liturgicalInfo.theme}&rdquo;
            </p>
          )}
        </div>

        {/* Scripture Quote */}
        <div className="my-5 bg-amber-50/70 border-l-4 border-amber-500 p-4 sm:p-5 rounded-r-xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-2">
            {dailyVerse.reference}
          </p>
          <blockquote className="text-stone-900 font-serif text-base sm:text-lg italic leading-relaxed whitespace-pre-wrap">
            &rdquo;{dailyVerse.text}&rdquo;
          </blockquote>
        </div>

        {/* Meditation */}
        {dailyVerse.meditation && (
          <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-4 text-stone-800 text-sm leading-relaxed mb-6">
            <p className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">
              Mietiskely
            </p>
            <p className="whitespace-pre-wrap">{dailyVerse.meditation}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-200 text-xs text-stone-500">
          <span>Lähde: {dailyVerse.source === 'manual' ? 'Seurakunnan valitsema' : 'Evankeliumikirja & Raamattu'}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-medium transition-colors"
          >
            Sulje
          </button>
        </div>
      </div>
    </div>
  );
}
