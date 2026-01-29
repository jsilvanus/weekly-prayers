import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';

function PrayerForm({ onSuccess }) {
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
      await api.submitPrayer(content.trim());
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
    <div className="card">
      <h3 className="text-lg font-semibold text-primary-800 mb-4">
        {t('prayers.submit.title')}
      </h3>

      <form onSubmit={handleSubmit}>
        <textarea
          className="textarea h-32 mb-4"
          placeholder={t('prayers.submit.placeholder')}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={1000}
          disabled={loading}
        />

        <div className="flex items-center justify-between">
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
