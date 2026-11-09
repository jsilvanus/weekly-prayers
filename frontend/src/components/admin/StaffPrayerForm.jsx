import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { useTenant } from '../../context/TenantContext';
import DateRangeCalendar from '../common/DateRangeCalendar';

const MINISTRY_GROUPS = [
  { id: 'local', key: 'groups.local' },
  { id: 'international', key: 'groups.international' },
  { id: 'children_youth', key: 'groups.children_youth' },
  { id: 'diaconal_care', key: 'groups.diaconal_care' },
];

const PRESET_TAGS = [
  'Diakonia',
  'Nuorisotyö',
  'Lähetystyö',
  'Musiikkityö',
  'Varhaiskasvatus',
  'Jumalanpalvelus',
  'Yhteisötyö'
];

function StaffPrayerForm() {
  const { t } = useTranslation();
  const { currentTenant, yhtyma, isPartOfYhtyma } = useTenant();
  const [content, setContent] = useState('');
  const [ministryGroup, setMinistryGroup] = useState('local');
  const [ministryTag, setMinistryTag] = useState('Diakonia');
  const [customTag, setCustomTag] = useState('');
  const [isYhtymaWide, setIsYhtymaWide] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

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
      await api.submitStaffPrayer(
        content.trim(),
        startDate,
        endDate,
        ministryGroup,
        effectiveTag,
        isYhtymaWide,
        currentTenant?.id
      );
      setMessage({ type: 'success', text: 'Työalan rukouspyyntö lisätty onnistuneesti!' });
      setContent('');
      setCustomTag('');
      setIsYhtymaWide(false);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-primary-800 mb-6">
        {t('admin.staff.title')}
      </h2>

      <form onSubmit={handleSubmit} className="card">
        {/* Ministry Group & Tag Selection */}
        <div className="grid gap-4 sm:grid-cols-2 mb-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              {t('admin.staff.group')} (1–4)
            </label>
            <select
              value={ministryGroup}
              onChange={(e) => setMinistryGroup(e.target.value)}
              className="input w-full"
              disabled={loading}
            >
              {MINISTRY_GROUPS.map((grp) => (
                <option key={grp.id} value={grp.id}>
                  {t(`ministries.${grp.key}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              {t('admin.staff.tag')}
            </label>
            <div className="flex gap-2">
              <select
                value={ministryTag}
                onChange={(e) => {
                  setMinistryTag(e.target.value);
                  setCustomTag('');
                }}
                className="input w-1/2"
                disabled={loading}
              >
                {PRESET_TAGS.map((tag) => (
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
          <div className="mb-4 p-3.5 bg-gradient-to-r from-blue-50/80 to-indigo-50/60 border border-blue-200/80 rounded-xl" data-testid="yhtyma-wide-toggle">
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

        {/* Prayer content */}
        <textarea
          className="textarea h-36 mb-4"
          placeholder="Kirjoita työalan rukouspyyntö tähän..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={2000}
          disabled={loading}
        />

        {/* Date range visibility selector */}
        <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowCalendar(!showCalendar)}
              className="text-xs font-semibold text-primary-700 hover:text-primary-800 flex items-center gap-1"
            >
              <span>📅 {t('prayers.submit.timelineTitle')}</span>
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
                onChange={(s, e) => {
                  setStartDate(s);
                  setEndDate(e);
                }}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">{content.length}/2000</span>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !content.trim()}
          >
            {loading ? t('common.loading') : t('admin.staff.add')}
          </button>
        </div>

        {message && (
          <div
            className={`mt-4 p-3 rounded-lg ${
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
