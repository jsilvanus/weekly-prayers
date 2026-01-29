import { useTranslation } from 'react-i18next';

function LoadingSpinner() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      <p className="mt-4 text-gray-600">{t('common.loading')}</p>
    </div>
  );
}

export default LoadingSpinner;
