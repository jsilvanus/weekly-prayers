import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import PrayerManager from './PrayerManager';
import UserManager from './UserManager';
import StaffPrayerForm from './StaffPrayerForm';
import PastorPrayerForm from './PastorPrayerForm';
import BishopPrayerForm from './BishopPrayerForm';
import HighlightManager from './HighlightManager';
import SettingsManager from './SettingsManager';

function AdminPanel() {
  const { t } = useTranslation();
  const { isWorkerOrAbove, isCoordinatorOrAbove, isAdmin, isBishop, loading } = useAuth();
  const [activeTab, setActiveTab] = useState(isBishop ? 'bishop' : 'prayers');

  if (loading) {
    return <div className="text-center py-8">{t('common.loading')}</div>;
  }

  if (!isWorkerOrAbove && !isBishop) {
    return <Navigate to="/" replace />;
  }

  const tabs = [];

  // Bishop and bishop assistant only have access to bishop prayer management
  if (isBishop && !isAdmin) {
    tabs.push({ id: 'bishop', label: t('admin.bishop.title'), component: BishopPrayerForm });
  } else {
    // Workers and above
    tabs.push(
      { id: 'prayers', label: t('admin.prayers.title'), component: PrayerManager },
      { id: 'staff', label: t('admin.staff.title'), component: StaffPrayerForm }
    );

    if (isCoordinatorOrAbove) {
      tabs.push({ id: 'highlights', label: t('admin.highlights.title'), component: HighlightManager });
    }

    if (isAdmin) {
      tabs.push({ id: 'pastor', label: t('admin.pastor.title'), component: PastorPrayerForm });
      tabs.push({ id: 'bishop', label: t('admin.bishop.title'), component: BishopPrayerForm });
      tabs.push({ id: 'settings', label: '⚙️ Seurakunnan ilme & asetukset', component: SettingsManager });
      tabs.push({ id: 'users', label: t('admin.users.title'), component: UserManager });
    }
  }

  const effectiveActiveTab = tabs.some(t => t.id === activeTab) ? activeTab : tabs[0]?.id;
  const ActiveComponent = tabs.find((tab) => tab.id === effectiveActiveTab)?.component || (isBishop ? BishopPrayerForm : PrayerManager);

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
                effectiveActiveTab === tab.id
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
