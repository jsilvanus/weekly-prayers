import { query } from '../db/index.js';

const DEFAULT_SETTINGS = {
  parish_name: 'Tuomiokirkkoseurakunta',
  parish_subtitle: 'Viikon rukousaiheet',
  color_palette: 'cathedral_blue', // cathedral_blue, liturgical_green, episcopal_purple, liturgical_red, liturgical_gold, custom
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
};

export async function getAllSettings() {
  try {
    const result = await query('SELECT key, value FROM site_settings');
    const settings = { ...DEFAULT_SETTINGS };

    for (const row of result.rows) {
      settings[row.key] = row.value;
    }

    return settings;
  } catch (error) {
    // If table doesn't exist yet, return defaults
    return DEFAULT_SETTINGS;
  }
}

export async function updateSettings(newSettings = {}) {
  const keys = Object.keys(newSettings);
  for (const key of keys) {
    const value = String(newSettings[key]);
    await query(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value, updated_at = NOW()`,
      [key, value]
    );
  }

  return getAllSettings();
}
