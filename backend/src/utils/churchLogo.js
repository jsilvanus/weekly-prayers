/**
 * Church official logo helper and resolution logic
 * (Suomen evankelis-luterilaisen kirkon virallisen logon kieliversioiden hallinta)
 */

export const CHURCH_LOGO_VARIANTS = {
  fi_se: {
    id: 'fi_se',
    labelKey: 'settings.churchLogoFiSe',
    fallbackLabel: 'Suomi / ruotsi (fi_se - Pääkieli suomi)',
    subtitle: 'Suomen evankelis-luterilainen kirkko / Finlands ev.luth. kyrka',
    fileName: 'evl_fi_se.svg',
    primaryLang: 'fi'
  },
  se_fi: {
    id: 'se_fi',
    labelKey: 'settings.churchLogoSeFi',
    fallbackLabel: 'Ruotsi / suomi (se_fi - Pääkieli ruotsi)',
    subtitle: 'Evangelisk-lutherska kyrkan i Finland / Suomen ev.lut. kirkko',
    fileName: 'evl_se_fi.svg',
    primaryLang: 'sv'
  },
  en_fi: {
    id: 'en_fi',
    labelKey: 'settings.churchLogoEnFi',
    fallbackLabel: 'Englanti / kansainvälinen (en_fi)',
    subtitle: 'The Evangelical Lutheran Church of Finland',
    fileName: 'evl_en_fi.svg',
    primaryLang: 'en'
  }
};

/**
 * Resolves which church logo variant to use based on parish setting and user locale.
 *
 * Requirements:
 * - If parish forces a language variant ('fi_se', 'se_fi', 'en_fi'), return it.
 * - If parish mode is 'auto' (switch based on user settings):
 *     - Finnish locale -> 'fi_se'
 *     - Swedish locale -> 'se_fi'
 *     - English locale -> 'en_fi'
 *     - Any other locale -> 'en_fi'
 *
 * @param {string} settingVariant - Parish setting ('auto', 'fi_se', 'se_fi', 'en_fi')
 * @param {string} userLocale - User's current language / locale (e.g. 'fi', 'sv', 'en', 'de')
 * @returns {string} One of 'fi_se', 'se_fi', 'en_fi'
 */
export function resolveChurchLogoVariant(settingVariant, userLocale = 'fi') {
  if (settingVariant === 'fi_se' || settingVariant === 'se_fi' || settingVariant === 'en_fi') {
    return settingVariant;
  }

  const locale = (userLocale || 'fi').toLowerCase().trim();
  const primaryLang = locale.split(/[-_]/)[0];

  if (primaryLang === 'fi') {
    return 'fi_se';
  }
  if (primaryLang === 'sv' || primaryLang === 'se') {
    return 'se_fi';
  }
  if (primaryLang === 'en') {
    return 'en_fi';
  }

  // "For any else, when they come, use en_fi."
  return 'en_fi';
}
