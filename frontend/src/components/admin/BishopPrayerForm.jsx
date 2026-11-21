import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import DateRangeCalendar from '../common/DateRangeCalendar';

function BishopPrayerForm() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const bishopName = settings?.bishop_name || 'Matti Repo';
  const bishopDiocese = settings?.bishop_diocese || 'Tampereen hiippakunta';

  const [content, setContent] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [highlightPriority, setHighlightPriority] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [bishopPrayers, setBishopPrayers] = useState([]);
  const [deletingId, setDeletingId] = useState(null);

  const loadBishopPrayers = async () => {
    try {
      const data = await api.getPrayers();
      if (data?.prayers?.bishop) {
        setBishopPrayers(data.prayers.bishop);
      } else {
        setBishopPrayers([]);
      }
    } catch (e) {
      setBishopPrayers([]);
    }
  };

  useEffect(() => {
    loadBishopPrayers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!content.trim()) return;

    setLoading(true);
    setMessage(null);

    try {
      await api.submitBishopPrayer(
        content.trim(),
        startDate || undefined,
        endDate || undefined,
        undefined, // Crest logo is set at parish settings
        false,
        undefined,
        highlightPriority
      );
      setMessage({ type: 'success', text: t('admin.bishop.success', 'Piispan rukousaihe lisätty onnistuneesti!') });
      setContent('');
      setStartDate('');
      setEndDate('');
      setHighlightPriority(0);
      setShowCalendar(false);
      await loadBishopPrayers();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePrayer = async (id) => {
    if (!window.confirm('Haluatko varmasti poistaa tämän piispan rukousaiheen?')) {
      return;
    }

    setDeletingId(id);
    setMessage(null);

    try {
      await api.deletePrayer(id);
      setMessage({ type: 'success', text: 'Piispan rukousaihe poistettu.' });
      await loadBishopPrayers();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">☩</span>
        <div>
          <h2 className="font-martti text-xl font-bold text-purple-900">
            {t('admin.bishop.title', 'Piispan aihe')} — Piispa {bishopName}
          </h2>
          <p className="text-xs text-gray-500">
            {bishopDiocese} — Valinnainen piispan esirukousaihe. Vain yksi aihe näytetään kerrallaan Z-prioriteetin ja aikavälin mukaan. Vaakuna määritetään seurakunnan graafisissa asetuksissa.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card border-purple-200 space-y-4">
        {/* Textarea Header with Character Count moved to top right */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-purple-950 uppercase tracking-wide">
              Piispan esirukousviesti
            </label>
            <span className="text-xs font-mono font-medium text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              {content.length} / 3000
            </span>
          </div>
          <textarea
            className="textarea h-36 border-purple-200 focus:border-purple-500 w-full text-sm"
            placeholder={t('admin.bishop.placeholder', 'Kirjoita piispan rukousaihe tai hiippakunnallinen viesti...')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={3000}
            disabled={loading}
          />
        </div>

        {/* Scheduling & Z-priority controls */}
        <div className="grid gap-4 sm:grid-cols-2 p-3.5 bg-purple-50/50 rounded-xl border border-purple-200/70">
          <div>
            <label className="block text-xs font-semibold text-purple-950 mb-1">
              ⚡ Z-prioriteetti (Z-arvo)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                value={highlightPriority}
                onChange={(e) => setHighlightPriority(parseInt(e.target.value, 10) || 0)}
                className="input py-1 px-3 text-xs w-24 font-mono font-semibold"
                disabled={loading}
              />
              <span className="text-[11px] text-gray-500">
                (Korkeampi Z-arvo ohittaa alemmat; oletus: 0)
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-purple-950 mb-1">
              📅 Voimassaoloaika
            </label>
            <div className="flex items-center justify-between">
              <span className="text-xs text-purple-900 font-medium">
                {startDate && endDate
                  ? `${startDate} – ${endDate}`
                  : 'Kuluva viikko (oletus)'}
              </span>
              <button
                type="button"
                onClick={() => setShowCalendar(!showCalendar)}
                className="text-xs text-purple-700 hover:text-purple-900 font-medium underline"
              >
                {showCalendar ? 'Piilota kalenteri' : 'Valitse aikaväli'}
              </button>
            </div>
          </div>

          {showCalendar && (
            <div className="sm:col-span-2 pt-3 border-t border-purple-200/50">
              <DateRangeCalendar
                startDate={startDate}
                endDate={endDate}
                onChange={({ startDate: s, endDate: e }) => {
                  setStartDate(s);
                  setEndDate(e);
                }}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end pt-1">
          <button
            type="submit"
            className="btn bg-purple-700 hover:bg-purple-800 text-white text-sm px-6"
            disabled={loading || !content.trim()}
          >
            {loading ? t('common.loading') : '➕ Tallenna piispan aihe'}
          </button>
        </div>

        {message && (
          <div
            className={`p-3 rounded-lg text-xs ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}
      </form>

      {/* Active and Scheduled Bishop Prayers list with Delete capability */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="font-martti text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
            <span>📋</span> Ajoitetut ja voimassaolevat piispan aiheet ({bishopPrayers.length})
          </h3>
          <span className="text-xs text-gray-500">
            Vain korkeimman prioriteetin aktiivinen aihe näytetään kerrallaan
          </span>
        </div>

        {bishopPrayers.length === 0 ? (
          <p className="text-xs text-gray-500 italic py-2">
            Ei tallennettuja piispan rukousaiheita.
          </p>
        ) : (
          <div className="space-y-3">
            {bishopPrayers.map((prayer, idx) => {
              const isFirst = idx === 0;
              return (
                <div
                  key={prayer.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isFirst
                      ? 'border-purple-300 bg-purple-50/40 shadow-xs'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {isFirst ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-700 text-white">
                          ✓ Näkyvissä nyt
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          Jonossa (#{idx + 1})
                        </span>
                      )}
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-purple-100 text-purple-900">
                        Z={prayer.highlightPriority || 0}
                      </span>
                      <span className="text-xs text-gray-600">
                        📅 {prayer.startDate && prayer.endDate ? `${prayer.startDate} – ${prayer.endDate}` : 'Kuluva viikko'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeletePrayer(prayer.id)}
                      disabled={deletingId === prayer.id}
                      className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-2.5 py-1 rounded transition-colors"
                      title="Poista aihe"
                    >
                      {deletingId === prayer.id ? 'Poistetaan...' : '🗑️ Poista aihe'}
                    </button>
                  </div>

                  <p className="text-sm text-gray-800 italic bg-white/80 p-3 rounded-lg border border-purple-100/60 leading-relaxed">
                    &rdquo;{prayer.content}&rdquo;
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-purple-100/40 flex items-center justify-between text-[11px] text-gray-500">
                    <span>
                      {prayer.authorName ? `👤 Lisännyt: ${prayer.authorName}` : '👤 Piispa / Ylläpitäjä'}
                    </span>
                    <span>
                      {prayer.createdAt && `Luotu: ${new Date(prayer.createdAt).toLocaleDateString('fi-FI')}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default BishopPrayerForm;
