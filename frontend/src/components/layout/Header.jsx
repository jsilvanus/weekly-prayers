import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useTenant } from '../../context/TenantContext';
import LanguageSelector from './LanguageSelector';
import { ChurchCircleLogo, LocalParishLogo } from '../../assets/churchIcons';
import { withBasePath } from '../../services/api';

const roleBadgeStyles = {
  admin: 'bg-purple-100 text-purple-900 border-purple-200',
  bishop: 'bg-purple-100 text-purple-900 border-purple-200',
  coordinator: 'bg-indigo-100 text-indigo-900 border-indigo-200',
  worker: 'bg-blue-100 text-blue-900 border-blue-200',
  devotion: 'bg-teal-100 text-teal-900 border-teal-200',
  prayer_group: 'bg-amber-100 text-amber-900 border-amber-200',
  user: 'bg-gray-100 text-gray-800 border-gray-200',
};

function Header() {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, login, logout, isWorkerOrAbove, isBishop, isDevotionAuthor, canAccessPrayerList } = useAuth();
  const { settings, getModuleTitle } = useSettings();
  const { currentTenant, isModuleEnabled } = useTenant();
  const location = useLocation();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const headerRef = useRef(null);

  const parishName = currentTenant?.name || settings.parish_name || 'Tuomiokirkkoseurakunta';
  const brandName = settings.brand_name || t('app.title') || 'Rukoushetki';
  const headerProminence = settings.header_prominence || 'parish';
  const showChurchLogo = settings.show_church_logo !== 'false';
  const showParishLogo = settings.show_parish_logo !== 'false';
  const canSeeDisabled = isWorkerOrAbove || user?.role === 'admin';

  const navModules = [
    { id: 'prayers', to: '/prayers', activePaths: ['/prayers', '/esirukoukset'], icon: '🙏', defaultTitle: 'Esirukoukset' },
    { id: 'pyhapaiva', to: '/pyhapaiva', activePaths: ['/pyhapaiva', '/kirkkovuosi', '/church-year'], icon: '⛪', defaultTitle: 'Pyhäpäivä' },
    { id: 'bible', to: '/bible', activePaths: ['/bible', '/raamattu'], icon: '📖', defaultTitle: 'Raamattu & Sana' },
    { id: 'hours', to: '/prayer-moment', activePaths: ['/prayer-moment', '/hetkirukous'], icon: '⏰', defaultTitle: 'Hetkirukous' },
    { id: 'hartaus', to: '/hartaus', activePaths: ['/hartaus', '/devotion'], icon: '✍️', defaultTitle: 'Hartaus' },
    { id: 'meditations', to: '/meditations', activePaths: ['/meditations', '/meditaatiot', '/hiljaisuus'], icon: '📿', defaultTitle: 'Meditaatiot' },
  ];

  // Automatically close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const getRoleBadgeLabel = (role) => {
    if (!role) return '';
    return t(`admin.users.roles.${role}`) || role;
  };

  const getIntercessionUrl = () => {
    const token = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('token') : null;
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    return withBasePath(`/api/export/intercession${query}`);
  };

  const handleOpenIntercession = (e) => {
    setIsMenuOpen(false);
    if (e.button === 1 || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    const url = getIntercessionUrl();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <header
      ref={headerRef}
      className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40 shadow-sm"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-18">
          {/* Brand & Logos Section */}
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group min-w-0 mr-2">
            {/* General Church Logo (Suomen ev.lut. kirkon virallinen ympyrälogo) */}
            {showChurchLogo && (
              <div
                className="text-primary-700 hover:text-primary-800 transition-colors shrink-0"
                title="Suomen evankelis-luterilainen kirkko"
              >
                {settings.church_logo_url ? (
                  <img
                    src={withBasePath(settings.church_logo_url)}
                    alt="Kirkon logo"
                    className="h-9 w-9 sm:h-[46px] sm:w-[46px] md:h-[50px] md:w-[50px] object-contain rounded-full"
                  />
                ) : (
                  <ChurchCircleLogo
                    variant={settings.church_logo_variant || currentTenant?.church_logo_variant || 'auto'}
                    userLocale={i18n?.language}
                    className="w-9 h-9 sm:w-[46px] sm:h-[46px] md:w-[50px] md:h-[50px]"
                  />
                )}
              </div>
            )}

            {/* Local Parish Logo (visible on mobile and desktop) */}
            {showParishLogo && (
              <div
                className="text-amber-600 transition-colors border-l border-gray-200 pl-2 sm:pl-2.5 shrink-0"
                title={parishName}
              >
                {settings.parish_logo_url ? (
                  <img
                    src={withBasePath(settings.parish_logo_url)}
                    alt="Seurakunnan logo"
                    className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 object-contain"
                  />
                ) : (
                  <LocalParishLogo className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 text-amber-600" />
                )}
              </div>
            )}

            {/* Parish & App Title with Martti Font */}
            <div className="flex flex-col min-w-0">
              <span className="font-martti text-sm sm:text-base md:text-lg font-bold text-primary-900 group-hover:text-primary-700 transition-colors leading-tight truncate">
                {headerProminence === 'brand' ? brandName : parishName}
              </span>
              <span className="text-[11px] sm:text-xs text-gray-500 font-aptos font-normal truncate">
                {headerProminence === 'brand' ? parishName : brandName}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation & User Section (md and above) */}
          <nav className="hidden md:flex items-center gap-2 lg:gap-3.5">
            {navModules.map((m) => {
              const enabled = isModuleEnabled(m.id);
              if (!enabled && !canSeeDisabled) return null;
              const isActive = m.activePaths.includes(location.pathname);
              const title = getModuleTitle(m.id, m.defaultTitle);

              return (
                <Link
                  key={m.id}
                  to={m.to}
                  className={`text-xs md:text-sm font-medium transition-colors flex items-center gap-1 px-2 py-1 rounded-md ${
                    isActive
                      ? 'text-primary-800 bg-primary-50/80 font-semibold'
                      : 'text-gray-700 hover:text-primary-700 hover:bg-gray-50'
                  }`}
                >
                  <span>{m.icon}</span>
                  <span>{title}</span>
                  {!enabled && (
                    <span className="ml-1 text-[10px] font-semibold text-amber-800 bg-amber-100/90 px-1.5 py-0.2 rounded-full border border-amber-300">
                      Ei julkinen
                    </span>
                  )}
                </Link>
              );
            })}

            {canAccessPrayerList && (
              <a
                href={getIntercessionUrl()}
                onClick={handleOpenIntercession}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs md:text-sm font-medium text-gray-700 hover:text-primary-700 hover:bg-gray-50 px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                title="Avaa esirukouslista ja kuittausnäkymä"
              >
                <span>📋</span>
                <span className="hidden lg:inline">{t('nav.intercessionList') || 'Esirukouslista'}</span>
              </a>
            )}

            {(isWorkerOrAbove || isBishop || isDevotionAuthor) && (
              <Link
                to="/admin"
                className={`text-xs md:text-sm font-medium transition-colors flex items-center gap-1 px-2 py-1 rounded-md ${
                  location.pathname.startsWith('/admin')
                    ? 'text-primary-800 bg-primary-50/80 font-semibold'
                    : 'text-gray-700 hover:text-primary-700 hover:bg-gray-50'
                }`}
              >
                <span>⚙️</span>
                <span>{t('nav.admin')}</span>
              </Link>
            )}

            <LanguageSelector />

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 max-w-[140px] truncate">
                  <span className="text-xs text-gray-700 font-medium truncate" title={user?.name}>
                    {user?.name}
                  </span>
                  {user?.role && (
                    <span
                      className={`hidden xl:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                        roleBadgeStyles[user.role] || roleBadgeStyles.user
                      }`}
                    >
                      {getRoleBadgeLabel(user.role)}
                    </span>
                  )}
                </div>
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

          {/* Mobile Hamburger Toggle Button (< md) */}
          <div className="flex items-center md:hidden">
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? 'Sulje päävalikko' : 'Avaa päävalikko'}
              className="p-2 rounded-lg text-gray-700 hover:text-primary-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {isMenuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Dropdown Menu (< md) */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white/98 backdrop-blur-md px-4 pt-3 pb-5 space-y-4 shadow-lg animate-fadeIn">
          {/* Navigation links */}
          <nav className="flex flex-col space-y-1">
            {navModules.map((m) => {
              const enabled = isModuleEnabled(m.id);
              if (!enabled && !canSeeDisabled) return null;
              const isActive = m.activePaths.includes(location.pathname);
              const title = getModuleTitle(m.id, m.defaultTitle);

              return (
                <Link
                  key={m.id}
                  to={m.to}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-800 font-semibold'
                      : 'text-gray-700 hover:text-primary-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{m.icon}</span>
                    <span>{title}</span>
                  </div>
                  {!enabled && (
                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-300">
                      Ei julkinen
                    </span>
                  )}
                </Link>
              );
            })}

            {canAccessPrayerList && (
              <a
                href={getIntercessionUrl()}
                onClick={handleOpenIntercession}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-primary-700 hover:bg-gray-50 transition-colors"
                title="Avaa esirukouslista ja kuittausnäkymä"
              >
                <span className="text-base">📋</span>
                <span>{t('nav.intercessionList') || 'Esirukouslista'}</span>
              </a>
            )}

            {(isWorkerOrAbove || isBishop || isDevotionAuthor) && (
              <Link
                to="/admin"
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname.startsWith('/admin')
                    ? 'bg-primary-50 text-primary-800 font-semibold'
                    : 'text-gray-700 hover:text-primary-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-base">⚙️</span>
                <span>{t('nav.admin')}</span>
              </Link>
            )}
          </nav>

          {/* Language Selector */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between px-3">
            <span className="text-xs font-medium text-gray-500">
              {t('common.language') || 'Kieli'}
            </span>
            <LanguageSelector />
          </div>

          {/* User profile section */}
          <div className="pt-2 border-t border-gray-100 px-3">
            {isAuthenticated ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-gray-900 truncate">
                      {user?.name}
                    </span>
                    {user?.email && (
                      <span className="text-xs text-gray-500 truncate">
                        {user.email}
                      </span>
                    )}
                  </div>
                  {user?.role && (
                    <span
                      className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        roleBadgeStyles[user.role] || roleBadgeStyles.user
                      }`}
                    >
                      {getRoleBadgeLabel(user.role)}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    logout();
                  }}
                  className="w-full btn-secondary text-sm py-2 flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>🚪</span>
                  <span>{t('nav.logout')}</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  login();
                }}
                className="w-full btn-primary text-sm py-2 flex items-center justify-center gap-2 shadow-sm"
              >
                <span>🔐</span>
                <span>{t('nav.login')}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
