import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePrayers } from '../../hooks/usePrayers';
import { api } from '../../services/api';

const PORTAL_POSITION_OPTIONS = [
  { id: null, label: 'Ei nostoa', shortLabel: 'Ei nostoa', icon: '—' },
  { id: 'above', label: 'Karusellin yläpuolella', shortLabel: '⬆️ Yläpuolella', icon: '⬆️' },
  { id: 'below', label: 'Karusellin alapuolella', shortLabel: '⬇️ Alapuolella', icon: '⬇️' },
];

function PrayerManager() {
  const { t } = useTranslation();
  const { prayers, refetch, loading } = usePrayers();
  const [actionLoading, setActionLoading] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [rowErrors, setRowErrors] = useState({});

  const setRowError = (id, text) =>
    setRowErrors((prev) => {
      const next = { ...prev };
      if (text) next[id] = text;
      else delete next[id];
      return next;
    });

  const handleApprove = async (id, approved) => {
    setActionLoading(id);
    setRowError(id, null);
    try {
      await api.approvePrayer(id, approved);
      refetch();
    } catch (error) {
      if (error.data?.error?.code === 'REDACTION_REQUIRED') {
        setRowError(id, t('admin.prayers.moderation.redactionRequired'));
      } else {
        alert(error.message);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('admin.prayers.confirmDelete'))) return;

    setActionLoading(id);
    try {
      await api.deletePrayer(id);
      refetch();
    } catch (error) {
      alert(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePortalPlacement = async (id, portalPosition) => {
    setActionLoading(id);
    try {
      if (typeof api.updatePrayerPortalPlacement === 'function') {
        await api.updatePrayerPortalPlacement(id, portalPosition);
      } else {
        await api.updatePrayer(id, { portalPosition });
      }
      refetch();
    } catch (error) {
      alert(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const allPrayers = [
    ...(prayers.bishop || []).map((p) => ({ ...p, typeLabel: 'bishop' })),
    ...prayers.pastor.map((p) => ({ ...p, typeLabel: 'pastor' })),
    ...prayers.staff.map((p) => ({ ...p, typeLabel: 'staff' })),
    ...prayers.public.map((p) => ({ ...p, typeLabel: 'public' })),
  ];

  const pendingPrayers = allPrayers.filter((p) => !p.isApproved && p.typeLabel === 'public');
  const approvedPrayers = allPrayers
    .filter((p) => p.isApproved || p.typeLabel !== 'public')
    .filter((p) => {
      if (typeFilter === 'all') return true;
      if (typeFilter === 'lifted') return p.portalPosition === 'above' || p.portalPosition === 'below';
      return p.typeLabel === typeFilter;
    });

  // Only block on the first load; background refetches must not unmount
  // rows, which would drop unsaved edits and open panels.
  if (loading && allPrayers.length === 0) {
    return <div className="text-center py-8">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-primary-800">
            {t('admin.prayers.title')}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Hallitse esirukouspyyntöjä ja nosta yksittäisiä rukouksia (piispan, kirkkoherran, työalan tai seurakuntalaisen!) suoraan etusivun portaaliin karusellin ylä- tai alapuolelle.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { id: 'all', label: 'Kaikki' },
            { id: 'lifted', label: '📌 Etusivulle nostetut' },
            { id: 'bishop', label: '☩ Piispa' },
            { id: 'pastor', label: '✝️ Kirkkoherra' },
            { id: 'staff', label: '🏛️ Työalat' },
            { id: 'public', label: '🙏 Seurakuntalaiset' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTypeFilter(tab.id)}
              className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
                typeFilter === tab.id
                  ? 'bg-primary-700 text-white shadow-2xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <DigestPanel />

      {/* Pending prayers */}
      {pendingPrayers.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-yellow-700 mb-4">
            {t('admin.prayers.pending')} ({pendingPrayers.length})
          </h3>
          <div className="space-y-4">
            {pendingPrayers.map((prayer) => (
              <PrayerItem
                key={prayer.id}
                prayer={prayer}
                onApprove={() => handleApprove(prayer.id, true)}
                onReject={() => handleApprove(prayer.id, false)}
                onDelete={() => handleDelete(prayer.id)}
                onPortalChange={(pos) => handlePortalPlacement(prayer.id, pos)}
                onChanged={refetch}
                error={rowErrors[prayer.id]}
                loading={actionLoading === prayer.id}
                showApproval
              />
            ))}
          </div>
        </div>
      )}

      {/* Approved prayers */}
      <div>
        <h3 className="text-lg font-medium text-green-700 mb-4">
          {t('admin.prayers.approved')} ({approvedPrayers.length})
        </h3>
        <div className="space-y-4">
          {approvedPrayers.map((prayer) => (
            <PrayerItem
              key={prayer.id}
              prayer={prayer}
              onDelete={() => handleDelete(prayer.id)}
              onPortalChange={(pos) => handlePortalPlacement(prayer.id, pos)}
              onChanged={refetch}
              error={rowErrors[prayer.id]}
              loading={actionLoading === prayer.id}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PrayerItem({ prayer, onApprove, onReject, onDelete, onPortalChange, onChanged, error, loading, showApproval }) {
  const { t } = useTranslation();
  const isPublic = prayer.typeLabel === 'public';
  const needsRedactionReview = isPublic && prayer.redactionStatus === 'needs_review';

  const typeColors = {
    bishop: 'bg-purple-100 text-purple-900 border border-purple-200',
    pastor: 'bg-amber-100 text-amber-900 border border-amber-200',
    staff: 'bg-blue-100 text-blue-800 border border-blue-200',
    public: 'bg-gray-100 text-gray-800 border border-gray-200',
  };

  const typeDisplayNames = {
    bishop: '☩ Piispa',
    pastor: '✝️ Kirkkoherra',
    staff: '🏛️ Työala',
    public: '🙏 Seurakuntalainen',
  };

  const currentPortalPos = prayer.portalPosition || null;

  return (
    <div
      className={`card border transition-all ${
        currentPortalPos
          ? 'border-primary-400 bg-primary-50/20 ring-1 ring-primary-500/20'
          : 'border-gray-200'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${typeColors[prayer.typeLabel] || 'bg-gray-100 text-gray-800'}`}>
            {typeDisplayNames[prayer.typeLabel] || prayer.typeLabel}
          </span>
          {prayer.ministryTag && (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
              🏷️ {prayer.ministryTag}
            </span>
          )}
          {prayer.authorName && prayer.typeLabel !== 'bishop' && (
            <span className="text-xs text-gray-500 font-medium">
              Lisännyt: {prayer.authorName}
            </span>
          )}
          {currentPortalPos && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-700 text-white flex items-center gap-1">
              <span>📌</span>
              <span>
                Etusivulla ({currentPortalPos === 'above' ? '⬆️ Karusellin yläpuolella' : '⬇️ Karusellin alapuolella'})
              </span>
            </span>
          )}
        </div>
        {prayer.aiFlagged && (
          <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
            AI Flagged
          </span>
        )}
      </div>

      {isPublic ? (
        <RedactionPanel prayer={prayer} onChanged={onChanged} />
      ) : (
        <p className="text-gray-800 mb-4 whitespace-pre-wrap text-sm leading-relaxed">
          {prayer.content}
        </p>
      )}

      {prayer.aiFlagReason && (
        <p className="text-sm text-red-600 mb-4">
          {prayer.aiFlagReason}
        </p>
      )}

      {/* Main Page Portal Visibility Selector */}
      <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-2.5 mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <span>📌</span>
          <span>Näkyvyys etusivun portaalissa (/):</span>
        </span>
        <div className="inline-flex flex-wrap items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
          {PORTAL_POSITION_OPTIONS.map((opt) => {
            const isSelected = currentPortalPos === opt.id;
            return (
              <button
                key={String(opt.id)}
                type="button"
                disabled={loading}
                onClick={() => onPortalChange && onPortalChange(opt.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  isSelected
                    ? opt.id === null
                      ? 'bg-slate-700 text-white shadow-2xs'
                      : 'bg-primary-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {opt.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-3 rounded-lg bg-red-50 border border-red-200 p-2 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
        {showApproval && (
          <>
            <button
              onClick={onApprove}
              disabled={loading || needsRedactionReview}
              title={needsRedactionReview ? t('admin.prayers.moderation.redactionRequired') : undefined}
              className="btn bg-green-600 text-white hover:bg-green-700 text-sm disabled:bg-gray-300 disabled:text-gray-600 disabled:hover:bg-gray-300"
            >
              {t('admin.prayers.approve')}
            </button>
            <button
              onClick={onReject}
              disabled={loading}
              className="btn bg-yellow-600 text-white hover:bg-yellow-700 text-sm"
            >
              {t('admin.prayers.reject')}
            </button>
          </>
        )}
        <button
          onClick={onDelete}
          disabled={loading}
          className="btn-danger text-sm ml-auto"
        >
          {t('admin.prayers.delete')}
        </button>
      </div>
    </div>
  );
}

const DIGEST_TOTAL_KEYS = ['autoClean', 'autoReview', 'rejected', 'humanRedacted', 'humanConfirmedAuto', 'humanOverturned'];

/**
 * Summary of the automatic moderation decisions plus the caller's digest subscription.
 * Preview counts only; the subscription emails the same summary on a daily or weekly schedule.
 */
function DigestPanel() {
  const { t } = useTranslation();
  const [days, setDays] = useState(1);
  const [preview, setPreview] = useState({ status: 'loading', digest: null });
  const [mode, setMode] = useState('off');
  const [lastOn, setLastOn] = useState('weekly');
  const [channel, setChannel] = useState('email');
  const [subStatus, setSubStatus] = useState('loading');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.getDigestSubscription()
      .then((res) => {
        if (cancelled) return;
        const sub = res.subscription;
        if (sub) {
          setMode(sub.enabled ? sub.frequency : 'off');
          setLastOn(sub.frequency);
          setChannel(sub.channel);
        }
        setSubStatus('loaded');
      })
      .catch(() => {
        if (!cancelled) setSubStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.getDigestPreview(days)
      .then((res) => {
        if (!cancelled) setPreview({ status: 'loaded', digest: res.digest });
      })
      .catch(() => {
        if (!cancelled) setPreview({ status: 'error', digest: null });
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const handleModeChange = (next) => {
    setMode(next);
    if (next !== 'off') setLastOn(next);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.setDigestSubscription({
        frequency: mode === 'off' ? lastOn : mode,
        channel,
        enabled: mode !== 'off',
      });
      setMessage({ ok: true, text: t('admin.prayers.moderation.digest.saved') });
    } catch (error) {
      setMessage({ ok: false, text: t('admin.prayers.moderation.digest.saveError') });
    } finally {
      setSaving(false);
    }
  };

  const digest = preview.digest;
  const selectClass = 'rounded border border-gray-300 bg-white px-2 py-1 text-sm';

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-2xs space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-primary-800">{t('admin.prayers.moderation.digest.title')}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{t('admin.prayers.moderation.digest.desc')}</p>
        </div>
        <div className="flex gap-1 text-xs">
          {[1, 7].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`px-2.5 py-1 rounded-full font-medium ${
                days === d ? 'bg-primary-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {d === 1 ? t('admin.prayers.moderation.digest.day') : t('admin.prayers.moderation.digest.week')}
            </button>
          ))}
        </div>
      </div>

      {preview.status === 'loading' && <p className="text-sm text-gray-500">{t('admin.prayers.moderation.digest.loading')}</p>}
      {preview.status === 'error' && <p className="text-sm text-red-700">{t('admin.prayers.moderation.digest.loadError')}</p>}
      {preview.status === 'loaded' && digest && (
        <div className="space-y-2">
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
            {DIGEST_TOTAL_KEYS.map((key) => (
              <div key={key} className="rounded border border-gray-200 bg-gray-50 p-2">
                <dt className="text-xs text-gray-600">{t(`admin.prayers.moderation.digest.${key}`)}</dt>
                <dd className="text-lg font-semibold text-gray-900">{digest.totals[key]}</dd>
              </div>
            ))}
            <div className="rounded border border-amber-200 bg-amber-50 p-2">
              <dt className="text-xs text-amber-900">{t('admin.prayers.moderation.digest.awaiting')}</dt>
              <dd className="text-lg font-semibold text-amber-900">{digest.awaitingReview}</dd>
            </div>
          </dl>
          <p className="text-xs text-gray-600">
            <span className="font-semibold">{t('admin.prayers.moderation.digest.reasons')}:</span>{' '}
            {Object.keys(digest.byReason).length
              ? Object.entries(digest.byReason).map(([type, n]) => `${type} ${n}`).join(', ')
              : t('admin.prayers.moderation.digest.noReasons')}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 pt-3 text-sm">
        <label className="flex flex-col text-xs text-gray-600">
          {t('admin.prayers.moderation.digest.frequency')}
          <select className={selectClass} value={mode} onChange={(e) => handleModeChange(e.target.value)} disabled={subStatus !== 'loaded'}>
            <option value="off">{t('admin.prayers.moderation.digest.off')}</option>
            <option value="daily">{t('admin.prayers.moderation.digest.daily')}</option>
            <option value="weekly">{t('admin.prayers.moderation.digest.weekly')}</option>
          </select>
        </label>
        <label className="flex flex-col text-xs text-gray-600">
          {t('admin.prayers.moderation.digest.channel')}
          <select className={selectClass} value={channel} onChange={(e) => setChannel(e.target.value)} disabled={subStatus !== 'loaded'}>
            <option value="email">{t('admin.prayers.moderation.digest.channelEmail')}</option>
            <option value="inapp">{t('admin.prayers.moderation.digest.channelInapp')}</option>
          </select>
        </label>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || subStatus !== 'loaded'}
          className="px-3 py-1.5 rounded bg-primary-700 text-white text-sm font-medium hover:bg-primary-800 disabled:opacity-50"
        >
          {t('admin.prayers.moderation.digest.save')}
        </button>
        {message && (
          <span className={`text-xs ${message.ok ? 'text-green-700' : 'text-red-700'}`}>{message.text}</span>
        )}
      </div>
      {channel === 'inapp' && (
        <p className="text-xs text-gray-500">{t('admin.prayers.moderation.digest.inappNote')}</p>
      )}
      {subStatus === 'error' && <p className="text-xs text-red-700">{t('admin.prayers.moderation.digest.loadError')}</p>}
    </section>
  );
}

const BADGE_CLASSES = {
  clean: 'bg-green-100 text-green-800 border-green-200',
  needsReview: 'bg-amber-100 text-amber-900 border-amber-300',
  redactedHuman: 'bg-indigo-100 text-indigo-900 border-indigo-200',
  redactedAuto: 'bg-sky-100 text-sky-900 border-sky-200',
  redactedOther: 'bg-slate-100 text-slate-800 border-slate-200',
};

function redactionBadgeKey(prayer) {
  if (prayer.redactionStatus === 'clean') return 'clean';
  if (prayer.redactionStatus === 'needs_review') return 'needsReview';
  if (prayer.redactionStatus === 'redacted') {
    if (prayer.redactionSource === 'human') return 'redactedHuman';
    if (prayer.redactionSource === 'auto') return 'redactedAuto';
    return 'redactedOther';
  }
  return null;
}

/**
 * Formats a decision's `reasons`: an array of strings, or an object mapping
 * finding type to count (e.g. {"phone":1,"url":2}). Returns null when empty.
 */
function formatDecisionReasons(reasons, t) {
  if (Array.isArray(reasons)) return reasons.length > 0 ? reasons.join(', ') : null;
  if (reasons && typeof reasons === 'object') {
    const parts = Object.entries(reasons).map(
      ([type, count]) =>
        `${t(`prayers.submit.findingTypes.${type}`, { defaultValue: type })} ×${count}`
    );
    return parts.length > 0 ? parts.join(', ') : null;
  }
  return null;
}

/**
 * Staff-only moderation view for a public prayer: original text, the
 * publishable (redacted) version, and the decision history.
 * Rendered only in the admin view; public components never see originalContent.
 */
function RedactionPanel({ prayer, onChanged }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(prayer.redactedContent ?? '');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState({ status: 'idle', items: [] });

  // Reset the editor only when the stored redacted text actually changes.
  useEffect(() => {
    setDraft(prayer.redactedContent ?? '');
  }, [prayer.id, prayer.redactedContent]);

  const badgeKey = redactionBadgeKey(prayer);
  const needsReview = prayer.redactionStatus === 'needs_review';
  const findingTypes = [...new Set((prayer.moderationFindings || []).map((f) => f.type).filter(Boolean))];

  const loadHistory = async () => {
    setHistory({ status: 'loading', items: [] });
    try {
      const res = await api.getPrayerDecisions(prayer.id);
      setHistory({ status: 'loaded', items: res?.decisions || [] });
    } catch {
      setHistory({ status: 'error', items: [] });
    }
  };

  const toggleHistory = () => {
    const next = !historyOpen;
    setHistoryOpen(next);
    if (next) loadHistory();
  };

  const runAction = async (action, successText) => {
    setSaving(true);
    setNotice(null);
    try {
      await action();
      setNotice({ type: 'success', text: successText });
      if (historyOpen) loadHistory();
      onChanged?.();
    } catch (error) {
      const code = error.data?.error?.code;
      const text =
        code === 'REDACTION_STILL_HAS_DATA'
          ? t('admin.prayers.moderation.stillHasData')
          : error.message || t('admin.prayers.moderation.actionError');
      setNotice({ type: 'error', text });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () =>
    runAction(() => api.saveRedaction(prayer.id, draft), t('admin.prayers.moderation.saved'));

  const handleConfirm = () =>
    runAction(() => api.confirmRedaction(prayer.id), t('admin.prayers.moderation.confirmed'));

  return (
    <div className="space-y-3 mb-4">
      <div className="flex flex-wrap items-center gap-2">
        {badgeKey && (
          <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${BADGE_CLASSES[badgeKey]}`}>
            {t(`admin.prayers.moderation.status.${badgeKey}`)}
          </span>
        )}
        {findingTypes.length > 0 && (
          <span className="text-xs text-gray-700">
            <span className="font-semibold">{t('admin.prayers.moderation.findingsLabel')}:</span>{' '}
            {findingTypes.map((type) => t(`prayers.submit.findingTypes.${type}`, { defaultValue: type })).join(', ')}
          </span>
        )}
      </div>

      <div className="rounded-lg border border-red-100 bg-red-50/40 p-3">
        <p className="text-xs font-semibold text-red-900 mb-1">
          {t('admin.prayers.moderation.originalLabel')}
        </p>
        <p className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed">
          {prayer.originalContent ?? prayer.content}
        </p>
      </div>

      <div>
        <label htmlFor={`redacted-${prayer.id}`} className="block text-xs font-semibold text-gray-700 mb-1">
          {t('admin.prayers.moderation.redactedLabel')}
        </label>
        <textarea
          id={`redacted-${prayer.id}`}
          className="textarea w-full h-24 text-sm"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={saving}
        />
        {needsReview && (
          <p className="mt-1 text-xs font-medium text-amber-800">
            {t('admin.prayers.moderation.redactionRequired')}
          </p>
        )}
        {notice && (
          <p
            role={notice.type === 'error' ? 'alert' : 'status'}
            className={`mt-2 rounded-lg p-2 text-sm ${
              notice.type === 'error'
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-green-50 border border-green-200 text-green-800'
            }`}
          >
            {notice.text}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={handleSave} disabled={saving} className="btn-secondary text-sm">
            {t('admin.prayers.moderation.saveRedaction')}
          </button>
          {needsReview && (
            <button type="button" onClick={handleConfirm} disabled={saving} className="btn-secondary text-sm">
              {t('admin.prayers.moderation.confirmRedaction')}
            </button>
          )}
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={toggleHistory}
          aria-expanded={historyOpen}
          className="text-xs font-semibold text-primary-700 hover:text-primary-800"
        >
          {historyOpen ? '▲' : '▼'} {t('admin.prayers.moderation.history')}
        </button>
        {historyOpen && (
          <div className="mt-2 text-xs text-gray-700">
            {history.status === 'loading' && <p>{t('common.loading')}</p>}
            {history.status === 'error' && (
              <p className="text-red-700">{t('admin.prayers.moderation.historyError')}</p>
            )}
            {history.status === 'loaded' && history.items.length === 0 && (
              <p>{t('admin.prayers.moderation.historyEmpty')}</p>
            )}
            {history.status === 'loaded' && history.items.length > 0 && (
              <ul className="space-y-1.5">
                {history.items.map((d, i) => (
                  <li key={i} className="rounded border border-gray-200 bg-white p-2">
                    <span className="font-semibold">{d.decision}</span>
                    {' · '}
                    <span>{d.actor}</span>
                    {' · '}
                    <span className="text-gray-500">
                      {d.createdAt ? new Date(d.createdAt).toLocaleString() : ''}
                    </span>
                    {formatDecisionReasons(d.reasons, t) && (
                      <div className="mt-0.5 text-gray-600">
                        {t('admin.prayers.moderation.reasons')}: {formatDecisionReasons(d.reasons, t)}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PrayerManager;
