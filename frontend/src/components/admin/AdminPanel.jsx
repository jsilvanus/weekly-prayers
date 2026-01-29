import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import PrayerManager from './PrayerManager';
import UserManager from './UserManager';
import StaffPrayerForm from './StaffPrayerForm';
import PastorPrayerForm from './PastorPrayerForm';

function AdminPanel() {
  const { t } = useTranslation();
  const { isWorkerOrAbove, isAdmin, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('prayers');

  if (loading) {
    return <div className="text-center py-8">{t('common.loading')}</div>;
  }

  if (!isWorkerOrAbove) {
    return <Navigate to="/" replace />;
  }

  const tabs = [
    { id: 'prayers', label: t('admin.prayers.title'), component: PrayerManager },
    { id: 'staff', label: t('admin.staff.title'), component: StaffPrayerForm },
  ];

  if (isAdmin) {
    tabs.push({ id: 'pastor', label: t('admin.pastor.title'), component: PastorPrayerForm });
    tabs.push({ id: 'users', label: t('admin.users.title'), component: UserManager });
  }

  const ActiveComponent = tabs.find((tab) => tab.id === activeTab)?.component || PrayerManager;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-primary-800 mb-6">
        {t('admin.title')}
      </h1>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <ActiveComponent />
    </div>
  );
}

export default AdminPanel;
