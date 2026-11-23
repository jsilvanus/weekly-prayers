import { useState } from 'react';
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

  const handleApprove = async (id, approved) => {
    setActionLoading(id);
    try {
      await api.approvePrayer(id, approved);
      refetch();
    } catch (error) {
      alert(error.message);
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

  if (loading) {
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
              loading={actionLoading === prayer.id}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PrayerItem({ prayer, onApprove, onReject, onDelete, onPortalChange, loading, showApproval }) {
  const { t } = useTranslation();

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

      <p className="text-gray-800 mb-4 whitespace-pre-wrap text-sm leading-relaxed">
        {prayer.originalContent || prayer.content}
      </p>

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

      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
        {showApproval && (
          <>
            <button
              onClick={onApprove}
              disabled={loading}
              className="btn bg-green-600 text-white hover:bg-green-700 text-sm"
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

export default PrayerManager;
