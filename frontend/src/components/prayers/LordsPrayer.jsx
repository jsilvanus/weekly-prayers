import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePrayerCount } from '../../hooks/usePrayerCount';

function LordsPrayer({ week, year }) {
  const { t } = useTranslation();
  const { count, increment } = usePrayerCount(week, year);
  const [showThanks, setShowThanks] = useState(false);
  const [animating, setAnimating] = useState(false);

  const handleClick = async () => {
    if (animating) return;

    setAnimating(true);
    const success = await increment();

    if (success) {
      setShowThanks(true);
      setTimeout(() => {
        setShowThanks(false);
        setAnimating(false);
      }, 2500);
    } else {
      setAnimating(false);
    }
  };

  return (
    <section className="mt-12 mb-8">
      <div className="bg-gradient-to-b from-primary-50/70 via-white to-primary-50/50 rounded-2xl border border-primary-200/80 p-6 md:p-8 shadow-sm max-w-2xl mx-auto text-center">
        {/* Lord's Prayer Header */}
        <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-serif mb-3">
          ✝
        </div>

        <h3 className="font-serif text-2xl font-bold text-primary-900 mb-5">
          {t('prayers.lordsPrayer.title')}
        </h3>

        {/* Lord's Prayer Text */}
        <div className="font-serif text-gray-800 text-base md:text-lg leading-relaxed whitespace-pre-line mb-8 max-w-lg mx-auto italic">
          {t('prayers.lordsPrayer.text')}
        </div>

        {/* Liturgical conclusion separator */}
        <div className="w-24 h-0.5 bg-primary-200 mx-auto mb-6"></div>

        {/* "I have prayed" button & Weekly Counter */}
        <div className="max-w-md mx-auto">
          <button
            onClick={handleClick}
            disabled={animating}
            className={`w-full py-3.5 px-6 rounded-xl font-semibold text-base shadow-sm transition-all flex items-center justify-center gap-2 ${
              showThanks
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-primary-600 hover:bg-primary-700 text-white hover:shadow'
            } ${animating ? 'scale-95 opacity-90' : ''}`}
          >
            <span>{showThanks ? '🕊️' : '🙏'}</span>
            <span>{showThanks ? t('counter.thanks') : t('counter.button')}</span>
          </button>

          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-500">
            <span>{t('counter.title')}:</span>
            <span className="font-bold text-primary-700">{count}</span>
            <span>{t('counter.count', { count: '' }).trim()}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default LordsPrayer;
