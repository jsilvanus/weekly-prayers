import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';

function BiblePage() {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const [bibleData, setBibleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('hours'); // 'hours' | 'verse'
  const [selectedHour, setSelectedHour] = useState('morning');

  useEffect(() => {
    let mounted = true;
    async function fetchDateData() {
      setLoading(true);
      try {
        const data = await api.getBibleToday(selectedDate);
        if (mounted) {
          setBibleData(data);
          if (data.nearestHourKey) {
            setSelectedHour(data.nearestHourKey);
          }
          setLoading(false);
        }
      } catch (err) {
        if (mounted) setLoading(false);
      }
    }
    fetchDateData();
    return () => { mounted = false; };
  }, [selectedDate]);

  const liturgicalColorsMap = {
    vihreä: { bg: 'bg-emerald-100', text: 'text-emerald-900', border: 'border-emerald-300', dot: 'bg-emerald-600', name: 'Vihreä' },
    valkoinen: { bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200', dot: 'bg-amber-400', name: 'Valkoinen' },
    violetti: { bg: 'bg-purple-100', text: 'text-purple-900', border: 'border-purple-300', dot: 'bg-purple-600', name: 'Violetti' },
    punainen: { bg: 'bg-red-100', text: 'text-red-900', border: 'border-red-300', dot: 'bg-red-600', name: 'Punainen' },
    musta: { bg: 'bg-stone-200', text: 'text-stone-900', border: 'border-stone-400', dot: 'bg-stone-800', name: 'Musta' },
    sininen: { bg: 'bg-blue-100', text: 'text-blue-900', border: 'border-blue-300', dot: 'bg-blue-600', name: 'Sininen' }
  };

  const currentColorKey = bibleData?.liturgicalInfo?.color?.color || 'vihreä';
  const colorTheme = liturgicalColorsMap[currentColorKey] || liturgicalColorsMap.vihreä;

  const hoursList = [
    { key: 'morning', icon: '🌅', label: 'Aamurukous', latin: 'Laudes', slot: '06:00 – 10:00' },
    { key: 'noon', icon: '☀️', label: 'Päivärukous', latin: 'Seksti', slot: '11:00 – 16:00' },
    { key: 'evening', icon: '🌇', label: 'Iltarukous', latin: 'Vesper', slot: '17:00 – 20:00' },
    { key: 'night', icon: '🌙', label: 'Yörukous', latin: 'Kompletorio', slot: '21:00 – 05:00' }
  ];

  const currentHourData = bibleData?.liturgyOfTheHours?.[selectedHour];

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="bible-page">
      
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between gap-3 text-sm">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-navy-800 hover:text-navy-950 font-medium hover:underline"
        >
          <span>&larr;</span>
          <span>Takaisin viikon rukouksiin</span>
        </Link>

        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="bible-date" className="text-xs font-semibold text-stone-600">
            Päivämäärä:
          </label>
          <input
            id="bible-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1 text-xs sm:text-sm font-medium rounded-lg border border-stone-300 bg-white text-stone-900 focus:ring-2 focus:ring-navy-600 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Liturgical Day Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 pb-5">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-2xl">📖</span>
              <h1 className="font-martti text-2xl sm:text-3xl font-bold text-navy-950">
                {bibleData?.liturgicalInfo?.dayName || 'Raamattu & Hetkirukoukset'}
              </h1>
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

          {/* Liturgical Color Pill */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${colorTheme.bg} ${colorTheme.border} ${colorTheme.text}`}>
            <span className={`w-3 h-3 rounded-full ${colorTheme.dot}`}></span>
            <span className="text-xs font-bold uppercase tracking-wider">
              Liturginen väri: {colorTheme.name}
            </span>
          </div>
        </div>

        {/* Main Tab Controls */}
        <div className="flex border-b border-stone-200 mt-5 space-x-6">
          <button
            type="button"
            onClick={() => setActiveTab('hours')}
            className={`pb-3 font-semibold text-sm sm:text-base border-b-2 transition-colors inline-flex items-center gap-2 ${
              activeTab === 'hours'
                ? 'border-navy-800 text-navy-950 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <span>🕊️</span>
            <span>Hetkirukoukset (Liturgy of the Hours)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('verse')}
            className={`pb-3 font-semibold text-sm sm:text-base border-b-2 transition-colors inline-flex items-center gap-2 ${
              activeTab === 'verse'
                ? 'border-navy-800 text-navy-950 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <span>📜</span>
            <span>Päivän sana & mietiskely</span>
          </button>
        </div>

        {/* TAB 1: LITURGY OF THE HOURS */}
        {activeTab === 'hours' && (
          <div className="pt-6 space-y-6">
            
            {/* Hour Selector Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {hoursList.map((h) => {
                const isSelected = selectedHour === h.key;
                const isNearest = bibleData?.nearestHourKey === h.key;
                return (
                  <button
                    key={h.key}
                    type="button"
                    onClick={() => setSelectedHour(h.key)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-navy-800 bg-navy-900 text-white shadow-sm ring-2 ring-navy-800/30'
                        : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-lg">{h.icon}</span>
                      {isNearest && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          isSelected ? 'bg-amber-400 text-stone-950' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        }`}>
                          Nyt
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-sm leading-tight">{h.label}</div>
                    <div className={`text-xs ${isSelected ? 'text-navy-200' : 'text-stone-500'}`}>
                      {h.latin} &bull; {h.slot}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Hour Details */}
            {currentHourData ? (
              <div className="bg-stone-50/80 border border-stone-200 rounded-2xl p-6 space-y-6">
                
                {/* Hour Header */}
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                  <div>
                    <h2 className="font-martti text-xl font-bold text-navy-950">
                      {currentHourData.name}
                    </h2>
                    <p className="text-xs text-stone-600 font-medium">
                      Suomen evankelis-luterilaisen kirkon viikkolektionaari
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-stone-200 text-stone-800 rounded-md">
                    {currentHourData.timeSlot}
                  </span>
                </div>

                {/* Opening Versicle */}
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200/70 text-xs sm:text-sm text-amber-950 space-y-1">
                  <p className="font-semibold text-amber-900 uppercase tracking-wider text-[11px]">
                    Johdantolause
                  </p>
                  <p><strong>V:</strong> Herra, avaa minun huuleni.</p>
                  <p><strong>Vast:</strong> Niin suuni julistaa sinun kiitostasi.</p>
                  {currentHourData.antiphon && (
                    <p className="pt-2 text-stone-700 italic border-t border-amber-200/50">
                      <strong>Antifoni:</strong> {currentHourData.antiphon}
                    </p>
                  )}
                </div>

                {/* Psalms */}
                {currentHourData.psalms && currentHourData.psalms.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-martti text-lg font-bold text-navy-950">
                        Hetken psalmi
                      </h3>
                      <span className="text-sm font-semibold text-navy-800">
                        {currentHourData.psalms[0].reference}
                      </span>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-stone-200 font-serif leading-relaxed text-stone-900 whitespace-pre-wrap text-base sm:text-lg">
                      {currentHourData.psalms[0].text}
                    </div>
                    <p className="text-xs text-stone-500 italic pl-2">
                      Kunnia Isälle ja Pojalle ja Pyhälle Hengelle, niin kuin oli alussa, nyt on ja aina, iankaikkisesta iankaikkiseen. Aamen.
                    </p>
                  </div>
                )}

                {/* Scripture Reading */}
                {currentHourData.readings && currentHourData.readings.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-martti text-lg font-bold text-navy-950">
                        Raamatunluku
                      </h3>
                      <span className="text-sm font-semibold text-navy-800">
                        {currentHourData.readings[0].reference}
                      </span>
                    </div>
                    <div className="bg-white/90 p-4 rounded-xl border border-stone-200 text-stone-800 italic leading-relaxed text-sm sm:text-base">
                      &rdquo;{currentHourData.readings[0].text}&rdquo;
                    </div>
                  </div>
                )}

                {/* Collect Prayer */}
                {currentHourData.prayer && (
                  <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-1">
                    <h3 className="font-martti text-base font-bold text-navy-950">
                      Päivän rukous
                    </h3>
                    <p className="text-sm text-stone-800 leading-relaxed font-serif">
                      {currentHourData.prayer}
                    </p>
                  </div>
                )}

                {/* Lord's Prayer & Blessing */}
                <div className="text-xs text-stone-600 space-y-1 pt-2 border-t border-stone-200">
                  <p><strong>Isä meidän</strong>, joka olet taivaissa...</p>
                  <p>Siunatkoon meitä kaikkivaltias ja armollinen Jumala, Isä ja Poika ja Pyhä Henki. Aamen.</p>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-stone-500 italic">
                Ei hetkirukouksen aineistoa valitulle tunnille.
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DAILY VERSE & MEDITATION */}
        {activeTab === 'verse' && (
          <div className="pt-6 space-y-6">
            {bibleData?.dailyVerse ? (
              <div className="space-y-6">
                
                {/* Verse Card */}
                <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-6 sm:p-8">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <span className="text-xs uppercase tracking-wider font-bold text-amber-900 bg-amber-200/60 px-3 py-1 rounded-full">
                      {bibleData.dailyVerse.isManual ? '⭐ Seurakunnan valitsema jae' : '🕊️ Päivän sana'}
                    </span>
                    <span className="font-martti text-base font-bold text-amber-950">
                      {bibleData.dailyVerse.reference}
                    </span>
                  </div>

                  <blockquote className="text-gray-900 font-serif text-lg sm:text-xl italic leading-relaxed pl-4 border-l-4 border-amber-600 mb-6 whitespace-pre-wrap">
                    &rdquo;{bibleData.dailyVerse.text}&rdquo;
                  </blockquote>

                  {/* Meditation */}
                  {bibleData.dailyVerse.meditation && (
                    <div className="bg-white rounded-xl p-5 border border-amber-200/70 shadow-xs space-y-2">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-amber-800">
                        Päivän mietiskely
                      </h4>
                      <p className="text-stone-800 text-sm sm:text-base leading-relaxed">
                        {bibleData.dailyVerse.meditation}
                      </p>
                    </div>
                  )}

                  {/* Commentary */}
                  {bibleData.dailyVerse.commentary && (
                    <div className="mt-4 p-4 bg-amber-100/40 rounded-xl border border-amber-200/60 text-xs sm:text-sm text-stone-700">
                      <strong>Kommentti:</strong> {bibleData.dailyVerse.commentary}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 flex items-center justify-between">
                  <span>Lähde: {bibleData.dailyVerse.isManual ? 'Seurakunnan manuaalinen asetus' : 'Kirkkovuosikalenteri / Anno API'}</span>
                  <span>Evankelis-luterilainen kirkko</span>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-stone-500 italic">
                Ei jaetta tälle päivälle.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default BiblePage;
