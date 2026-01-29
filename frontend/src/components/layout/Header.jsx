import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import LanguageSelector from './LanguageSelector';

function Header() {
  const { t } = useTranslation();
  const { user, isAuthenticated, login, logout, isWorkerOrAbove } = useAuth();

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold text-primary-700">
            {t('app.title')}
          </Link>

          <nav className="flex items-center gap-4">
            <Link
              to="/"
              className="text-gray-600 hover:text-primary-600 transition-colors"
            >
              {t('nav.home')}
            </Link>

            {isWorkerOrAbove && (
              <Link
                to="/admin"
                className="text-gray-600 hover:text-primary-600 transition-colors"
              >
                {t('nav.admin')}
              </Link>
            )}

            <LanguageSelector />

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">{user?.name}</span>
                <button
                  onClick={logout}
                  className="btn-secondary text-sm"
                >
                  {t('nav.logout')}
                </button>
              </div>
            ) : (
              <button
                onClick={login}
                className="btn-primary text-sm"
              >
                {t('nav.login')}
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Header;
