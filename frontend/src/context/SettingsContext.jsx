import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const PALETTES = {
  cathedral_blue: {
    name: 'Kirkon sininen (Klassinen)',
    hex: '#1e3a5f',
    shades: {
      50: '#f0f5fa',
      100: '#e2ecf5',
      200: '#c4d8ea',
      300: '#97bedb',
      400: '#629ec8',
      500: '#3b81b2',
      600: '#1e3a5f',
      700: '#172d4a',
      800: '#122137',
      900: '#0c1523',
    }
  },
  liturgical_green: {
    name: 'Liturginen vihreä (Arki ja toivo)',
    hex: '#2d5a3f',
    shades: {
      50: '#f0f7f2',
      100: '#dcf0e2',
      200: '#bce0c7',
      300: '#92caa4',
      400: '#64ad7c',
      500: '#418f5b',
      600: '#2d5a3f',
      700: '#244732',
      800: '#1e3929',
      900: '#192f23',
    }
  },
  episcopal_purple: {
    name: 'Liturginen violetti (Paasto ja piispa)',
    hex: '#581c87',
    shades: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',
      600: '#581c87',
      700: '#4c1d95',
      800: '#3b0764',
      900: '#260443',
    }
  },
  liturgical_red: {
    name: 'Liturginen punainen (Pyhä Henki)',
    hex: '#991b1b',
    shades: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#991b1b',
      700: '#7f1d1d',
      800: '#5c1414',
      900: '#3c0c0c',
    }
  },
  liturgical_gold: {
    name: 'Liturginen kulta (Juhla-ajat ja valo)',
    hex: '#b45309',
    shades: {
      50: '#fefce8',
      100: '#fef9c3',
      200: '#fef08a',
      300: '#fde047',
      400: '#facc15',
      500: '#eab308',
      600: '#b45309',
      700: '#92400e',
      800: '#78350f',
      900: '#451a03',
    }
  }
};

// Generate hex tint/shade for custom local color
function generateShadesFromHex(baseHex) {
  let cleanHex = baseHex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  const r = parseInt(cleanHex.substring(0, 2), 16) || 30;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 58;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 95;

  const mix = (c, target, factor) => Math.round(c + (target - c) * factor);
  const toHex = (n) => n.toString(16).padStart(2, '0');

  const calcHex = (factor, isLight) => {
    const target = isLight ? 255 : 0;
    const nr = mix(r, target, factor);
    const ng = mix(g, target, factor);
    const nb = mix(b, target, factor);
    return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
  };

  return {
    50: calcHex(0.92, true),
    100: calcHex(0.82, true),
    200: calcHex(0.65, true),
    300: calcHex(0.45, true),
    400: calcHex(0.25, true),
    500: calcHex(0.10, true),
    600: `#${cleanHex}`,
    700: calcHex(0.20, false),
    800: calcHex(0.40, false),
    900: calcHex(0.65, false),
  };
}

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({
    parish_name: 'Tuomiokirkkoseurakunta',
    parish_subtitle: 'Viikon rukousaiheet',
    yhtyma_name: 'Tampereen seurakuntayhtymä',
    color_palette: 'cathedral_blue',
    custom_color: '#1e3a5f',
    show_church_logo: 'true',
    show_parish_logo: 'true',
    church_logo_url: '',
    parish_logo_url: '',
    bishop_name: 'Matti Repo',
    bishop_diocese: 'Tampereen hiippakunta',
    bishop_crest_url: '/tampere_piispan_vaakuna.png',
    pastor_logo_url: '',
    daily_word_enabled: 'true',
    daily_word_title: 'Päivän sana',
    daily_word_verse: 'Ps. 103:1–4',
    daily_word_content: 'Ylistä Herraa, minun sieluni, ja kaikki mitä minussa on, hänen pyhää nimeään. Ylistä Herraa, minun sieluni, äläkä unohda, mitä hyvää hän on sinulle tehnyt.',
    daily_word_reflection: 'Herra on laupias ja armahtavainen, pitkämielinen ja suuri armossaan. Hän antaa anteeksi syntisi ja parantaa sairautesi.'
  });
  const [loading, setLoading] = useState(true);

  // Apply CSS color variables dynamically
  const applyPaletteToDOM = (paletteKey, customHex) => {
    let shades;
    if (paletteKey === 'custom' && customHex) {
      shades = generateShadesFromHex(customHex);
    } else if (PALETTES[paletteKey]) {
      shades = PALETTES[paletteKey].shades;
    } else {
      shades = PALETTES.cathedral_blue.shades;
    }

    const root = document.documentElement;
    Object.entries(shades).forEach(([weight, hexVal]) => {
      root.style.setProperty(`--color-primary-${weight}`, hexVal);
    });
  };

  const fetchSettings = async () => {
    try {
      const data = await api.getSettings();
      if (data && data.settings) {
        setSettings(data.settings);
        applyPaletteToDOM(data.settings.color_palette, data.settings.custom_color);
      }
    } catch (e) {
      // Fallback to default
      applyPaletteToDOM('cathedral_blue', '#1e3a5f');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const saveSettings = async (updatedSettings) => {
    const res = await api.updateSettings(updatedSettings);
    if (res && res.settings) {
      setSettings(res.settings);
      applyPaletteToDOM(res.settings.color_palette, res.settings.custom_color);
    }
    return res;
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        palettes: PALETTES,
        saveSettings,
        refetchSettings: fetchSettings,
        loading
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
