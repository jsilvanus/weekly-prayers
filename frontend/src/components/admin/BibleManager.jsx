import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';

function BibleManager() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettings();

  // Anno API settings state
  const [annoEnabled, setAnnoEnabled] = useState(true);
  const [annoUrl, setAnnoUrl] = useState('http://localhost:3000');
  const [savingSettings, setSavingSettings] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');

  // Overrides list and form state
  const [overrides, setOverrides] = useState([]);
  const [loadingOverrides, setLoadingOverrides] = useState(true);
  const [editingId, setEditingId] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    verse_reference: '',
    verse_text: '',
    meditation: '',
    commentary: '',
    dates: [],
    ranges: [],
    is_active: true
  });

  // Inputs for adding dates/ranges
  const [newSingleDate, setNewSingleDate] = useState('');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (settings) {
      setAnnoEnabled(settings.anno_api_enabled !== 'false' && settings.anno_api_enabled !== false);
      setAnnoUrl(settings.anno_api_url || 'http://localhost:3000');
    }
  }, [settings]);

  useEffect(() => {
    loadOverrides();
  }, []);

  async function loadOverrides() {
    setLoadingOverrides(true);
    try {
      const res = await api.getBibleOverrides();
      setOverrides(res.overrides || []);
    } catch (err) {
      console.error('Failed to load overrides:', err);
    } finally {
      setLoadingOverrides(false);
    }
  }

  // Save Anno API Settings
  async function handleSaveSettings(e) {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsMessage('');
    try {
      await updateSettings({
        anno_api_enabled: String(annoEnabled),
        anno_api_url: annoUrl
      });
      setSettingsMessage('Anno API -asetukset tallennettu onnistuneesti!');
      setTimeout(() => setSettingsMessage(''), 4000);
    } catch (err) {
      setSettingsMessage('Virhe tallennettaessa asetuksia: ' + err.message);
    } finally {
      setSavingSettings(false);
    }
  }

  // Test Anno API Connection
  async function handleTestConnection() {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await api.testAnnoApiStatus(annoUrl);
      setTestResult(res);
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setTestingConnection(false);
    }
  }

  // Add individual date to schedule
  function addSingleDate() {
    if (!newSingleDate) return;
    if (formData.dates.includes(newSingleDate)) return;
    setFormData(prev => ({
      ...prev,
      dates: [...prev.dates, newSingleDate].sort()
    }));
    setNewSingleDate('');
  }

  // Remove individual date
  function removeSingleDate(dateToRemove) {
    setFormData(prev => ({
      ...prev,
      dates: prev.dates.filter(d => d !== dateToRemove)
    }));
  }

  // Add date range to schedule
  function addDateRange() {
    if (!rangeStart || !rangeEnd) return;
    if (rangeStart > rangeEnd) {
      alert('Alkupäivämäärä ei voi olla loppupäivämäärän jälkeen.');
      return;
    }
    setFormData(prev => ({
      ...prev,
      ranges: [...prev.ranges, { startDate: rangeStart, endDate: rangeEnd }]
    }));
    setRangeStart('');
    setRangeEnd('');
  }

  // Remove date range
  function removeDateRange(indexToRemove) {
    setFormData(prev => ({
      ...prev,
      ranges: prev.ranges.filter((_, idx) => idx !== indexToRemove)
    }));
  }

  // Handle Edit Click
  function startEdit(item) {
    setEditingId(item.id);
    const sched = typeof item.schedule === 'string' ? JSON.parse(item.schedule) : (item.schedule || {});
    setFormData({
      title: item.title || '',
      verse_reference: item.verse_reference || '',
      verse_text: item.verse_text || '',
      meditation: item.meditation || '',
      commentary: item.commentary || '',
      dates: Array.isArray(sched.dates) ? sched.dates : [],
      ranges: Array.isArray(sched.ranges) ? sched.ranges : [],
      is_active: item.is_active !== false
    });
    setFormError('');
    setFormSuccess('');
    window.scrollTo({ top: 300, behavior: 'smooth' });
  }

  // Reset form
  function cancelEdit() {
    setEditingId(null);
    setFormData({
      title: '',
      verse_reference: '',
      verse_text: '',
      meditation: '',
      commentary: '',
      dates: [],
      ranges: [],
      is_active: true
    });
    setFormError('');
    setFormSuccess('');
  }

  // Submit manual override
  async function handleSubmitOverride(e) {
    e.preventDefault();
    if (!formData.verse_reference.trim() || !formData.verse_text.trim()) {
      setFormError('Raamatunkohta ja jakeen teksti ovat pakollisia kenttiä.');
      return;
    }

    if (formData.dates.length === 0 && formData.ranges.length === 0) {
      setFormError('Valitse ainakin yksi päivämäärä tai aikaväli, jolloin jae näytetään.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    setFormSuccess('');

    const payload = {
      title: formData.title,
      verse_reference: formData.verse_reference,
      verse_text: formData.verse_text,
      meditation: formData.meditation,
      commentary: formData.commentary,
      schedule: {
        dates: formData.dates,
        ranges: formData.ranges
      },
      is_active: formData.is_active
    };

    try {
      if (editingId) {
        await api.updateBibleOverride(editingId, payload);
        setFormSuccess('Raamattujakeen ohitus päivitetty onnistuneesti!');
      } else {
        await api.createBibleOverride(payload);
        setFormSuccess('Uusi raamattujakeen ohitus lisätty onnistuneesti!');
      }
      cancelEdit();
      await loadOverrides();
    } catch (err) {
      setFormError(err.message || 'Tallennus epäonnistui');
    } finally {
      setSubmitting(false);
    }
  }

  // Delete override
  async function handleDeleteOverride(id) {
    if (!confirm('Haluatko varmasti poistaa tämän raamattujakeen ohituksen?')) return;
    try {
      await api.deleteBibleOverride(id);
      await loadOverrides();
    } catch (err) {
      alert('Poisto epäonnistui: ' + err.message);
    }
  }

  return (
    <div className="space-y-8" data-testid="admin-bible-manager">
      
      {/* SECTION 1: Anno API Settings */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sm:p-7">
        <div className="flex items-center gap-3 border-b border-stone-200 pb-4 mb-5">
          <span className="text-2xl">🌐</span>
          <div>
            <h2 className="font-martti text-xl font-bold text-navy-950">
              Anno API -integraatio (Kirkkovuosi)
            </h2>
            <p className="text-xs text-stone-500">
              Hae automaattisesti kirkkovuoden pyhäpäivät, lektionaari ja hetkirukoukset Anno API -palvelusta.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-5">
          <div className="flex items-center justify-between p-4 rounded-xl bg-stone-50 border border-stone-200">
            <div>
              <span className="font-bold text-sm text-stone-900 block">
                Automaattinen Anno API -haku
              </span>
              <span className="text-xs text-stone-600 block mt-0.5">
                Kun käytössä, päivän tekstit ja hetkirukous haetaan Anno APIsta ellei manuaalista ohitusta ole asetettu.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={annoEnabled}
                onChange={(e) => setAnnoEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-navy-800"></div>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Anno API:n URL-osoite
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={annoUrl}
                onChange={(e) => setAnnoUrl(e.target.value)}
                placeholder="esim. http://localhost:3000 tai https://anno.evl.fi"
                className="flex-1 px-3.5 py-2 rounded-lg border border-stone-300 bg-white text-sm focus:ring-2 focus:ring-navy-800 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-lg border border-stone-300 transition-colors"
              >
                {testingConnection ? 'Testataan...' : 'Testaa yhteys'}
              </button>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Paikallinen tai etäpalvelin (esim. jsilvanus/anno-api).
            </p>
          </div>

          {/* Test Result Message */}
          {testResult && (
            <div className={`p-3.5 rounded-xl text-xs sm:text-sm border ${
              testResult.success
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                : 'bg-red-50 text-red-900 border-red-300'
            }`}>
              {testResult.success ? (
                <div>
                  <span className="font-bold">✓ Yhteys Anno APIin toimii!</span>
                  <span className="block mt-0.5 text-xs text-emerald-800">
                    Pyhäpäivä: {testResult.dayName} &bull; Viive: {testResult.latencyMs} ms
                  </span>
                </div>
              ) : (
                <div>
                  <span className="font-bold">✕ Yhteysvirhe Anno APIin:</span>
                  <span className="block mt-0.5 text-xs text-red-800">
                    {testResult.message} (Käytetään sisäänrakennettua varayhteyttä).
                  </span>
                </div>
              )}
            </div>
          )}

          {settingsMessage && (
            <div className="p-3 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 text-xs font-semibold">
              {settingsMessage}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-5 py-2.5 bg-navy-900 text-white font-semibold text-sm rounded-xl hover:bg-navy-950 transition-colors shadow-sm"
            >
              {savingSettings ? 'Tallennetaan...' : 'Tallenna Anno API -asetukset'}
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: Manual Overrides Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sm:p-7">
        <div className="flex items-center justify-between border-b border-stone-200 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✍️</span>
            <div>
              <h2 className="font-martti text-xl font-bold text-navy-950">
                {editingId ? 'Muokkaa manuaalista raamattujakeen ohitusta' : 'Lisää manuaalinen jae- ja mietiskelyohitus'}
              </h2>
              <p className="text-xs text-stone-500">
                Yksi jae ja mietiskely voi olla ajastettu useille eri päiville ja aikaväleille.
              </p>
            </div>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="text-xs font-semibold text-stone-600 hover:text-stone-900 underline"
            >
              Peruuta muokkaus
            </button>
          )}
        </div>

        <form onSubmit={handleSubmitOverride} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-red-50 text-red-900 border border-red-200 text-xs font-semibold">
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-semibold">
              {formSuccess}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Raamatunkohta *
              </label>
              <input
                type="text"
                value={formData.verse_reference}
                onChange={(e) => setFormData(prev => ({ ...prev, verse_reference: e.target.value }))}
                placeholder="esim. Ps. 23:1–3 tai Joh. 3:16"
                className="w-full px-3.5 py-2 rounded-lg border border-stone-300 bg-white text-sm focus:ring-2 focus:ring-navy-800 focus:outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Otsikko tai teema
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="esim. Herra on minun paimeneni"
                className="w-full px-3.5 py-2 rounded-lg border border-stone-300 bg-white text-sm focus:ring-2 focus:ring-navy-800 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Raamatunjakeen teksti *
            </label>
            <textarea
              rows={3}
              value={formData.verse_text}
              onChange={(e) => setFormData(prev => ({ ...prev, verse_text: e.target.value }))}
              placeholder="Kirjoita tai liitä tähän jakeen raamatunteksti..."
              className="w-full px-3.5 py-2 rounded-lg border border-stone-300 bg-white text-sm focus:ring-2 focus:ring-navy-800 focus:outline-hidden font-serif"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Päivän mietiskely / hengenravinto
            </label>
            <textarea
              rows={2}
              value={formData.meditation}
              onChange={(e) => setFormData(prev => ({ ...prev, meditation: e.target.value }))}
              placeholder="Lyhyt mietiskelyteksti, rukousajatus tai teema..."
              className="w-full px-3.5 py-2 rounded-lg border border-stone-300 bg-white text-sm focus:ring-2 focus:ring-navy-800 focus:outline-hidden"
            />
          </div>

          {/* SCHEDULING BUILDER: Multiple Dates & Ranges */}
          <div className="bg-amber-50/50 p-4 sm:p-5 rounded-2xl border border-amber-200/80 space-y-4">
            <div>
              <span className="font-bold text-sm text-amber-950 block">
                📅 Ajastus eri päiville ja aikaväleille
              </span>
              <span className="text-xs text-amber-800 block mt-0.5">
                Voit määritellä tälle jakeelle useita yksittäisiä päiviä sekä useita aikavälejä.
              </span>
            </div>

            {/* 1. Add Single Date */}
            <div className="flex flex-wrap items-end gap-2 pt-1 border-t border-amber-200/60">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                  Lisää yksittäinen päivä
                </label>
                <input
                  type="date"
                  value={newSingleDate}
                  onChange={(e) => setNewSingleDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-amber-300 bg-white text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>
              <button
                type="button"
                onClick={addSingleDate}
                className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                + Lisää päivä
              </button>
            </div>

            {/* Single Dates Pills */}
            {formData.dates.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs text-amber-900 font-semibold self-center mr-1">
                  Valitut päivät:
                </span>
                {formData.dates.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-white text-amber-900 border border-amber-300 shadow-2xs"
                  >
                    <span>{d}</span>
                    <button
                      type="button"
                      onClick={() => removeSingleDate(d)}
                      className="text-amber-600 hover:text-red-700 font-bold"
                      title="Poista päivä"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* 2. Add Date Range */}
            <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-amber-200/60">
              <div className="flex-1 min-w-[140px]">
                <label className="block text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                  Aikaväli alkaa
                </label>
                <input
                  type="date"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-amber-300 bg-white text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="block text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                  Aikaväli päättyy
                </label>
                <input
                  type="date"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-amber-300 bg-white text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>
              <button
                type="button"
                onClick={addDateRange}
                className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                + Lisää aikaväli
              </button>
            </div>

            {/* Ranges Cards */}
            {formData.ranges.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs text-amber-900 font-semibold block">
                  Valitut aikavälit:
                </span>
                <div className="flex flex-wrap gap-2">
                  {formData.ranges.map((r, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs bg-white text-amber-950 border border-amber-300 shadow-2xs font-medium"
                    >
                      <span>🗓️ {r.startDate} &rarr; {r.endDate}</span>
                      <button
                        type="button"
                        onClick={() => removeDateRange(idx)}
                        className="text-amber-600 hover:text-red-700 font-bold ml-1"
                        title="Poista aikaväli"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="rounded border-stone-300 text-navy-800 focus:ring-navy-800"
              />
              <span>Aktiivinen ohitus</span>
            </label>

            <div className="flex gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-2 border border-stone-300 text-stone-700 text-xs font-semibold rounded-xl hover:bg-stone-50 transition-colors"
                >
                  Peruuta
                </button>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-amber-800 text-white font-semibold text-sm rounded-xl hover:bg-amber-900 transition-colors shadow-sm"
              >
                {submitting ? 'Tallennetaan...' : (editingId ? 'Päivitä ohitus' : 'Tallenna uusi ohitus')}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* SECTION 3: List of Scheduled Overrides */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sm:p-7">
        <h3 className="font-martti text-xl font-bold text-navy-950 mb-3">
          Tallennetut raamattujakeiden ohitukset ({overrides.length})
        </h3>

        {loadingOverrides ? (
          <div className="p-8 text-center text-stone-500 text-sm">
            Ladataan ohituksia...
          </div>
        ) : overrides.length === 0 ? (
          <div className="p-8 text-center text-stone-500 italic text-sm">
            Ei vielä manuaalisia raamattujakeiden ohituksia. Lisää yllä olevalla lomakkeella.
          </div>
        ) : (
          <div className="space-y-3.5">
            {overrides.map((item) => {
              const sched = typeof item.schedule === 'string' ? JSON.parse(item.schedule) : (item.schedule || {});
              const dates = sched.dates || [];
              const ranges = sched.ranges || [];

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-stone-200 hover:border-stone-300 bg-stone-50/50 transition-all space-y-2.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-navy-950">
                          {item.verse_reference}
                        </span>
                        {item.title && (
                          <span className="text-xs font-semibold text-stone-600">
                            &bull; {item.title}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                        }`}>
                          {item.is_active ? 'Aktiivinen' : 'Passiivinen'}
                        </span>
                      </div>
                      <p className="text-xs font-serif text-stone-800 italic mt-1 line-clamp-2">
                        &rdquo;{item.verse_text}&rdquo;
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="px-2.5 py-1 text-xs font-medium text-navy-800 bg-white border border-stone-300 rounded-md hover:bg-stone-100"
                      >
                        Muokkaa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteOverride(item.id)}
                        className="px-2.5 py-1 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-md hover:bg-red-50"
                      >
                        Poista
                      </button>
                    </div>
                  </div>

                  {/* Scheduled Dates Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-stone-600">
                    <span className="font-semibold text-stone-500">Ajastus:</span>
                    {dates.map((d) => (
                      <span key={d} className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md text-[11px] font-medium">
                        {d}
                      </span>
                    ))}
                    {ranges.map((r, i) => (
                      <span key={i} className="bg-orange-100 text-orange-950 px-2 py-0.5 rounded-md text-[11px] font-medium">
                        {r.startDate} &rarr; {r.endDate}
                      </span>
                    ))}
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

export default BibleManager;
