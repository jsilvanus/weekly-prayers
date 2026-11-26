import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';

// Must match ROLE_TARGETS in backend/src/services/mailingService.js (admin is not a mailing target).
const ROLE_TARGETS = ['coordinator', 'worker', 'bishop', 'devotion', 'prayer_group', 'user'];
// Index = JavaScript getDay() value (0 = Sunday), as the backend expects for sendWeekday.
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const INPUT_CLASS =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500';
const LABEL_CLASS = 'block text-xs font-semibold text-gray-700 mb-1';
const SECTION_CLASS = 'bg-white rounded-xl p-5 border border-gray-200 shadow-2xs space-y-4';

/** ISO week and ISO week-year for a date (defaults to today). */
function isoWeekInfo(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

/** Message from an ApiError, including the server's validation details ({error:{message,details}}). */
function apiErrorText(err) {
  const details = err?.data?.error?.details;
  const message = err?.message || '';
  if (Array.isArray(details) && details.length > 0) {
    return `${message}: ${details.map((d) => (typeof d === 'string' ? d : JSON.stringify(d))).join('; ')}`;
  }
  return message;
}

function Banner({ feedback, onClose }) {
  if (!feedback) return null;
  const tone = feedback.type === 'error' ? 'bg-red-50 text-red-800 border-red-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200';
  return (
    <div className={`p-3 rounded-lg text-sm border flex items-start justify-between gap-2 ${tone}`} role="status">
      <span>{feedback.text}</span>
      <button type="button" onClick={onClose} className="text-xs font-bold px-2 py-0.5 rounded hover:bg-black/10">
        ×
      </button>
    </div>
  );
}

function Badge({ children, tone = 'gray' }) {
  const tones = {
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
    green: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full border ${tones[tone]}`}>{children}</span>;
}

// ---------------------------------------------------------------------------
// Lists and subscribers
// ---------------------------------------------------------------------------

function ListForm({ initial, onCancel, onSaved, onFeedback }) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [allowPublicSignup, setAllowPublicSignup] = useState(initial?.allowPublicSignup === true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError(t('admin.mailing.lists.errorName'));
      return;
    }
    setSaving(true);
    setFormError(null);
    const body = { name: name.trim(), description: description.trim() || null, allowPublicSignup };
    try {
      if (initial) await api.updateMailingList(initial.id, body);
      else await api.createMailingList(body);
      onFeedback({ type: 'success', text: t('admin.mailing.lists.saved') });
      onSaved();
    } catch (err) {
      setFormError(apiErrorText(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={SECTION_CLASS} aria-label={t('admin.mailing.lists.formTitle')}>
      <h4 className="font-semibold text-gray-900 text-sm">
        {initial ? t('admin.mailing.lists.edit') : t('admin.mailing.lists.new')}
      </h4>
      {formError && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{formError}</p>}
      <div>
        <label className={LABEL_CLASS} htmlFor="mailing-list-name">{t('admin.mailing.lists.name')}</label>
        <input id="mailing-list-name" className={INPUT_CLASS} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label className={LABEL_CLASS} htmlFor="mailing-list-description">{t('admin.mailing.lists.description')}</label>
        <textarea id="mailing-list-description" className={INPUT_CLASS} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <label className="flex items-start gap-2 text-sm text-gray-700">
        <input type="checkbox" className="mt-1" checked={allowPublicSignup} onChange={(e) => setAllowPublicSignup(e.target.checked)} />
        <span>
          {t('admin.mailing.lists.allowPublicSignup')}
          <span className="block text-xs text-gray-500">{t('admin.mailing.lists.allowPublicSignupHint')}</span>
        </span>
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary text-sm py-2 px-4">{t('admin.mailing.cancel')}</button>
        <button type="submit" disabled={saving} className="btn-primary text-sm py-2 px-4 disabled:opacity-50">
          {saving ? t('admin.mailing.saving') : t('admin.mailing.save')}
        </button>
      </div>
    </form>
  );
}

function SubscribersPanel({ list, onChanged, onFeedback }) {
  const { t } = useTranslation();
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [emails, setEmails] = useState('');
  const [name, setName] = useState('');
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const loadSubscribers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getMailingSubscribers(list.id);
      setSubscribers(res?.subscribers || []);
    } catch (err) {
      onFeedback({ type: 'error', text: apiErrorText(err) });
    } finally {
      setLoading(false);
    }
  }, [list.id, onFeedback]);

  useEffect(() => {
    setEmails('');
    setName('');
    setConsentConfirmed(false);
    setFormError(null);
    loadSubscribers();
  }, [loadSubscribers]);

  const handleAdd = async (e) => {
    e.preventDefault();
    // The consent checkbox is mandatory: staff must attest consent before any address is stored.
    if (!consentConfirmed) {
      setFormError(t('admin.mailing.subscribers.errorConsent'));
      return;
    }
    const addresses = emails.split(/[\s,;]+/).filter(Boolean);
    if (addresses.length === 0) {
      setFormError(t('admin.mailing.subscribers.errorEmails'));
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const res = await api.addMailingSubscribers(list.id, {
        emails: addresses,
        name: name.trim() || null,
        consentConfirmed: true,
      });
      const invalid = Array.isArray(res?.invalid) ? res.invalid.length : 0;
      onFeedback({
        type: invalid > 0 ? 'error' : 'success',
        text: t('admin.mailing.subscribers.result', {
          added: res?.added ?? 0,
          alreadyPresent: res?.alreadyPresent ?? 0,
          invalid,
        }),
      });
      setEmails('');
      setName('');
      setConsentConfirmed(false);
      await loadSubscribers();
      onChanged();
    } catch (err) {
      setFormError(apiErrorText(err));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (subscriber) => {
    if (!window.confirm(t('admin.mailing.subscribers.confirmRemove', { email: subscriber.email }))) return;
    try {
      await api.removeMailingSubscriber(subscriber.id);
      onFeedback({ type: 'success', text: t('admin.mailing.subscribers.removed') });
      await loadSubscribers();
      onChanged();
    } catch (err) {
      onFeedback({ type: 'error', text: apiErrorText(err) });
    }
  };

  const statusTone = { active: 'green', pending: 'amber', unsubscribed: 'red' };

  return (
    <div className={SECTION_CLASS}>
      <h4 className="font-semibold text-gray-900 text-sm">
        {t('admin.mailing.subscribers.heading', { name: list.name })}
      </h4>

      <form onSubmit={handleAdd} className="space-y-3" aria-label={t('admin.mailing.subscribers.addTitle')}>
        {formError && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{formError}</p>}
        <div>
          <label className={LABEL_CLASS} htmlFor="mailing-subscriber-emails">{t('admin.mailing.subscribers.emails')}</label>
          <textarea
            id="mailing-subscriber-emails"
            className={INPUT_CLASS}
            rows={3}
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            placeholder="nimi@example.fi, toinen@example.fi"
          />
          <p className="text-xs text-gray-500 mt-1">{t('admin.mailing.subscribers.emailsHint')}</p>
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="mailing-subscriber-name">{t('admin.mailing.subscribers.name')}</label>
          <input id="mailing-subscriber-name" className={INPUT_CLASS} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
        </div>
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            className="mt-1"
            checked={consentConfirmed}
            onChange={(e) => setConsentConfirmed(e.target.checked)}
            required
          />
          <span>
            {t('admin.mailing.subscribers.consent')}
            <span className="block text-xs text-gray-500">{t('admin.mailing.subscribers.consentHint')}</span>
          </span>
        </label>
        <div className="flex justify-end">
          <button type="submit" disabled={saving || !consentConfirmed} className="btn-primary text-sm py-2 px-4 disabled:opacity-50">
            {saving ? t('admin.mailing.saving') : t('admin.mailing.subscribers.add')}
          </button>
        </div>
      </form>

      <div className="border-t border-gray-100 pt-4">
        {loading ? (
          <p className="text-sm text-gray-500">{t('common.loading')}</p>
        ) : subscribers.length === 0 ? (
          <p className="text-sm text-gray-500">{t('admin.mailing.subscribers.empty')}</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {subscribers.map((s) => (
              <li key={s.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm text-gray-900 break-all">
                    {s.email}
                    {s.name && <span className="text-gray-500"> ({s.name})</span>}
                  </div>
                  <div className="text-xs text-gray-500 flex flex-wrap gap-2 mt-0.5">
                    <Badge tone={statusTone[s.status] || 'gray'}>{t(`admin.mailing.subscribers.status.${s.status}`, { defaultValue: s.status })}</Badge>
                    <span>{t(`admin.mailing.subscribers.source.${s.consentSource}`, { defaultValue: s.consentSource })}</span>
                  </div>
                </div>
                <button type="button" onClick={() => handleRemove(s)} className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 hover:bg-red-50 rounded">
                  {t('admin.mailing.subscribers.remove')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ListsSection({ lists, onChanged, onFeedback }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(null); // null | 'new' | list
  const [selectedId, setSelectedId] = useState(null);
  const selected = lists.find((l) => l.id === selectedId) || null;

  const handleDelete = async (list) => {
    if (!window.confirm(t('admin.mailing.lists.confirmDelete', { name: list.name }))) return;
    try {
      await api.deleteMailingList(list.id);
      if (selectedId === list.id) setSelectedId(null);
      onFeedback({ type: 'success', text: t('admin.mailing.lists.deleted') });
      onChanged();
    } catch (err) {
      onFeedback({ type: 'error', text: apiErrorText(err) });
    }
  };

  return (
    <section className="space-y-4" aria-labelledby="mailing-lists-heading">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 id="mailing-lists-heading" className="font-martti text-lg font-bold text-gray-900">{t('admin.mailing.lists.heading')}</h3>
          <p className="text-xs text-gray-500">{t('admin.mailing.lists.desc')}</p>
        </div>
        <button type="button" onClick={() => setEditing('new')} className="btn-primary text-sm py-2 px-4 shrink-0">
          {t('admin.mailing.lists.new')}
        </button>
      </div>

      {editing && (
        <ListForm
          key={editing === 'new' ? 'new' : editing.id}
          initial={editing === 'new' ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChanged();
          }}
          onFeedback={onFeedback}
        />
      )}

      {lists.length === 0 ? (
        <p className="text-sm text-gray-500 bg-white rounded-xl border border-dashed border-gray-300 p-6 text-center">
          {t('admin.mailing.lists.empty')}
        </p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {lists.map((list) => (
            <li
              key={list.id}
              className={`bg-white rounded-xl p-4 border shadow-2xs flex flex-col gap-2 ${selectedId === list.id ? 'border-primary-500 ring-1 ring-primary-500' : 'border-gray-200'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-gray-900 break-words">{list.name}</h4>
                {list.allowPublicSignup && <Badge tone="green">{t('admin.mailing.lists.publicBadge')}</Badge>}
              </div>
              {list.description && <p className="text-xs text-gray-600">{list.description}</p>}
              <p className="text-xs text-gray-500">
                {t('admin.mailing.lists.counts', { active: list.activeCount ?? 0, pending: list.pendingCount ?? 0 })}
              </p>
              <div className="flex flex-wrap justify-end gap-1 mt-auto pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setSelectedId(selectedId === list.id ? null : list.id)} className="text-xs text-primary-700 hover:text-primary-900 font-medium px-2 py-1 hover:bg-primary-50 rounded">
                  {selectedId === list.id ? t('admin.mailing.lists.hideSubscribers') : t('admin.mailing.lists.manageSubscribers')}
                </button>
                <button type="button" onClick={() => setEditing(list)} className="text-xs text-gray-700 hover:text-gray-900 font-medium px-2 py-1 hover:bg-gray-100 rounded">
                  {t('admin.mailing.lists.edit')}
                </button>
                <button type="button" onClick={() => handleDelete(list)} className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 hover:bg-red-50 rounded">
                  {t('admin.mailing.lists.delete')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {selected && <SubscribersPanel key={selected.id} list={selected} onChanged={onChanged} onFeedback={onFeedback} />}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Mailings
// ---------------------------------------------------------------------------

function emptyMailingForm() {
  const { week, year } = isoWeekInfo();
  return {
    name: '',
    target: '', // 'list:<uuid>' or 'role:<role>'
    kind: 'week',
    week,
    year,
    sendDates: [''],
    sendWeekday: 0,
    startDate: '',
    endDate: '',
    sendHour: 8,
    subject: '',
    includePublic: false,
    enabled: true,
  };
}

function mailingToForm(m) {
  const base = emptyMailingForm();
  return {
    ...base,
    name: m.name || '',
    target: m.targetType === 'list' ? `list:${m.listId}` : `role:${m.targetRole}`,
    kind: m.kind,
    week: m.week ?? base.week,
    year: m.year ?? base.year,
    sendDates: m.sendDates?.length ? [...m.sendDates] : [''],
    sendWeekday: m.sendWeekday ?? 0,
    startDate: m.startDate || '',
    endDate: m.endDate || '',
    sendHour: m.sendHour ?? 8,
    subject: m.subject || '',
    includePublic: m.includePublic === true,
    enabled: m.enabled !== false,
  };
}

/** Client-side checks that mirror the backend rules; returns translation keys. */
function validateMailingForm(f) {
  const errors = [];
  if (!f.name.trim()) errors.push('admin.mailing.errors.name');
  if (!f.target) errors.push('admin.mailing.errors.target');
  if (f.kind === 'week') {
    const week = Number(f.week);
    const year = Number(f.year);
    if (!Number.isInteger(week) || week < 1 || week > 53) errors.push('admin.mailing.errors.week');
    if (!Number.isInteger(year) || year < 2000 || year > 2100) errors.push('admin.mailing.errors.year');
    const dates = f.sendDates.filter(Boolean);
    if (dates.length === 0) errors.push('admin.mailing.errors.sendDates');
    else if (!dates.every((d) => DATE_RE.test(d))) errors.push('admin.mailing.errors.sendDateFormat');
  } else {
    if (f.sendWeekday === '' || f.sendWeekday === null) errors.push('admin.mailing.errors.weekday');
    if (!DATE_RE.test(f.startDate)) errors.push('admin.mailing.errors.startDate');
    if (f.endDate && (!DATE_RE.test(f.endDate) || f.endDate < f.startDate)) errors.push('admin.mailing.errors.endDate');
  }
  const hour = Number(f.sendHour);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) errors.push('admin.mailing.errors.sendHour');
  return errors;
}

function buildMailingBody(f) {
  const sep = f.target.indexOf(':');
  const targetType = f.target.slice(0, sep);
  const targetValue = f.target.slice(sep + 1);
  const body = {
    name: f.name.trim(),
    targetType,
    kind: f.kind,
    sendHour: Number(f.sendHour),
    subject: f.subject.trim() || null,
    includePublic: f.includePublic,
    enabled: f.enabled,
  };
  if (targetType === 'list') body.listId = targetValue;
  else body.targetRole = targetValue;

  if (f.kind === 'week') {
    body.week = Number(f.week);
    body.year = Number(f.year);
    body.sendDates = f.sendDates.filter(Boolean);
  } else {
    body.sendWeekday = Number(f.sendWeekday);
    body.startDate = f.startDate;
    body.endDate = f.endDate || null;
  }
  return body;
}

function MailingForm({ lists, initial, onCancel, onSaved, onFeedback }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(() => (initial ? mailingToForm(initial) : emptyMailingForm()));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [serverError, setServerError] = useState(null);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const setDate = (index, value) =>
    setForm((prev) => ({ ...prev, sendDates: prev.sendDates.map((d, i) => (i === index ? value : d)) }));
  const addDate = () => setForm((prev) => ({ ...prev, sendDates: [...prev.sendDates, ''] }));
  const removeDate = (index) =>
    setForm((prev) => {
      const next = prev.sendDates.filter((_, i) => i !== index);
      return { ...prev, sendDates: next.length ? next : [''] };
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const localErrors = validateMailingForm(form);
    setErrors(localErrors);
    setServerError(null);
    if (localErrors.length > 0) return;

    setSaving(true);
    try {
      const body = buildMailingBody(form);
      if (initial) await api.updateMailing(initial.id, body);
      else await api.createMailing(body);
      onFeedback({ type: 'success', text: t('admin.mailing.saved') });
      onSaved();
    } catch (err) {
      setServerError(apiErrorText(err));
    } finally {
      setSaving(false);
    }
  };

  const isWeek = form.kind === 'week';

  return (
    <form onSubmit={handleSubmit} noValidate className={SECTION_CLASS} aria-label={t('admin.mailing.form.title')}>
      <h4 className="font-semibold text-gray-900 text-sm">
        {initial ? t('admin.mailing.edit') : t('admin.mailing.new')}
      </h4>

      {(errors.length > 0 || serverError) && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 space-y-1" role="alert">
          {serverError && <p>{serverError}</p>}
          {errors.map((key) => (
            <p key={key}>{t(key)}</p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={LABEL_CLASS} htmlFor="mailing-name">{t('admin.mailing.form.name')}</label>
          <input id="mailing-name" className={INPUT_CLASS} value={form.name} maxLength={120} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="mailing-target">{t('admin.mailing.form.target')}</label>
          <select id="mailing-target" className={INPUT_CLASS} value={form.target} onChange={(e) => set('target', e.target.value)}>
            <option value="">{t('admin.mailing.form.pickTarget')}</option>
            <optgroup label={t('admin.mailing.form.targetLists')}>
              {lists.map((l) => (
                <option key={l.id} value={`list:${l.id}`}>{l.name}</option>
              ))}
            </optgroup>
            <optgroup label={t('admin.mailing.form.targetGroups')}>
              {ROLE_TARGETS.map((r) => (
                <option key={r} value={`role:${r}`}>{t(`admin.users.roles.${r}`)}</option>
              ))}
            </optgroup>
          </select>
          {lists.length === 0 && <p className="text-xs text-gray-500 mt-1">{t('admin.mailing.form.noLists')}</p>}
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className={LABEL_CLASS}>{t('admin.mailing.form.kind')}</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="mailing-kind" value="week" checked={isWeek} onChange={() => set('kind', 'week')} />
            {t('admin.mailing.form.kindWeek')}
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="mailing-kind" value="recurring" checked={!isWeek} onChange={() => set('kind', 'recurring')} />
            {t('admin.mailing.form.kindRecurring')}
          </label>
        </div>

        {isWeek ? (
          <div className="space-y-3 bg-gray-50 rounded-lg p-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLASS} htmlFor="mailing-week">{t('admin.mailing.form.week')}</label>
                <input id="mailing-week" type="number" min={1} max={53} className={INPUT_CLASS} value={form.week} onChange={(e) => set('week', e.target.value)} />
              </div>
              <div>
                <label className={LABEL_CLASS} htmlFor="mailing-year">{t('admin.mailing.form.year')}</label>
                <input id="mailing-year" type="number" min={2000} max={2100} className={INPUT_CLASS} value={form.year} onChange={(e) => set('year', e.target.value)} />
              </div>
            </div>
            <div>
              <span className={LABEL_CLASS}>{t('admin.mailing.form.sendDates')} *</span>
              <div className="space-y-2">
                {form.sendDates.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="date"
                      aria-label={t('admin.mailing.form.sendDate', { n: i + 1 })}
                      className={INPUT_CLASS}
                      value={d}
                      onChange={(e) => setDate(i, e.target.value)}
                    />
                    <button type="button" onClick={() => removeDate(i)} className="text-xs text-red-600 hover:text-red-800 px-2 py-1 hover:bg-red-50 rounded shrink-0">
                      {t('admin.mailing.form.removeDate')}
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addDate} className="mt-2 text-xs text-primary-700 hover:text-primary-900 font-medium px-2 py-1 hover:bg-primary-50 rounded">
                + {t('admin.mailing.form.addDate')}
              </button>
              <p className="text-xs text-gray-500 mt-1">{t('admin.mailing.form.sendDatesHint')}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-50 rounded-lg p-3">
            <div>
              <label className={LABEL_CLASS} htmlFor="mailing-weekday">{t('admin.mailing.form.weekday')} *</label>
              <select id="mailing-weekday" className={INPUT_CLASS} value={form.sendWeekday} onChange={(e) => set('sendWeekday', Number(e.target.value))}>
                {WEEKDAY_KEYS.map((key, i) => (
                  <option key={key} value={i}>{t(`admin.mailing.weekdays.${key}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL_CLASS} htmlFor="mailing-start">{t('admin.mailing.form.startDate')} *</label>
              <input id="mailing-start" type="date" className={INPUT_CLASS} value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
            </div>
            <div>
              <label className={LABEL_CLASS} htmlFor="mailing-end">{t('admin.mailing.form.endDate')}</label>
              <input id="mailing-end" type="date" className={INPUT_CLASS} value={form.endDate} min={form.startDate || undefined} onChange={(e) => set('endDate', e.target.value)} />
              <p className="text-xs text-gray-500 mt-1">{t('admin.mailing.form.endDateHint')}</p>
            </div>
          </div>
        )}
      </fieldset>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={LABEL_CLASS} htmlFor="mailing-hour">{t('admin.mailing.form.sendHour')}</label>
          <input id="mailing-hour" type="number" min={0} max={23} className={INPUT_CLASS} value={form.sendHour} onChange={(e) => set('sendHour', e.target.value)} />
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="mailing-subject">{t('admin.mailing.form.subject')}</label>
          <input id="mailing-subject" className={INPUT_CLASS} value={form.subject} maxLength={200} onChange={(e) => set('subject', e.target.value)} />
        </div>
      </div>

      <div className="space-y-2 text-sm text-gray-700">
        <label className="flex items-start gap-2">
          <input type="checkbox" className="mt-1" checked={form.includePublic} onChange={(e) => set('includePublic', e.target.checked)} />
          <span>
            {t('admin.mailing.form.includePublic')}
            <span className="block text-xs text-gray-500">{t('admin.mailing.form.includePublicHint')}</span>
          </span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} />
          {t('admin.mailing.form.enabled')}
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary text-sm py-2 px-4">{t('admin.mailing.cancel')}</button>
        <button type="submit" disabled={saving} className="btn-primary text-sm py-2 px-4 disabled:opacity-50">
          {saving ? t('admin.mailing.saving') : t('admin.mailing.save')}
        </button>
      </div>
    </form>
  );
}

function MailingDetail({ detail, onClose, onFeedback }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setData(null);
    const load = detail.type === 'preview'
      ? api.previewMailing(detail.mailingId)
      : api.getMailingSends(detail.mailingId).then((res) => res?.sends || []);
    load
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) onFeedback({ type: 'error', text: apiErrorText(err) });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detail.type, detail.mailingId, onFeedback]);

  return (
    <div className={SECTION_CLASS} aria-label={t(`admin.mailing.detail.${detail.type}`)}>
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-semibold text-gray-900 text-sm">{t(`admin.mailing.detail.${detail.type}`)}</h4>
        <button type="button" onClick={onClose} className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 hover:bg-gray-100 rounded">
          {t('admin.mailing.close')}
        </button>
      </div>

      {loading && <p className="text-sm text-gray-500">{t('common.loading')}</p>}

      {!loading && data && detail.type === 'preview' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">{t('admin.mailing.preview.subject')}:</span> {data.subject}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-semibold">{t('admin.mailing.preview.recipients')}:</span> {data.recipientCount}
          </p>
          {/* Sandboxed with no permissions: the rendered mail cannot run scripts or navigate the admin page. */}
          <iframe
            title={t('admin.mailing.preview.frameTitle')}
            sandbox=""
            srcDoc={data.html}
            className="w-full h-96 border border-gray-200 rounded-lg bg-white"
          />
        </div>
      )}

      {!loading && Array.isArray(data) && detail.type === 'sends' && (
        data.length === 0 ? (
          <p className="text-sm text-gray-500">{t('admin.mailing.sends.empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-3 font-semibold">{t('admin.mailing.sends.date')}</th>
                  <th className="py-2 pr-3 font-semibold">{t('admin.mailing.sends.status')}</th>
                  <th className="py-2 pr-3 font-semibold">{t('admin.mailing.sends.recipients')}</th>
                  <th className="py-2 pr-3 font-semibold">{t('admin.mailing.sends.failed')}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100">
                    <td className="py-2 pr-3">{s.sendDate}</td>
                    <td className="py-2 pr-3">{t(`admin.mailing.sends.statuses.${s.status}`, { defaultValue: s.status })}</td>
                    <td className="py-2 pr-3">{s.recipients}</td>
                    <td className="py-2 pr-3">{s.failed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

function MailingsSection({ lists, mailings, onChanged, onFeedback }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(null); // null | 'new' | mailing
  const [detail, setDetail] = useState(null); // { type: 'preview'|'sends', mailingId }

  const listName = (m) => {
    if (m.targetType === 'role') return t(`admin.users.roles.${m.targetRole}`, { defaultValue: m.targetRole });
    return lists.find((l) => l.id === m.listId)?.name || t('admin.mailing.unknownList');
  };

  const scheduleText = (m) => {
    if (m.kind === 'week') {
      return t('admin.mailing.schedule.week', { week: m.week, year: m.year, dates: (m.sendDates || []).join(', ') });
    }
    const weekday = t(`admin.mailing.weekdays.${WEEKDAY_KEYS[m.sendWeekday]}`);
    return m.endDate
      ? t('admin.mailing.schedule.recurringUntil', { weekday, start: m.startDate, end: m.endDate })
      : t('admin.mailing.schedule.recurring', { weekday, start: m.startDate });
  };

  const handleToggle = async (m) => {
    try {
      // PUT takes the full definition, so resend the current values with enabled flipped.
      const body = {
        name: m.name,
        targetType: m.targetType,
        listId: m.targetType === 'list' ? m.listId : undefined,
        targetRole: m.targetType === 'role' ? m.targetRole : undefined,
        kind: m.kind,
        week: m.week ?? undefined,
        year: m.year ?? undefined,
        sendDates: m.sendDates ?? undefined,
        sendWeekday: m.sendWeekday ?? undefined,
        startDate: m.startDate ?? undefined,
        endDate: m.endDate ?? undefined,
        sendHour: m.sendHour,
        subject: m.subject ?? null,
        includePublic: m.includePublic,
        enabled: !m.enabled,
      };
      await api.updateMailing(m.id, body);
      onFeedback({ type: 'success', text: t('admin.mailing.saved') });
      onChanged();
    } catch (err) {
      onFeedback({ type: 'error', text: apiErrorText(err) });
    }
  };

  const handleDelete = async (m) => {
    if (!window.confirm(t('admin.mailing.confirmDelete', { name: m.name }))) return;
    try {
      await api.deleteMailing(m.id);
      if (detail?.mailingId === m.id) setDetail(null);
      onFeedback({ type: 'success', text: t('admin.mailing.deleted') });
      onChanged();
    } catch (err) {
      onFeedback({ type: 'error', text: apiErrorText(err) });
    }
  };

  const handleTest = async (m) => {
    try {
      await api.sendMailingTest(m.id);
      onFeedback({ type: 'success', text: t('admin.mailing.testSent') });
    } catch (err) {
      onFeedback({ type: 'error', text: apiErrorText(err) });
    }
  };

  const openDetail = (type, m) => {
    if (detail?.type === type && detail?.mailingId === m.id) setDetail(null);
    else setDetail({ type, mailingId: m.id });
  };

  const handleSaved = () => {
    setEditing(null);
    onChanged();
  };

  const detailMailing = detail ? mailings.find((m) => m.id === detail.mailingId) : null;

  return (
    <section className="space-y-4" aria-labelledby="mailings-heading">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 id="mailings-heading" className="font-martti text-lg font-bold text-gray-900">{t('admin.mailing.heading')}</h3>
          <p className="text-xs text-gray-500">{t('admin.mailing.desc')}</p>
        </div>
        <button type="button" onClick={() => setEditing('new')} className="btn-primary text-sm py-2 px-4 shrink-0">
          {t('admin.mailing.new')}
        </button>
      </div>

      {editing && (
        <MailingForm
          key={editing === 'new' ? 'new' : editing.id}
          lists={lists}
          initial={editing === 'new' ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={handleSaved}
          onFeedback={onFeedback}
        />
      )}

      {mailings.length === 0 ? (
        <p className="text-sm text-gray-500 bg-white rounded-xl border border-dashed border-gray-300 p-6 text-center">
          {t('admin.mailing.empty')}
        </p>
      ) : (
        <ul className="space-y-3">
          {mailings.map((m) => (
            <li key={m.id} className="bg-white rounded-xl p-4 border border-gray-200 shadow-2xs space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="font-semibold text-gray-900 break-words">{m.name}</h4>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {t('admin.mailing.target')}: {listName(m)} · {t(`admin.mailing.kinds.${m.kind}`)}
                  </p>
                  <p className="text-xs text-gray-500">{scheduleText(m)}</p>
                  <p className="text-xs text-gray-500">
                    {t('admin.mailing.sendHourShort', { hour: m.sendHour })}
                  </p>
                </div>
                <Badge tone={m.enabled ? 'green' : 'gray'}>{m.enabled ? t('admin.mailing.enabled') : t('admin.mailing.disabled')}</Badge>
              </div>
              <div className="flex flex-wrap justify-end gap-1 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => openDetail('preview', m)} className="text-xs text-primary-700 hover:text-primary-900 font-medium px-2 py-1 hover:bg-primary-50 rounded">
                  {t('admin.mailing.preview.button')}
                </button>
                <button type="button" onClick={() => handleTest(m)} className="text-xs text-primary-700 hover:text-primary-900 font-medium px-2 py-1 hover:bg-primary-50 rounded">
                  {t('admin.mailing.testButton')}
                </button>
                <button type="button" onClick={() => openDetail('sends', m)} className="text-xs text-gray-700 hover:text-gray-900 font-medium px-2 py-1 hover:bg-gray-100 rounded">
                  {t('admin.mailing.sends.button')}
                </button>
                <button type="button" onClick={() => handleToggle(m)} className="text-xs text-gray-700 hover:text-gray-900 font-medium px-2 py-1 hover:bg-gray-100 rounded">
                  {m.enabled ? t('admin.mailing.disable') : t('admin.mailing.enable')}
                </button>
                <button type="button" onClick={() => setEditing(m)} className="text-xs text-gray-700 hover:text-gray-900 font-medium px-2 py-1 hover:bg-gray-100 rounded">
                  {t('admin.mailing.edit')}
                </button>
                <button type="button" onClick={() => handleDelete(m)} className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 hover:bg-red-50 rounded">
                  {t('admin.mailing.delete')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {detail && detailMailing && (
        <MailingDetail key={`${detail.type}-${detail.mailingId}`} detail={detail} onClose={() => setDetail(null)} onFeedback={onFeedback} />
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Tab root
// ---------------------------------------------------------------------------

export default function MailingManager() {
  const { t } = useTranslation();
  const [lists, setLists] = useState([]);
  const [mailings, setMailings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  const reload = useCallback(async () => {
    try {
      const [listRes, mailingRes] = await Promise.all([api.getMailingLists(), api.getMailings()]);
      setLists(listRes?.lists || []);
      setMailings(mailingRes?.mailings || []);
    } catch (err) {
      setFeedback({ type: 'error', text: apiErrorText(err) || t('admin.mailing.loadError') });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (loading) {
    return <div className="text-center py-8 text-gray-500">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-10">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="font-martti text-xl font-bold text-primary-900">{t('admin.mailing.title')}</h2>
        <p className="text-xs text-gray-600 mt-1">{t('admin.mailing.intro')}</p>
      </div>

      <Banner feedback={feedback} onClose={() => setFeedback(null)} />

      <ListsSection lists={lists} onChanged={reload} onFeedback={setFeedback} />
      <MailingsSection lists={lists} mailings={mailings} onChanged={reload} onFeedback={setFeedback} />
    </div>
  );
}
