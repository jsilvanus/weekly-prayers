import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../services/api';
import DateRangeCalendar from '../common/DateRangeCalendar';

const CHECK_DEBOUNCE_MS = 700;
const SUPPORTED_LANGS = ['fi', 'sv', 'en'];
const MAX_SNIPPET_LENGTH = 60;

function currentLang(i18n) {
  const short = String(i18n.resolvedLanguage || i18n.language || 'fi').slice(0, 2);
  return SUPPORTED_LANGS.includes(short) ? short : 'fi';
}

function isValidFinding(finding, length) {
  return (
    finding &&
    Number.isInteger(finding.start) &&
    Number.isInteger(finding.end) &&
    finding.start >= 0 &&
    finding.end > finding.start &&
    finding.end <= length
  );
}

function snippetOf(text, { start, end }) {
  const raw = text.slice(start, end).replace(/\s+/g, ' ');
  return raw.length > MAX_SNIPPET_LENGTH ? `${raw.slice(0, MAX_SNIPPET_LENGTH)}…` : raw;
}

function PrayerForm({ onSuccess, isModal = false }) {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const { currentTenant } = useTenant();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  // Result of the last personal-data check: { decision, findings, forContent }.
  // forContent is the exact (trimmed) text the offsets refer to.
  const [check, setCheck] = useState(null);
  const [guidanceOpen, setGuidanceOpen] = useState(false);
  const textareaId = useId();
  const guidanceId = useId();
  const findingsId = useId();

  const trimmed = content.trim();
  const lang = currentLang(i18n);

  // Only show a check result that belongs to the text currently in the box.
  const activeCheck = check && check.forContent === trimmed ? check : null;
  const isRejected = activeCheck?.decision === 'reject';

  // Debounced live check. Each keystroke aborts the previous pending request.
  useEffect(() => {
    if (!trimmed) {
      setCheck(null);
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const result = await api.checkPrayer(trimmed, lang, controller.signal);
        setCheck({
          decision: result?.decision || 'ok',
          findings: Array.isArray(result?.findings) ? result.findings : [],
          forContent: trimmed,
        });
      } catch {
        // The live check is advisory; the server re-checks on submit.
      }
    }, CHECK_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, lang]);

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

  const typeLabel = (type) =>
    t(`prayers.submit.findingTypes.${type}`, { defaultValue: type });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!trimmed || loading || isRejected) return;

    setLoading(true);
    setMessage(null);

    try {
      await api.submitPrayer(trimmed, startDate, endDate, currentTenant?.id);
      setMessage({ type: 'success', text: t('prayers.submit.success') });
      setContent('');
      setCheck(null);
      onSuccess?.();
    } catch (error) {
      if (error.status === 422 && error.data?.error?.code === 'PERSONAL_DATA') {
        // Nothing was stored. Offsets refer to the text we sent (trimmed).
        setCheck({
          decision: 'reject',
          findings: Array.isArray(error.data.error.findings) ? error.data.error.findings : [],
          forContent: trimmed,
        });
      } else {
        setMessage({ type: 'error', text: t('prayers.submit.error') });
      }
    } finally {
      setLoading(false);
    }
  };

  const validFindings = activeCheck
    ? activeCheck.findings
        .filter((f) => isValidFinding(f, activeCheck.forContent.length))
        .sort((a, b) => a.start - b.start)
    : [];

  const findingTypes = activeCheck
    ? [...new Set(activeCheck.findings.map((f) => f.type).filter(Boolean))]
    : [];
  const typesText = findingTypes.length
    ? findingTypes.map(typeLabel).join(', ')
    : t('prayers.submit.findingTypes.unknown');

  const findingChips = validFindings.length > 0 && (
    <ul
      className="mt-2 flex flex-wrap gap-1.5"
      aria-label={t('prayers.submit.foundLabel')}
    >
      {validFindings.map((f, i) => (
        <li
          key={`${f.start}-${f.end}-${i}`}
          className="inline-flex max-w-full items-center gap-1 rounded-full border border-black/10 bg-white px-2.5 py-0.5 text-xs"
        >
          <span className="font-semibold whitespace-nowrap">{typeLabel(f.type)}:</span>
          <span className="min-w-0 truncate font-mono">
            “{snippetOf(activeCheck.forContent, f)}”
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className={isModal ? '' : 'card'}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
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
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <label htmlFor={textareaId} className="text-xs font-semibold text-gray-700">
              {t('prayers.submit.contentLabel', 'Rukousaiheesi')}
            </label>
            <button
              type="button"
              aria-label={t('prayers.submit.guidance.toggle')}
              aria-expanded={guidanceOpen}
              aria-controls={guidanceId}
              onClick={() => setGuidanceOpen((open) => !open)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-primary-600 text-primary-700 text-sm font-serif italic font-bold hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
            >
              <span aria-hidden="true">i</span>
            </button>
          </div>
          <span className="text-xs font-mono font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
            {content.length} / 1000
          </span>
        </div>

        {guidanceOpen && (
          <section
            id={guidanceId}
            aria-label={t('prayers.submit.guidance.title')}
            className="mb-3 rounded-lg border border-primary-200 bg-primary-50 p-3 text-sm text-gray-800"
          >
            <h4 className="font-semibold text-primary-800 mb-1.5">
              {t('prayers.submit.guidance.title')}
            </h4>
            <ul className="list-disc pl-5 space-y-1">
              {(t('prayers.submit.guidance.points', { returnObjects: true }) || []).map(
                (point, i) => (
                  <li key={i}>{point}</li>
                )
              )}
            </ul>
          </section>
        )}

        <textarea
          id={textareaId}
          className="textarea h-28 mb-2 w-full"
          placeholder={t('prayers.submit.placeholder')}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={1000}
          disabled={loading}
          aria-describedby={activeCheck && activeCheck.decision !== 'ok' ? findingsId : undefined}
          aria-invalid={isRejected || undefined}
        />

        {activeCheck && activeCheck.decision === 'reject' && (
          <div
            id={findingsId}
            role="alert"
            className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            <p className="font-medium">
              {t('prayers.submit.rejectMessage', { types: typesText })}
            </p>
            {findingChips}
          </div>
        )}

        {activeCheck && activeCheck.decision === 'review' && (
          <div
            id={findingsId}
            role="status"
            className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
          >
            <p>{t('prayers.submit.reviewMessage')}</p>
            {findingChips}
          </div>
        )}

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

        <div className="flex items-center justify-end pt-2 border-t border-gray-100">
          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !trimmed || isRejected}
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
