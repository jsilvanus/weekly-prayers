import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { withBasePath } from '../../services/api';
import { useTenant } from '../../context/TenantContext';
import LoadingSpinner from '../common/LoadingSpinner';

const COLOR_DOTS = {
  vihreä: 'bg-emerald-600',
  valkoinen: 'bg-amber-400 ring-1 ring-amber-600',
  violetti: 'bg-purple-600',
  punainen: 'bg-red-600',
  musta: 'bg-stone-900',
  sininen: 'bg-blue-600'
};

function getUpcomingSundayStr() {
  const d = new Date();
  const day = d.getDay();
  if (day !== 0) {
    d.setDate(d.getDate() + (7 - day));
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dt = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dt}`;
}

async function apiRequest(endpoint, options = {}) {
  const token = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('token') : null;
  const res = await fetch(withBasePath(endpoint), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || 'Pyyntö epäonnistui');
  }
  return data;
}

export default function PyhapaivaManager() {
  const [searchParams] = useSearchParams();
  const { currentTenant } = useTenant();

  const [selectedDate, setSelectedDate] = useState(() => {
    return searchParams.get('date') || getUpcomingSundayStr();
  });

  const [calendarDays, setCalendarDays] = useState([]);
  const [dayData, setDayData] = useState(null);
  const [savedOverrides, setSavedOverrides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const [formData, setFormData] = useState({
    custom_heading: '',
    custom_description: '',
    pastoral_reflection: '',
    custom_collect: '',
    portal_position: 'none', // 'none' | 'above' | 'below'
    service_time: '',
    service_location: '',
    service_liturgist: '',
    service_preacher: '',
    service_cantor: '',
    custom_hymns: []
  });

  const [newHymnRole, setNewHymnRole] = useState('Alkuvirsi');
  const [newHymnNumber, setNewHymnNumber] = useState('');
  const [newHymnTitle, setNewHymnTitle] = useState('');

  const tenantSlug = currentTenant?.slug || '';

  // Load calendar & existing overrides list
  const loadCalendarAndOverrides = async () => {
    try {
      const qs = tenantSlug ? `?tenant=${encodeURIComponent(tenantSlug)}` : '';
      const [calRes, ovRes] = await Promise.all([
        apiRequest(`/api/pyhapaiva/calendar?days=120${tenantSlug ? `&tenant=${encodeURIComponent(tenantSlug)}` : ''}`),
        apiRequest(`/api/pyhapaiva/overrides${qs}`).catch(() => ({ overrides: [] }))
      ]);
      if (Array.isArray(calRes?.holyDays)) {
        setCalendarDays(calRes.holyDays);
      }
      if (Array.isArray(ovRes?.overrides)) {
        setSavedOverrides(ovRes.overrides);
      }
    } catch (e) {
      // Ignore calendar error
    }
  };

  useEffect(() => {
    loadCalendarAndOverrides();
  }, [tenantSlug]);

  // Load selected holy day details and populate form
  useEffect(() => {
    let mounted = true;
    async function loadSelectedDay() {
      setLoading(true);
      setStatusMsg(null);
      try {
        const params = new URLSearchParams();
        if (selectedDate) params.set('date', selectedDate);
        if (tenantSlug) params.set('tenant', tenantSlug);
        const data = await apiRequest(`/api/pyhapaiva/day?${params.toString()}`);
        if (!mounted) return;
        setDayData(data);

        const ov = data.override || {};
        const sInfo = ov.service_info || data.serviceInfo || {};
        setFormData({
          custom_heading: ov.custom_heading || '',
          custom_description: ov.custom_description || '',
          pastoral_reflection: ov.pastoral_reflection || '',
          custom_collect: ov.custom_collect || '',
          portal_position: ov.portal_position || 'none',
          service_time: sInfo.time || '',
          service_location: sInfo.location || '',
          service_liturgist: sInfo.liturgist || '',
          service_preacher: sInfo.preacher || '',
          service_cantor: sInfo.cantor || '',
          custom_hymns: Array.isArray(ov.custom_hymns) ? ov.custom_hymns : []
        });
      } catch (err) {
        if (mounted) {
          setStatusMsg({ type: 'error', text: err.message });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadSelectedDay();
    return () => { mounted = false; };
  }, [selectedDate, tenantSlug]);

  const handleAddHymn = () => {
    if (!newHymnNumber.trim()) return;
    setFormData((prev) => ({
      ...prev,
      custom_hymns: [
        ...prev.custom_hymns,
        {
          role: newHymnRole.trim() || 'Virsi',
          number: newHymnNumber.trim(),
          title: newHymnTitle.trim()
        }
      ]
    }));
    setNewHymnNumber('');
    setNewHymnTitle('');
  };

  const handleRemoveHymn = (idx) => {
    setFormData((prev) => ({
      ...prev,
      custom_hymns: prev.custom_hymns.filter((_, i) => i !== idx)
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    try {
      const payload = {
        tenant: tenantSlug || undefined,
        target_date: selectedDate,
        holy_day_code: dayData?.holyDayCode || null,
        custom_heading: formData.custom_heading.trim() || null,
        custom_description: formData.custom_description.trim() || null,
        pastoral_reflection: formData.pastoral_reflection.trim() || null,
        custom_collect: formData.custom_collect.trim() || null,
        portal_position: ['above', 'below'].includes(formData.portal_position)
          ? formData.portal_position
          : null,
        service_info: {
          time: formData.service_time.trim() || undefined,
          location: formData.service_location.trim() || undefined,
          liturgist: formData.service_liturgist.trim() || undefined,
          preacher: formData.service_preacher.trim() || undefined,
          cantor: formData.service_cantor.trim() || undefined
        },
        custom_hymns: formData.custom_hymns
      };

      await apiRequest(`/api/pyhapaiva/overrides/${selectedDate}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      setStatusMsg({
        type: 'success',
        text: 'Pyhäpäivän seurakuntakohtainen otsikko, kuvaus ja asetukset tallennettu!'
      });

      // Refresh day & calendar
      await loadCalendarAndOverrides();
      const refreshed = await apiRequest(`/api/pyhapaiva/day?date=${selectedDate}${tenantSlug ? `&tenant=${encodeURIComponent(tenantSlug)}` : ''}`);
      setDayData(refreshed);
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleRevertToAnnoDefault = async () => {
    if (!window.confirm('Palautetaanko tämä pyhäpäivä käyttämään virallisia Anno API / Evankeliumikirjan oletustietoja?')) {
      return;
    }
    setSaving(true);
    setStatusMsg(null);
    try {
      const qs = tenantSlug ? `?tenant=${encodeURIComponent(tenantSlug)}` : '';
      await apiRequest(`/api/pyhapaiva/overrides/${selectedDate}${qs}`, {
        method: 'DELETE'
      });
      setFormData({
        custom_heading: '',
        custom_description: '',
        pastoral_reflection: '',
        custom_collect: '',
        portal_position: 'none',
        service_time: '',
        service_location: '',
        service_liturgist: '',
        service_preacher: '',
        service_cantor: '',
        custom_hymns: []
      });
      setStatusMsg({
        type: 'success',
        text: 'Seurakunnan mukautus poistettu. Pyhäpäivä käyttää nyt virallisia Anno API -oletustietoja.'
      });
      await loadCalendarAndOverrides();
      const refreshed = await apiRequest(`/api/pyhapaiva/day?date=${selectedDate}${tenantSlug ? `&tenant=${encodeURIComponent(tenantSlug)}` : ''}`);
      setDayData(refreshed);
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8" data-testid="admin-pyhapaiva-manager">
      {/* Header & Quick Link to Public Page */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-martti text-xl font-bold text-stone-900 flex items-center gap-2">
            <span>⛪</span>
            <span>Pyhäpäivä & Kirkkovuosi – Seurakunnan otsikot ja kuvaukset</span>
          </h2>
          <p className="text-xs text-stone-600 mt-1">
            Valitse kirkkovuoden pyhäpäivä ja aseta sille seurakunnan oma teemaotsikko, kuvaus, jumalanpalvelustiedot tai nosta se etusivulle. Viralliset lukukappaleet haetaan automaattisesti Anno API:sta.
          </p>
        </div>

        <Link
          to={`/pyhapaiva?date=${selectedDate}`}
          className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold border border-stone-300 transition-colors"
        >
          👁️ Esikatsele pyhäpäiväsivua &rarr;
        </Link>
      </div>

      {/* SECTION 1: Holy Day Selector Strip & Date Picker */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
            1. Valitse muokattava pyhäpäivä tai päivämäärä
          </span>
          <div className="flex items-center gap-2">
            <label htmlFor="admin-pyhapaiva-date" className="text-xs font-semibold text-stone-600">
              Päivämäärä:
            </label>
            <input
              id="admin-pyhapaiva-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-xl border border-stone-300 bg-white text-stone-900"
              data-testid="admin-pyhapaiva-date-input"
            />
          </div>
        </div>

        {calendarDays.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
            {calendarDays.map((hd) => {
              const isSelected = hd.date === selectedDate;
              const dotClass = COLOR_DOTS[hd.liturgicalColor?.color?.toLowerCase()] || COLOR_DOTS.vihreä;
              return (
                <button
                  key={hd.date}
                  type="button"
                  onClick={() => setSelectedDate(hd.date)}
                  className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between gap-2 ${
                    isSelected
                      ? 'border-primary-700 bg-primary-50/80 ring-2 ring-primary-500/20'
                      : 'border-stone-200 bg-stone-50/60 hover:bg-stone-100'
                  }`}
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <span className={`w-3 h-3 rounded-full mt-1 shrink-0 ${dotClass}`} />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-stone-900 truncate">
                        {hd.name}
                      </div>
                      <div className="text-[11px] text-stone-600 truncate">
                        {hd.date} &bull; {hd.heading}
                      </div>
                    </div>
                  </div>
                  {hd.hasOverride && (
                    <span className="shrink-0 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded-full">
                      Mukautettu
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: Selected Holy Day Editor & Anno API Reference Preview */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : dayData ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7 cols): Parish Override Form */}
          <form
            onSubmit={handleSave}
            className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-5"
            data-testid="pyhapaiva-override-form"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary-800">
                  {dayData.date} &bull; {dayData.season}
                </span>
                <h3 className="font-martti text-lg font-bold text-stone-900">
                  {dayData.name}
                </h3>
              </div>
              {dayData.hasOverride && (
                <button
                  type="button"
                  onClick={handleRevertToAnnoDefault}
                  disabled={saving}
                  className="text-xs font-semibold text-red-700 hover:text-red-900 underline"
                  data-testid="revert-pyhapaiva-override-btn"
                >
                  ↺ Palauta Anno-oletuksiin
                </button>
              )}
            </div>

            {statusMsg && (
              <div
                className={`p-3.5 rounded-xl text-xs font-semibold border ${
                  statusMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                    : 'bg-red-50 text-red-900 border-red-300'
                }`}
                data-testid="pyhapaiva-status-msg"
              >
                {statusMsg.text}
              </div>
            )}

            {/* Custom Heading (Seurakunnan oma otsikko / teema) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider">
                  Seurakunnan oma otsikko / päivän teema
                </label>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, custom_heading: dayData.officialHeading || '' }))}
                  className="text-[11px] font-semibold text-primary-700 hover:underline"
                >
                  Kopioi pohjaksi virallinen aihe (&rdquo;{dayData.officialHeading}&rdquo;)
                </button>
              </div>
              <input
                type="text"
                value={formData.custom_heading}
                onChange={(e) => setFormData((prev) => ({ ...prev, custom_heading: e.target.value }))}
                placeholder={`Oletus (Anno API): ${dayData.officialHeading || ''}`}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-primary-600 focus:outline-hidden"
                data-testid="input-custom-heading"
              />
              <p className="text-[11px] text-stone-500 mt-1">
                Jos jätät tyhjäksi, käytetään kirkkovuoden virallista aihetta ({dayData.officialHeading}).
              </p>
            </div>

            {/* Custom Description (Seurakunnan oma kuvaus / johdanto) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider">
                  Seurakunnan oma kuvaus / johdantoteksti
                </label>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, custom_description: dayData.officialDescription || '' }))}
                  className="text-[11px] font-semibold text-primary-700 hover:underline"
                >
                  Kopioi pohjaksi virallinen kuvaus
                </button>
              </div>
              <textarea
                rows={3}
                value={formData.custom_description}
                onChange={(e) => setFormData((prev) => ({ ...prev, custom_description: e.target.value }))}
                placeholder={`Oletus: ${dayData.officialDescription || ''}`}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-primary-600 focus:outline-hidden"
                data-testid="input-custom-description"
              />
            </div>

            {/* Pastoral Reflection / Saarnan tai messun tervehdys */}
            <div>
              <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                Paimenellinen sana / papin tervehdys pyhäpäivään (valinnainen)
              </label>
              <textarea
                rows={3}
                value={formData.pastoral_reflection}
                onChange={(e) => setFormData((prev) => ({ ...prev, pastoral_reflection: e.target.value }))}
                placeholder="Esim. tervetulotoivotus sunnuntain messuun, saarnan teema tai rukousajatus..."
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm font-serif focus:ring-2 focus:ring-primary-600 focus:outline-hidden"
                data-testid="input-pastoral-reflection"
              />
            </div>

            {/* Main Portal Lifting (Nosta etusivulle karusellin ylä- tai alapuolelle) */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
              <label className="block text-xs font-bold text-amber-950 uppercase tracking-wider">
                📌 Näkyvyys etusivun portaalissa (Nosto)
              </label>
              <p className="text-[11px] text-amber-900">
                Voit nostaa tämän pyhäpäivän teeman suoraan seurakunnan etusivulle (`/`) joko karusellin yläpuolelle tai alapuolelle.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {[
                  { id: 'none', label: 'Ei erillistä nostoa' },
                  { id: 'above', label: '⬆️ Karusellin yläpuolella' },
                  { id: 'below', label: '⬇️ Karusellin alapuolella' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, portal_position: opt.id }))}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                      formData.portal_position === opt.id
                        ? 'bg-amber-800 text-white border-amber-900 shadow-2xs'
                        : 'bg-white text-stone-700 border-amber-300 hover:bg-amber-100/50'
                    }`}
                    data-testid={`pyhapaiva-portal-pos-${opt.id}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Service Info (Messun tiedot) */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
              <span className="block text-xs font-bold text-stone-800 uppercase tracking-wider">
                🔔 Jumalanpalveluksen tiedot (valinnainen – näkyy sivulla ja tulosteessa)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">Aika</label>
                  <input
                    type="text"
                    value={formData.service_time}
                    onChange={(e) => setFormData((prev) => ({ ...prev, service_time: e.target.value }))}
                    placeholder="esim. klo 10.00"
                    className="w-full px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">Paikka / Kirkko</label>
                  <input
                    type="text"
                    value={formData.service_location}
                    onChange={(e) => setFormData((prev) => ({ ...prev, service_location: e.target.value }))}
                    placeholder="esim. Tuomiokirkko"
                    className="w-full px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">Liturgi</label>
                  <input
                    type="text"
                    value={formData.service_liturgist}
                    onChange={(e) => setFormData((prev) => ({ ...prev, service_liturgist: e.target.value }))}
                    placeholder="esim. Olli-Pekka Silfverhuth"
                    className="w-full px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">Saarnaaja</label>
                  <input
                    type="text"
                    value={formData.service_preacher}
                    onChange={(e) => setFormData((prev) => ({ ...prev, service_preacher: e.target.value }))}
                    placeholder="esim. Matti Repo"
                    className="w-full px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Custom Hymns List */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
              <span className="block text-xs font-bold text-stone-800 uppercase tracking-wider">
                🎵 Päivän virret (valinnainen – korvaa oletussuositukset messulehtisessä)
              </span>
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-36">
                  <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">Kohta</label>
                  <input
                    type="text"
                    value={newHymnRole}
                    onChange={(e) => setNewHymnRole(e.target.value)}
                    placeholder="Alkuvirsi"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-xs"
                  />
                </div>
                <div className="w-24">
                  <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">Virsinumero</label>
                  <input
                    type="text"
                    value={newHymnNumber}
                    onChange={(e) => setNewHymnNumber(e.target.value)}
                    placeholder="esim. 1"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-xs"
                  />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">Nimi tai säkeistöt</label>
                  <input
                    type="text"
                    value={newHymnTitle}
                    onChange={(e) => setNewHymnTitle(e.target.value)}
                    placeholder="esim. Hoosianna"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddHymn}
                  className="px-3 py-1.5 rounded-lg bg-stone-800 text-white text-xs font-bold hover:bg-stone-900"
                >
                  + Lisää virsi
                </button>
              </div>

              {formData.custom_hymns.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  {formData.custom_hymns.map((h, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-white border border-stone-200 px-3 py-1.5 rounded-lg text-xs"
                    >
                      <span>
                        <strong>{h.role}:</strong> VK {h.number} {h.title ? `– ${h.title}` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveHymn(i)}
                        className="text-red-600 hover:text-red-800 font-bold"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-primary-800 hover:bg-primary-900 text-white text-sm font-bold shadow-sm transition-colors"
                data-testid="save-pyhapaiva-override-btn"
              >
                {saving ? 'Tallennetaan...' : 'Tallenna pyhäpäivän asetukset'}
              </button>
            </div>
          </form>

          {/* Right Column (5 cols): Official Anno API & Evankeliumikirja Reference Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-stone-50 rounded-2xl border border-stone-200 p-5 space-y-4">
              <div className="border-b border-stone-200 pb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  Anno API / Evankeliumikirjan viralliset tiedot
                </span>
                <h4 className="font-martti text-base font-bold text-stone-900 mt-0.5">
                  {dayData.name}
                </h4>
                <p className="text-xs text-stone-600 italic">
                  Virallinen aihe: &rdquo;{dayData.officialHeading}&rdquo;
                </p>
              </div>

              <div className="space-y-2.5 text-xs text-stone-700">
                <div>
                  <span className="font-bold text-stone-900 block">Virallinen kuvaus:</span>
                  <p className="mt-0.5 leading-relaxed">{dayData.officialDescription}</p>
                </div>

                {dayData.psalm && (
                  <div className="p-3 rounded-xl bg-white border border-stone-200">
                    <span className="font-bold text-stone-900 block">
                      Päivän psalmi: {dayData.psalm.reference}
                    </span>
                    {dayData.psalm.antiphon && (
                      <p className="italic text-stone-600 mt-0.5">{dayData.psalm.antiphon}</p>
                    )}
                  </div>
                )}

                {dayData.readings?.firstReading && (
                  <div className="p-3 rounded-xl bg-white border border-stone-200">
                    <span className="font-bold text-stone-900 block">
                      1. lukukappale: {dayData.readings.firstReading.reference}
                    </span>
                    <p className="text-stone-600 line-clamp-2 mt-0.5">{dayData.readings.firstReading.text}</p>
                  </div>
                )}

                {dayData.readings?.secondReading && (
                  <div className="p-3 rounded-xl bg-white border border-stone-200">
                    <span className="font-bold text-stone-900 block">
                      2. lukukappale: {dayData.readings.secondReading.reference}
                    </span>
                    <p className="text-stone-600 line-clamp-2 mt-0.5">{dayData.readings.secondReading.text}</p>
                  </div>
                )}

                {dayData.readings?.gospel && (
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                    <span className="font-bold text-amber-950 block">
                      ✝️ Evankeliumi: {dayData.readings.gospel.reference}
                    </span>
                    <p className="text-stone-700 line-clamp-3 mt-0.5 font-serif italic">
                      {dayData.readings.gospel.text}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Saved Parish Overrides List */}
            {savedOverrides.length > 0 && (
              <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
                <h4 className="font-martti text-sm font-bold text-stone-900">
                  Seurakunnan tallennetut pyhäpäivämukautukset ({savedOverrides.length})
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {savedOverrides.map((ov) => (
                    <div
                      key={ov.id || ov.target_date}
                      onClick={() => setSelectedDate(ov.target_date)}
                      className="p-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-stone-900 truncate">
                          {ov.target_date} &bull; {ov.custom_heading || '(Virallinen otsikko)'}
                        </div>
                        {ov.custom_description && (
                          <div className="text-[11px] text-stone-500 truncate">
                            {ov.custom_description}
                          </div>
                        )}
                      </div>
                      {ov.portal_position && (
                        <span className="shrink-0 text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                          📌 {ov.portal_position === 'above' ? 'Yläpuoli' : 'Alapuoli'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
