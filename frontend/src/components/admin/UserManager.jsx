import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

function UserManager() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data.users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setActionLoading(userId);
    try {
      await api.updateUserRole(userId, newRole);
      fetchUsers();
    } catch (error) {
      alert(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="text-center py-8">{t('common.loading')}</div>;
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-primary-800 mb-6">
        {t('admin.users.title')}
      </h2>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg overflow-hidden">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                {t('admin.users.title')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                Email
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                {t('admin.users.role')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                {t('admin.users.changeRole')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3 text-sm text-gray-800">
                  {user.name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {user.email}
                </td>
                <td className="px-4 py-3">
                  <RoleBadge role={user.role} />
                </td>
                <td className="px-4 py-3">
                  {user.id !== currentUser?.id ? (
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      disabled={actionLoading === user.id}
                      className="input py-1 px-2 text-sm w-32"
                    >
                      <option value="user">{t('admin.users.roles.user')}</option>
                      <option value="worker">{t('admin.users.roles.worker')}</option>
                      <option value="admin">{t('admin.users.roles.admin')}</option>
                    </select>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RoleBadge({ role }) {
  const { t } = useTranslation();

  const colors = {
    admin: 'bg-purple-100 text-purple-800',
    worker: 'bg-blue-100 text-blue-800',
    user: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[role]}`}>
      {t(`admin.users.roles.${role}`)}
    </span>
  );
}

export default UserManager;
