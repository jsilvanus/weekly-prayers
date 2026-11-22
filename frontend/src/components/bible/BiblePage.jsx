import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useTenant } from '../../context/TenantContext';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import LandingHero from '../common/LandingHero';
import DailyVerseModal from './DailyVerseModal';
import LoadingSpinner from '../common/LoadingSpinner';

const liturgicalColorsMap = {
  vihreä: { bg: 'bg-emerald-100', text: 'text-emerald-900', border: 'border-emerald-300', dot: 'bg-emerald-600', name: 'Vihreä' },
  valkoinen: { bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200', dot: 'bg-amber-400', name: 'Valkoinen' },
  violetti: { bg: 'bg-purple-100', text: 'text-purple-900', border: 'border-purple-300', dot: 'bg-purple-600', name: 'Violetti' },
  punainen: { bg: 'bg-red-100', text: 'text-red-900', border: 'border-red-300', dot: 'bg-red-600', name: 'Punainen' },
  musta: { bg: 'bg-stone-200', text: 'text-stone-900', border: 'border-stone-400', dot: 'bg-stone-800', name: 'Musta' },
  sininen: { bg: 'bg-blue-100', text: 'text-blue-900', border: 'border-blue-300', dot: 'bg-blue-600', name: 'Sininen' }
};

function BiblePage() {
  const { t } = useTranslation();
  const { isModuleEnabled } = useTenant();
  const { getModuleTitle } = useSettings();
  const { user, isWorkerOrAbove } = useAuth();
  const canSeeDisabled = isWorkerOrAbove || user?.role === 'admin';
  const isEnabled = isModuleEnabled('bible');

  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const [bibleData, setBibleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isVerseModalOpen, setIsVerseModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function fetchDateData() {
      setLoading(true);
      try {
        const data = await api.getBibleToday(selectedDate);
        if (mounted) {
          setBibleData(data);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) setLoading(false);
      }
    }
    fetchDateData();
    return () => { mounted = false; };
  }, [selectedDate]);

  const currentColorKey = bibleData?.liturgicalInfo?.color?.color || 'vihreä';
  const colorTheme = liturgicalColorsMap[currentColorKey] || liturgicalColorsMap.vihreä;

  // Extract readings from lectionary
  const morningReadings = bibleData?.liturgyOfTheHours?.morning?.readings || [];
  const noonReadings = bibleData?.liturgyOfTheHours?.noon?.readings || [];
  const eveningReadings = bibleData?.liturgyOfTheHours?.evening?.readings || [];
  const psalms = [
    ...(bibleData?.liturgyOfTheHours?.morning?.psalms || []),
    ...(bibleData?.liturgyOfTheHours?.noon?.psalms || []),
  ];

  if (!isEnabled && !canSeeDisabled) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="text-4xl">📖</div>
        <h2 className="font-martti text-2xl font-bold text-stone-900">
          {getModuleTitle ? getModuleTitle('bible', 'Raamattu & Sana') : 'Raamattu & Sana'} ei ole käytössä
        </h2>
        <p className="text-sm text-stone-600">
          Tämä osio ei ole tällä hetkellä aktivoitu seurakunnan sivustolla.
        </p>
        <Link to="/" className="inline-flex items-center gap-2 btn-primary text-xs py-2 px-4 rounded-full">
          &larr; Siirry esirukouksiin
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8" data-testid="bible-page">
      {!isEnabled && canSeeDisabled && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 px-4 py-2.5 rounded-2xl text-xs sm:text-sm flex items-center gap-2 font-medium">
          <span>⚠️</span>
          <span>Raamattu & Sana on poissa käytöstä julkisilta kävijöiltä. Ylläpitäjänä ja työntekijänä näet sivun normaalisti.</span>
        </div>
      )}

      {/* Unified Landing Hero */}
      <LandingHero
        currentModule="bible"
        title={getModuleTitle ? getModuleTitle('bible', 'Raamattu & Sana') : 'Raamattu & Sana'}
        subtitle="Kirkkovuoden pyhät tekstit, päivän lukukappaleet ja mietiskely"
        primaryAction={{
          label: 'Näytä päivän sana',
          icon: '📜',
          onClick: () => setIsVerseModalOpen(true),
          className: 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white',
        }}
      />

      {loading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          {/* Liturgical Day Header Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 pb-5">
              <div>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <span className="text-2xl">📖</span>
                  <h2 className="font-martti text-2xl sm:text-3xl font-bold text-stone-900">
                    {bibleData?.liturgicalInfo?.dayName || 'Kirkkovuosi'}
                  </h2>
                </div>
                {bibleData?.liturgicalInfo?.theme && (
                  <p className="text-base text-stone-700 font-serif italic">
                    Aihe: &rdquo;{bibleData.liturgicalInfo.theme}&rdquo;
                  </p>
                )}
                <p className="text-xs text-stone-500 font-medium mt-1">
                  {bibleData?.liturgicalInfo?.season || 'Evankelis-luterilainen kirkkovuosi'} &bull; Päivä: {selectedDate}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                {/* Liturgical Color Pill */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${colorTheme.bg} ${colorTheme.border} ${colorTheme.text}`}>
                  <span className={`w-3 h-3 rounded-full ${colorTheme.dot}`} />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Liturginen väri: {colorTheme.name}
                  </span>
                </div>

                {/* Date Selector */}
                <div className="flex items-center gap-1.5">
                  <label htmlFor="bible-date" className="text-xs font-semibold text-stone-600">
                    Päivä:
                  </label>
                  <input
                    id="bible-date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg border border-stone-300 bg-white text-stone-900 focus:ring-2 focus:ring-amber-600 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Daily Verse Highlight Card */}
            {bibleData?.dailyVerse && (
              <div className="mt-6 bg-gradient-to-r from-amber-50/90 to-orange-50/70 border border-amber-200/90 rounded-2xl p-5 sm:p-6">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs uppercase tracking-wider font-bold text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-300/60">
                    {bibleData.dailyVerse.isManual ? '⭐ Seurakunnan valitsema jae' : '🕊️ Päivän sana'}
                  </span>
                  <span className="font-martti text-sm font-bold text-amber-900">
                    {bibleData.dailyVerse.reference}
                  </span>
                </div>

                <blockquote className="text-stone-950 font-serif text-lg italic leading-relaxed pl-3 sm:pl-4 border-l-4 border-amber-500 my-3 whitespace-pre-wrap">
                  &rdquo;{bibleData.dailyVerse.text}&rdquo;
                </blockquote>

                {bibleData.dailyVerse.meditation && (
                  <div className="bg-white/90 border border-amber-200/70 rounded-xl p-3.5 text-sm text-stone-800 leading-relaxed mt-3">
                    <p className="font-bold text-xs text-amber-900 uppercase tracking-wider mb-1">
                      Mietiskely
                    </p>
                    <p>{bibleData.dailyVerse.meditation}</p>
                  </div>
                )}
              </div>
            )}

            {/* Lectionary Readings Section */}
            <div className="mt-8 space-y-6">
              <div className="border-b border-stone-200 pb-2">
                <h3 className="font-martti text-lg font-bold text-stone-900 flex items-center gap-2">
                  <span>📜</span>
                  <span>Kirkkovuoden päivittäiset lukukappaleet ja psalmit</span>
                </h3>
                <p className="text-xs text-stone-500">
                  Suomen evankelis-luterilaisen kirkon viikkolektionaari &bull; Lähde: Evankeliumikirja & Anno API
                </p>
              </div>

              {/* Psalms */}
              {psalms.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-2">
                    <span>🕊️</span>
                    <span>Päivän psalmi</span>
                  </h4>
                  {psalms.map((p, idx) => (
                    <div key={idx} className="bg-stone-50 border border-stone-200 rounded-xl p-4 sm:p-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-martti font-bold text-sm text-stone-900">{p.reference}</span>
                        <span className="text-xs text-stone-500 italic">Psalmit</span>
                      </div>
                      <p className="text-stone-800 font-serif text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                        {p.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Scripture Readings */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-2">
                  <span>📖</span>
                  <span>Raamatunluku</span>
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[...morningReadings, ...noonReadings, ...eveningReadings].slice(0, 4).map((reading, idx) => (
                    <div key={idx} className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-martti font-bold text-sm text-amber-950">{reading.reference}</span>
                        <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                          Teksti {idx + 1}
                        </span>
                      </div>
                      <p className="text-stone-700 text-sm leading-relaxed italic">
                        &rdquo;{reading.text}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Dialog for Daily Verse */}
      <DailyVerseModal
        isOpen={isVerseModalOpen}
        onClose={() => setIsVerseModalOpen(false)}
        dailyVerse={bibleData?.dailyVerse}
        liturgicalInfo={bibleData?.liturgicalInfo}
      />
    </div>
  );
}

export default BiblePage;
