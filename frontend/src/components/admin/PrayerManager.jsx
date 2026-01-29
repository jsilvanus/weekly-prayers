import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePrayers } from '../../hooks/usePrayers';
import { api } from '../../services/api';

function PrayerManager() {
  const { t } = useTranslation();
  const { prayers, refetch, loading } = usePrayers();
  const [actionLoading, setActionLoading] = useState(null);

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

  const allPrayers = [
    ...prayers.public.map((p) => ({ ...p, typeLabel: 'public' })),
    ...prayers.staff.map((p) => ({ ...p, typeLabel: 'staff' })),
    ...prayers.pastor.map((p) => ({ ...p, typeLabel: 'pastor' })),
  ];

  const pendingPrayers = allPrayers.filter((p) => !p.isApproved && p.typeLabel === 'public');
  const approvedPrayers = allPrayers.filter((p) => p.isApproved || p.typeLabel !== 'public');

  if (loading) {
    return <div className="text-center py-8">{t('common.loading')}</div>;
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-primary-800 mb-6">
        {t('admin.prayers.title')}
      </h2>

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
              loading={actionLoading === prayer.id}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PrayerItem({ prayer, onApprove, onReject, onDelete, loading, showApproval }) {
  const { t } = useTranslation();

  const typeColors = {
    pastor: 'bg-purple-100 text-purple-800',
    staff: 'bg-blue-100 text-blue-800',
    public: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="card border border-gray-200">
      <div className="flex items-start justify-between mb-2">
        <span className={`px-2 py-1 rounded text-xs font-medium ${typeColors[prayer.typeLabel]}`}>
          {prayer.typeLabel}
        </span>
        {prayer.aiFlagged && (
          <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
            AI Flagged
          </span>
        )}
      </div>

      <p className="text-gray-800 mb-4 whitespace-pre-wrap">
        {prayer.originalContent || prayer.content}
      </p>

      {prayer.aiFlagReason && (
        <p className="text-sm text-red-600 mb-4">
          {prayer.aiFlagReason}
        </p>
      )}

      <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
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
