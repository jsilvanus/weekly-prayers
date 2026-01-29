import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePrayerCount } from '../../hooks/usePrayerCount';

function PrayerCounter({ week, year }) {
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
      }, 2000);
    } else {
      setAnimating(false);
    }
  };

  return (
    <div className="card text-center">
      <h3 className="text-lg font-semibold text-primary-800 mb-4">
        {t('counter.title')}
      </h3>

      <div className="mb-4">
        <span className="text-4xl font-bold text-primary-600">{count}</span>
        <p className="text-gray-600 mt-1">
          {t('counter.count', { count })}
        </p>
      </div>

      <button
        onClick={handleClick}
        disabled={animating}
        className={`btn-primary w-full transition-all ${
          animating ? 'scale-95 opacity-75' : ''
        }`}
      >
        {showThanks ? t('counter.thanks') : t('counter.button')}
      </button>
    </div>
  );
}

export default PrayerCounter;
