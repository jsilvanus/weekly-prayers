import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { useTenant } from '../../context/TenantContext';
import { useSettings } from '../../context/SettingsContext';
import DateRangeCalendar from '../common/DateRangeCalendar';

function PastorPrayerForm() {
  const { t } = useTranslation();
  const { currentTenant, yhtyma, isPartOfYhtyma } = useTenant();
  const { settings } = useSettings();

  const pastorName = settings?.pastor_name || 'Kirkkoherra';
  const pastorTitle = settings?.pastor_title || 'Kirkkoherra';

  const [content, setContent] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [highlightPriority, setHighlightPriority] = useState(0);
  const [portalPosition, setPortalPosition] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [isYhtymaWide, setIsYhtymaWide] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [pastorPrayers, setPastorPrayers] = useState([]);
  const [deletingId, setDeletingId] = useState(null);

  const loadPastorPrayers = async () => {
    try {
      const data = await api.getPrayers();
      if (data?.prayers?.pastor) {
        setPastorPrayers(data.prayers.pastor);
      } else {
        setPastorPrayers([]);
      }
    } catch (e) {
      setPastorPrayers([]);
    }
  };

  useEffect(() => {
    loadPastorPrayers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!content.trim()) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await api.submitPastorPrayer(
        content.trim(),
        startDate || undefined,
        endDate || undefined,
        undefined, // Sinetti/logo määritetään seurakunnan graafisissa asetuksissa
        isYhtymaWide,
        currentTenant?.id,
        highlightPriority
      );
      if (portalPosition && res?.prayer?.id) {
        try {
          await api.updatePrayer(res.prayer.id, { portalPosition });
        } catch (e) {}
      }
      setMessage({ type: 'success', text: 'Kirkkoherran aihe lisätty ja ajoitettu onnistuneesti!' });
      setContent('');
      setStartDate('');
      setEndDate('');
      setHighlightPriority(0);
      setPortalPosition(null);
      setShowCalendar(false);
      setIsYhtymaWide(false);
      await loadPastorPrayers();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePrayer = async (id) => {
    if (!window.confirm('Haluatko varmasti poistaa tämän kirkkoherran rukousaiheen?')) {
      return;
    }

    setDeletingId(id);
    setMessage(null);

    try {
      await api.deletePrayer(id);
      setMessage({ type: 'success', text: 'Kirkkoherran aihe poistettu.' });
      await loadPastorPrayers();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdatePortalPosition = async (id, nextPos) => {
    try {
      await api.updatePrayer(id, { portalPosition: nextPos });
      await loadPastorPrayers();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="font-martti text-xl font-bold text-primary-900">
            {t('admin.pastor.title', 'Kirkkoherran aihe')} — {pastorTitle} {pastorName}
          </h2>
          <p className="text-xs text-gray-500">
            Määritä seurakunnan kirkkoherran rukousaihe. Vain yksi aihe näytetään kerrallaan Z-prioriteetin ja aikavälin mukaan. Sinetti määritetään seurakunnan graafisissa asetuksissa.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {/* Yhtymä-wide toggle */}
        {isPartOfYhtyma && (
          <div className="p-3.5 bg-gradient-to-r from-blue-50/80 to-indigo-50/60 border border-blue-200/80 rounded-xl" data-testid="pastor-yhtyma-wide-toggle">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isYhtymaWide}
                onChange={(e) => setIsYhtymaWide(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                disabled={loading}
              />
              <div>
                <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <span className="text-base">🏛️</span>
                  <span>{t('admin.pastor.yhtymaWide') || 'Yhtymän laajuinen kirkkoherran aihe'}</span>
                </span>
                <p className="text-xs text-slate-600 mt-0.5">
                  {`Aihe näkyy kaikissa ${yhtyma?.name || 'seurakuntayhtymän'} seurakunnissa.`}
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Textarea Header with Character Count moved to top right */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-gray-800 uppercase tracking-wide">
              Kirkkoherran rukousviesti
            </label>
            <span className="text-xs font-mono font-medium text-primary-800 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
              {content.length} / 3000
            </span>
          </div>
          <textarea
            className="textarea h-36 w-full text-sm"
            placeholder="Kirjoita kirkkoherran rukousaihe tai paimenellinen tervehdys tähän..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={3000}
            disabled={loading}
          />
        </div>

        {/* Scheduling & Z-priority controls */}
        <div className="grid gap-4 sm:grid-cols-2 p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/70">
          <div>
            <label className="block text-xs font-semibold text-amber-950 mb-1">
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
            <label className="block text-xs font-semibold text-amber-950 mb-1">
              📅 Voimassaoloaika
            </label>
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-900 font-medium">
                {startDate && endDate
                  ? `${startDate} – ${endDate}`
                  : 'Kuluva viikko (oletus)'}
              </span>
              <button
                type="button"
                onClick={() => setShowCalendar(!showCalendar)}
                className="text-xs text-primary-700 hover:text-primary-900 font-medium underline"
              >
                {showCalendar ? 'Piilota kalenteri' : 'Valitse aikaväli'}
              </button>
            </div>
          </div>

          {showCalendar && (
            <div className="sm:col-span-2 pt-3 border-t border-amber-200/50">
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

        {/* Portal Lift Selector */}
        <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/80 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
              <span>📌</span>
              <span>Näkyvyys etusivun portaalissa (/)</span>
            </span>
            <p className="text-[11px] text-amber-800">
              Nosta kirkkoherran rukousviesti suoraan etusivulle karusellin ylä- tai alapuolelle.
            </p>
          </div>
          <div className="inline-flex items-center gap-1 bg-white p-1 rounded-lg border border-amber-200">
            {[
              { id: null, label: 'Ei nostoa' },
              { id: 'above', label: '⬆️ Karusellin yläpuolella' },
              { id: 'below', label: '⬇️ Karusellin alapuolella' },
            ].map((opt) => (
              <button
                key={String(opt.id)}
                type="button"
                onClick={() => setPortalPosition(opt.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  portalPosition === opt.id
                    ? 'bg-amber-700 text-white shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end pt-1">
          <button
            type="submit"
            className="btn-primary text-sm px-6"
            disabled={loading || !content.trim()}
          >
            {loading ? t('common.loading') : '➕ Tallenna kirkkoherran aihe'}
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

      {/* Active and Scheduled Pastor Prayers list with Delete capability */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="font-martti text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
            <span>📋</span> Ajoitetut ja voimassaolevat kirkkoherran aiheet ({pastorPrayers.length})
          </h3>
          <span className="text-xs text-gray-500">
            Vain korkeimman prioriteetin aktiivinen aihe näytetään kerrallaan
          </span>
        </div>

        {pastorPrayers.length === 0 ? (
          <p className="text-xs text-gray-500 italic py-2">
            Ei tallennettuja kirkkoherran rukousaiheita.
          </p>
        ) : (
          <div className="space-y-3">
            {pastorPrayers.map((prayer, idx) => {
              const isFirst = idx === 0;
              return (
                <div
                  key={prayer.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isFirst
                      ? 'border-amber-300 bg-amber-50/40 shadow-xs'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {isFirst ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-600 text-white">
                          ✓ Näkyvissä nyt
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          Jonossa (#{idx + 1})
                        </span>
                      )}
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
                        Z={prayer.highlightPriority || 0}
                      </span>
                      {prayer.isYhtymaWide && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200">
                          🏛️ Yhtymä
                        </span>
                      )}
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

                  <p className="text-sm text-gray-800 italic bg-white/80 p-3 rounded-lg border border-amber-100/60 leading-relaxed font-aptos">
                    &rdquo;{prayer.content}&rdquo;
                  </p>

                  {/* Quick portal position toggle for existing pastor prayer */}
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 bg-white/90 px-3 py-2 rounded-lg border border-amber-200/60">
                    <span className="text-xs font-semibold text-amber-950 flex items-center gap-1">
                      <span>📌</span>
                      <span>Näkyvyys etusivulla (/):</span>
                    </span>
                    <div className="inline-flex items-center gap-1">
                      {[
                        { id: null, label: 'Ei nostoa' },
                        { id: 'above', label: '⬆️ Yläpuolella' },
                        { id: 'below', label: '⬇️ Alapuolella' },
                      ].map((opt) => {
                        const active = (prayer.portalPosition || null) === opt.id;
                        return (
                          <button
                            key={String(opt.id)}
                            type="button"
                            onClick={() => handleUpdatePortalPosition(prayer.id, opt.id)}
                            className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
                              active
                                ? 'bg-amber-700 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-amber-100/40 flex items-center justify-between text-[11px] text-gray-500">
                    <span>
                      {prayer.authorName ? `👤 Lisännyt: ${prayer.authorName}` : `👤 ${pastorTitle} ${pastorName}`}
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

export default PastorPrayerForm;
