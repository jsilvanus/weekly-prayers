import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTenant } from '../../context/TenantContext';
import { useSettings } from '../../context/SettingsContext';

const MODULE_NAV_INFO = {
  prayers: {
    path: '/',
    icon: '🙏',
    labelKey: 'nav.prayers',
    defaultLabel: 'Esirukoukset',
  },
  bible: {
    path: '/bible',
    icon: '📖',
    labelKey: 'nav.bible',
    defaultLabel: 'Raamattu & Sana',
  },
  hours: {
    path: '/prayer-moment',
    icon: '🕊️',
    labelKey: 'nav.hours',
    defaultLabel: 'Hetkirukous',
  },
  hartaus: {
    path: '/hartaus',
    icon: '🕯️',
    labelKey: 'nav.hartaus',
    defaultLabel: 'Hartaus',
  },
};

export default function LandingHero({
  currentModule,
  title,
  subtitle,
  primaryAction,
  className = '',
}) {
  const { t } = useTranslation();
  const { currentTenant, yhtyma, isPartOfYhtyma, allParishesInYhtyma, switchParish, isModuleEnabled } = useTenant();
  const { settings } = useSettings();

  const parishName = currentTenant?.name || settings.parish_name || 'Tuomiokirkkoseurakunta';

  // Sibling modules that are active for this tenant
  const siblingModules = ['prayers', 'bible', 'hours', 'hartaus']
    .filter((mod) => mod !== currentModule && isModuleEnabled(mod))
    .map((mod) => MODULE_NAV_INFO[mod]);

  return (
    <div className={`text-center mb-8 ${className}`} data-testid="landing-hero">
      {/* Yhtymä Member Parishes Dropdown */}
      {isPartOfYhtyma && (
        <div className="flex items-center justify-center mb-3" data-testid="yhtyma-parish-dropdown">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-slate-100/90 to-blue-50/90 border border-slate-300/80 rounded-full px-3.5 py-1 shadow-2xs text-xs sm:text-sm text-slate-700">
            <span className="flex items-center gap-1.5 font-medium text-slate-600">
              <span className="text-sm">🏛️</span>
              <span className="hidden sm:inline">{yhtyma?.name || 'Seurakuntayhtymä'}:</span>
            </span>
            <div className="relative inline-flex items-center">
              <select
                value={currentTenant?.slug}
                onChange={(e) => switchParish(e.target.value)}
                className="appearance-none font-bold text-primary-900 bg-white border border-primary-300 hover:border-primary-500 rounded-full pl-3 pr-7 py-0.5 cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-xs sm:text-sm transition-all"
                aria-label="Valitse seurakunta seurakuntayhtymässä"
              >
                {allParishesInYhtyma.map((parish) => (
                  <option key={parish.slug} value={parish.slug}>
                    {parish.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-2.5 text-primary-700">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Title */}
      <h1 className="text-3xl md:text-4xl font-bold text-primary-900 mb-1 font-martti tracking-tight">
        {parishName} &mdash; {title}
      </h1>
      {subtitle && (
        <p className="text-gray-600 mb-5 font-aptos text-sm sm:text-base max-w-2xl mx-auto">
          {subtitle}
        </p>
      )}

      {/* Action Area: Primary Hero Button + Sibling Navigation */}
      <div className="flex flex-col items-center gap-3.5">
        {primaryAction && (
          <div>
            <button
              type="button"
              onClick={primaryAction.onClick}
              className={`btn font-medium px-6 py-2.5 rounded-full shadow-md hover:shadow-lg transition-all flex items-center gap-2 transform hover:-translate-y-0.5 ${
                primaryAction.className ||
                'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white'
              }`}
            >
              {primaryAction.icon && <span>{primaryAction.icon}</span>}
              <span>{primaryAction.label}</span>
            </button>
          </div>
        )}

        {/* Sibling navigation to other active modules */}
        {siblingModules.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm">
            <span className="text-gray-600 text-xs font-semibold mr-1">Siirry myös:</span>
            {siblingModules.map((sibling) => (
              <Link
                key={sibling.path}
                to={sibling.path}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-gray-300 bg-white/90 text-gray-700 hover:text-primary-800 hover:border-primary-400 hover:bg-primary-50 transition-all shadow-2xs font-medium"
              >
                <span>{sibling.icon}</span>
                <span>{t(sibling.labelKey, sibling.defaultLabel)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
