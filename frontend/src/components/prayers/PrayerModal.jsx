import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import PrayerForm from './PrayerForm';

function PrayerModal({ isOpen, onClose, onSuccess }) {
  const { t } = useTranslation();

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl p-6 sm:p-8 transform transition-all z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 rounded-lg p-1.5 transition-colors text-lg font-bold"
            title={t('prayers.submit.close')}
          >
            ✕
          </button>

          {/* Form inside Modal */}
          <PrayerForm
            isModal={true}
            onSuccess={() => {
              onSuccess?.();
              setTimeout(() => {
                onClose();
              }, 1200);
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default PrayerModal;
