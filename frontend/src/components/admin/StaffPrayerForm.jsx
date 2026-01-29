import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';

function StaffPrayerForm() {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!content.trim()) return;

    setLoading(true);
    setMessage(null);

    try {
      await api.submitStaffPrayer(content.trim());
      setMessage({ type: 'success', text: 'Staff prayer request added successfully.' });
      setContent('');
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
        <textarea
          className="textarea h-40 mb-4"
          placeholder="Enter staff prayer request..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={2000}
          disabled={loading}
        />

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
