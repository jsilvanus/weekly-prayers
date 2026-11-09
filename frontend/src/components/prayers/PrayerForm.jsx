import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import DateRangeCalendar from '../common/DateRangeCalendar';

function PrayerForm({ onSuccess, isModal = false }) {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Default dates: today to +7 days
  const formatDateStr = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [startDate, setStartDate] = useState(formatDateStr(today));
  const [endDate, setEndDate] = useState(formatDateStr(nextWeek));
  const [showCalendar, setShowCalendar] = useState(true);

  const handleDateChange = (start, end) => {
    setStartDate(start);
    setEndDate(end);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!content.trim()) return;

    setLoading(true);
    setMessage(null);

    try {
      await api.submitPrayer(content.trim(), startDate, endDate);
      setMessage({ type: 'success', text: t('prayers.submit.success') });
      setContent('');
      onSuccess?.();
    } catch (error) {
      setMessage({ type: 'error', text: t('prayers.submit.error') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={isModal ? '' : 'card'}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-bold text-primary-800">
          {t('prayers.submit.title')}
        </h3>

        {isAuthenticated && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {user?.name} ({t(`admin.users.roles.${user?.role || 'user'}`)})
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <textarea
          className="textarea h-28 mb-3"
          placeholder={t('prayers.submit.placeholder')}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={1000}
          disabled={loading}
        />

        {/* Date range visibility selector */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <button
              type="button"
              onClick={() => setShowCalendar(!showCalendar)}
              className="text-xs font-semibold text-primary-700 hover:text-primary-800 flex items-center gap-1 py-1"
            >
              <span>📅 {t('prayers.submit.timelineTitle')}</span>
              <span className="text-[10px] text-gray-500">
                {showCalendar ? '▲' : '▼'}
              </span>
            </button>
            <span className="text-xs text-gray-500">
              {startDate} – {endDate}
            </span>
          </div>

          {showCalendar && (
            <DateRangeCalendar
              startDate={startDate}
              endDate={endDate}
              onChange={handleDateChange}
            />
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-sm text-gray-500">
            {content.length}/1000
          </span>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !content.trim()}
          >
            {loading ? t('common.loading') : t('prayers.submit.button')}
          </button>
        </div>
      </form>

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
    </div>
  );
}

export default PrayerForm;
