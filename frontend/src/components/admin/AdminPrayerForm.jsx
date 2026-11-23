import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { useTenant } from '../../context/TenantContext';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import DateRangeCalendar from '../common/DateRangeCalendar';

export default function AdminPrayerForm({ onSuccess }) {
  const { t } = useTranslation();
  const { currentTenant, yhtyma, isPartOfYhtyma } = useTenant();
  const { ministryGroups, ministryTags } = useSettings();
  const { isAdmin, isBishop } = useAuth();

  const [type, setType] = useState('staff');
  const [content, setContent] = useState('');
  const [ministryGroup, setMinistryGroup] = useState(ministryGroups?.[0] || 'Paikallinen seurakuntatyö');
  const [ministryTag, setMinistryTag] = useState(ministryTags?.[0] || 'Diakonia');
  const [highlightPriority, setHighlightPriority] = useState(0);
  const [portalPosition, setPortalPosition] = useState(null);
  const [isYhtymaWide, setIsYhtymaWide] = useState(false);

  const formatDateStr = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = new Date();
  const nextMonth = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
  const [startDate, setStartDate] = useState(formatDateStr(today));
  const [endDate, setEndDate] = useState(formatDateStr(nextMonth));
  const [showCalendar, setShowCalendar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    setMessage(null);

    try {
      let res;
      if (type === 'bishop') {
        res = await api.submitBishopPrayer(
          content.trim(),
          startDate,
          endDate,
          undefined,
          isYhtymaWide,
          currentTenant?.id,
          highlightPriority
        );
      } else if (type === 'pastor') {
        res = await api.submitPastorPrayer(
          content.trim(),
          startDate,
          endDate,
          undefined,
          isYhtymaWide,
          currentTenant?.id,
          highlightPriority
        );
      } else if (type === 'public') {
        res = await api.submitPrayer(content.trim(), startDate, endDate, currentTenant?.id);
        if (res?.prayer?.id) {
          await api.approvePrayer(res.prayer.id, true);
        }
      } else {
        res = await api.submitStaffPrayer(
          content.trim(),
          startDate,
          endDate,
          ministryGroup,
          ministryTag,
          isYhtymaWide,
          currentTenant?.id
        );
      }

      if (portalPosition && res?.prayer?.id) {
        await api.updatePrayer(res.prayer.id, { portalPosition });
      }

      setMessage({ type: 'success', text: 'Rukousaihe tallennettu onnistuneesti!' });
      setContent('');
      setPortalPosition(null);
      if (onSuccess) onSuccess(res?.prayer);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
          Rukousaiheen tyyppi
        </label>
        <div className="inline-flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setType('staff')}
            className={`px-2.5 py-1 rounded text-xs font-semibold ${
              type === 'staff' ? 'bg-white text-primary-900 shadow-2xs' : 'text-gray-600'
            }`}
          >
            🏛️ Työala
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setType('pastor')}
              className={`px-2.5 py-1 rounded text-xs font-semibold ${
                type === 'pastor' ? 'bg-white text-amber-900 shadow-2xs' : 'text-gray-600'
              }`}
            >
              ✝️ Kirkkoherra
            </button>
          )}
          {(isAdmin || isBishop) && (
            <button
              type="button"
              onClick={() => setType('bishop')}
              className={`px-2.5 py-1 rounded text-xs font-semibold ${
                type === 'bishop' ? 'bg-white text-purple-900 shadow-2xs' : 'text-gray-600'
              }`}
            >
              ☩ Piispa
            </button>
          )}
          <button
            type="button"
            onClick={() => setType('public')}
            className={`px-2.5 py-1 rounded text-xs font-semibold ${
              type === 'public' ? 'bg-white text-emerald-900 shadow-2xs' : 'text-gray-600'
            }`}
          >
            🙏 Yhteisön rukous
          </button>
        </div>
      </div>

      {type === 'staff' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label text-xs">Ryhmä / Vastuualue</label>
            <select
              value={ministryGroup}
              onChange={(e) => setMinistryGroup(e.target.value)}
              className="input text-xs"
            >
              {ministryGroups?.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label text-xs">Työala / Tunniste</label>
            <select
              value={ministryTag}
              onChange={(e) => setMinistryTag(e.target.value)}
              className="input text-xs"
            >
              {ministryTags?.map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div>
        <label className="label text-xs font-semibold">Rukouspyynnön teksti</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="textarea h-28 w-full text-sm"
          placeholder="Kirjoita rukousaihe..."
          disabled={loading}
        />
      </div>

      {/* Portal Lift Selector */}
      <div className="bg-primary-50/50 p-3 rounded-xl border border-primary-200/80 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold text-primary-950 flex items-center gap-1.5">
          <span>📌</span>
          <span>Näkyvyys etusivun portaalissa (/):</span>
        </span>
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

      {isPartOfYhtyma && (
        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={isYhtymaWide}
            onChange={(e) => setIsYhtymaWide(e.target.checked)}
            className="rounded text-primary-600"
          />
          <span>🏛️ Näytä kaikissa {yhtyma?.name || 'seurakuntayhtymän'} seurakunnissa</span>
        </label>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowCalendar(!showCalendar)}
          className="text-xs text-primary-700 underline"
        >
          📅 {startDate} – {endDate}
        </button>
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="btn-primary text-xs px-5 py-2"
        >
          {loading ? t('common.loading') : '➕ Tallenna rukousaihe'}
        </button>
      </div>

      {showCalendar && (
        <DateRangeCalendar
          startDate={startDate}
          endDate={endDate}
          onChange={({ startDate: s, endDate: e }) => {
            setStartDate(s);
            setEndDate(e);
          }}
        />
      )}

      {message && (
        <div
          className={`p-2.5 rounded-lg text-xs ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}
    </form>
  );
}
