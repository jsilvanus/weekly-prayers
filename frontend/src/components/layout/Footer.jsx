import { useTranslation } from 'react-i18next';

function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-100 border-t">
      <div className="container mx-auto px-4 py-6">
        <p className="text-center text-gray-600 text-sm">
          {t('footer.copyright', { year: currentYear })}
        </p>
      </div>
    </footer>
  );
}

export default Footer;
