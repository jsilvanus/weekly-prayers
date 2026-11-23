import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { useTenant } from '../../context/TenantContext';
import { useSettings } from '../../context/SettingsContext';
import DateRangeCalendar from '../common/DateRangeCalendar';

function StaffPrayerForm() {
  const { t } = useTranslation();
  const { currentTenant, yhtyma, isPartOfYhtyma } = useTenant();
  const { ministryGroups, ministryTags } = useSettings();

  const [content, setContent] = useState('');
  const [ministryGroup, setMinistryGroup] = useState(ministryGroups?.[0] || 'Paikallinen seurakuntatyö');
  const [ministryTag, setMinistryTag] = useState(ministryTags?.[0] || 'Diakonia');
  const [customTag, setCustomTag] = useState('');
  const [isYhtymaWide, setIsYhtymaWide] = useState(false);
  const [portalPosition, setPortalPosition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Update default selections if settings change
  useEffect(() => {
    if (ministryGroups && ministryGroups.length > 0 && !ministryGroups.includes(ministryGroup)) {
      setMinistryGroup(ministryGroups[0]);
    }
  }, [ministryGroups]);

  useEffect(() => {
    if (ministryTags && ministryTags.length > 0 && !ministryTags.includes(ministryTag)) {
      setMinistryTag(ministryTags[0]);
    }
  }, [ministryTags]);

  const formatDateStr = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = new Date();
  const nextMonth = new Date(today.getTime() + 28 * 24 * 60 * 60 * 1000);
  const [startDate, setStartDate] = useState(formatDateStr(today));
  const [endDate, setEndDate] = useState(formatDateStr(nextMonth));
  const [showCalendar, setShowCalendar] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!content.trim()) return;

    setLoading(true);
    setMessage(null);

    const effectiveTag = customTag.trim() || ministryTag;

    try {
      const res = await api.submitStaffPrayer(
        content.trim(),
        startDate,
        endDate,
        ministryGroup,
        effectiveTag,
        isYhtymaWide,
        currentTenant?.id
      );
      if (portalPosition && res?.prayer?.id) {
        try {
          await api.updatePrayer(res.prayer.id, { portalPosition });
        } catch (e) {}
      }
      setMessage({ type: 'success', text: 'Työalan rukouspyyntö lisätty onnistuneesti!' });
      setContent('');
      setCustomTag('');
      setIsYhtymaWide(false);
      setPortalPosition(null);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-primary-800 mb-6">
        {t('admin.staff.title', 'Työalan rukouspyyntö')}
      </h2>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {/* Ministry Group & Tag Selection from Parish Settings */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              {t('admin.staff.group', 'Ryhmä / Vastuualue')}
            </label>
            <select
              value={ministryGroup}
              onChange={(e) => setMinistryGroup(e.target.value)}
              className="input w-full text-sm"
              disabled={loading}
            >
              {ministryGroups?.map((grp) => (
                <option key={grp} value={grp}>
                  {grp}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              {t('admin.staff.tag', 'Työala / Tunniste')}
            </label>
            <div className="flex gap-2">
              <select
                value={ministryTag}
                onChange={(e) => {
                  setMinistryTag(e.target.value);
                  setCustomTag('');
                }}
                className="input w-1/2 text-sm"
                disabled={loading}
              >
                {ministryTags?.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Tai oma tunniste..."
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                className="input w-1/2 text-sm"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Yhtymä-wide toggle */}
        {isPartOfYhtyma && (
          <div className="p-3.5 bg-gradient-to-r from-blue-50/80 to-indigo-50/60 border border-blue-200/80 rounded-xl" data-testid="yhtyma-wide-toggle">
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
                  <span>{t('admin.staff.yhtymaWide') || 'Yhtymän laajuinen rukousaihe'}</span>
                </span>
                <p className="text-xs text-slate-600 mt-0.5">
                  {t('admin.staff.yhtymaWideDesc', { yhtymaName: yhtyma?.name || 'seurakuntayhtymän' }) ||
                    `Aihe merkitään näkymään kaikissa ${yhtyma?.name || 'seurakuntayhtymän'} seurakunnissa.`}
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Prayer content with Character Count at top right */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-gray-800 uppercase tracking-wide">
              Rukouspyynnön teksti
            </label>
            <span className="text-xs font-mono font-medium text-primary-800 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
              {content.length} / 2000
            </span>
          </div>
          <textarea
            className="textarea h-36 w-full text-sm"
            placeholder="Kirjoita työalan rukouspyyntö tähän..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={2000}
            disabled={loading}
          />
        </div>

        {/* Date range visibility selector */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowCalendar(!showCalendar)}
              className="text-xs font-semibold text-primary-700 hover:text-primary-800 flex items-center gap-1"
            >
              <span>📅 {t('prayers.submit.timelineTitle', 'Näkyvyysaika')}</span>
              <span className="text-[10px] text-gray-500">
                {showCalendar ? '▲' : '▼'}
              </span>
            </button>
            <span className="text-xs font-medium text-gray-600">
              {startDate} – {endDate}
            </span>
          </div>

          {showCalendar && (
            <div className="mt-3">
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
        <div className="bg-primary-50/50 p-3 rounded-xl border border-primary-200/80 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold text-primary-950 flex items-center gap-1.5">
              <span>📌</span>
              <span>Nosta suoraan etusivun portaaliin (/)</span>
            </span>
            <p className="text-[11px] text-gray-500">
              Voit nostaa tämän työalan rukouspyynnön näkymään suoraan etusivulla karusellin ylä- tai alapuolella.
            </p>
          </div>
          <div className="inline-flex items-center gap-1 bg-white p-1 rounded-lg border border-primary-200">
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
                    ? 'bg-primary-700 text-white shadow-2xs'
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
            {loading ? t('common.loading') : t('admin.staff.add', '➕ Lisää työalan aihe')}
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
    </div>
  );
}

export default StaffPrayerForm;
