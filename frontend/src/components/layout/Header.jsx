import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import LanguageSelector from './LanguageSelector';
import { ChurchCircleLogo, LocalParishLogo } from '../../assets/churchIcons';

function Header() {
  const { t } = useTranslation();
  const { user, isAuthenticated, login, logout, isWorkerOrAbove, isBishop, canAccessPrayerList } = useAuth();
  const { settings } = useSettings();

  const parishName = settings.parish_name || 'Tuomiokirkkoseurakunta';
  const showChurchLogo = settings.show_church_logo !== 'false';
  const showParishLogo = settings.show_parish_logo !== 'false';

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-18">
          {/* Brand & Logos Section */}
          <Link to="/" className="flex items-center gap-3 group">
            {/* General Church Logo (Suomen ev.lut. kirkon virallinen ympyrälogo) */}
            {showChurchLogo && (
              <div className="text-primary-700 hover:text-primary-800 transition-colors" title="Suomen evankelis-luterilainen kirkko">
                {settings.church_logo_url ? (
                  <img
                    src={settings.church_logo_url}
                    alt="Kirkon logo"
                    className="h-10 w-10 object-contain rounded-full"
                  />
                ) : (
                  <ChurchCircleLogo className="w-10 h-10 text-primary-700" />
                )}
              </div>
            )}

            {/* Local Parish Logo */}
            {showParishLogo && (
              <div className="text-amber-600 transition-colors hidden sm:block border-l border-gray-200 pl-3" title={parishName}>
                {settings.parish_logo_url ? (
                  <img
                    src={settings.parish_logo_url}
                    alt="Seurakunnan logo"
                    className="h-9 w-9 object-contain"
                  />
                ) : (
                  <LocalParishLogo className="w-9 h-9 text-amber-600" />
                )}
              </div>
            )}

            {/* Parish & App Title with Martti Font */}
            <div className="flex flex-col">
              <span className="font-martti text-base md:text-lg font-bold text-primary-900 group-hover:text-primary-700 transition-colors leading-tight">
                {parishName}
              </span>
              <span className="text-xs text-gray-500 font-aptos font-normal">
                {t('app.title')}
              </span>
            </div>
          </Link>

          {/* Nav & User Section */}
          <nav className="flex items-center gap-3 md:gap-5">
            <Link
              to="/"
              className="text-xs md:text-sm font-medium text-gray-700 hover:text-primary-700 transition-colors"
            >
              {t('nav.home')}
            </Link>

            <Link
              to="/bible"
              className="text-xs md:text-sm font-medium text-gray-700 hover:text-primary-700 transition-colors flex items-center gap-1"
            >
              <span>📖</span>
              <span>{t('nav.bible') || 'Raamattu'}</span>
            </Link>

            {canAccessPrayerList && (
              <a
                href="/api/export/intercession"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs md:text-sm font-medium text-gray-700 hover:text-primary-700 transition-colors flex items-center gap-1"
                title="Avaa esirukouslista ja kuittausnäkymä"
              >
                <span>📋</span>
                <span className="hidden sm:inline">{t('nav.intercessionList') || 'Esirukouslista'}</span>
              </a>
            )}

            {(isWorkerOrAbove || isBishop) && (
              <Link
                to="/admin"
                className="text-xs md:text-sm font-medium text-gray-700 hover:text-primary-700 transition-colors"
              >
                {t('nav.admin')}
              </Link>
            )}

            <LanguageSelector />

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 hidden md:inline max-w-[120px] truncate">
                  {user?.name}
                </span>
                <button
                  onClick={logout}
                  className="btn-secondary text-xs py-1 px-2.5"
                >
                  {t('nav.logout')}
                </button>
              </div>
            ) : (
              <button
                onClick={login}
                className="btn-primary text-xs py-1.5 px-3"
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
