import { query } from '../db/index.js';

const DEFAULT_SETTINGS = {
  parish_name: 'Tuomiokirkkoseurakunta',
  parish_subtitle: 'Viikon rukousaiheet',
  yhtyma_name: 'Tampereen seurakuntayhtymä',
  color_palette: 'cathedral_blue', // cathedral_blue, liturgical_green, episcopal_purple, liturgical_red, liturgical_gold, custom
  custom_color: '#1e3a5f',
  show_church_logo: 'true',
  show_parish_logo: 'true',
  church_logo_url: '',
  parish_logo_url: '',
  bishop_name: 'Matti Repo',
  bishop_diocese: 'Tampereen hiippakunta',
  bishop_crest_url: '/tampere_piispan_vaakuna.png',
  show_bishop_prayer: 'true',
  pastor_name: 'Olli-Pekka Silfverhuth',
  pastor_title: 'Kirkkoherra',
  pastor_logo_url: '',
  show_pastor_prayer: 'true',
  ministry_groups: JSON.stringify(['Paikallinen seurakuntatyö', 'Kansainvälinen vastuu ja lähetys', 'Lapset ja nuoret', 'Diakonia ja lähimmäispalvelu']),
  ministry_tags: JSON.stringify(['Diakonia', 'Nuorisotyö', 'Lähetystyö', 'Musiikkityö', 'Varhaiskasvatus', 'Jumalanpalvelus', 'Yhteisötyö']),
  daily_word_enabled: 'true',
  daily_word_title: 'Päivän sana',
  daily_word_verse: 'Ps. 103:1–4',
  daily_word_content: 'Ylistä Herraa, minun sieluni, ja kaikki mitä minussa on, hänen pyhää nimeään. Ylistä Herraa, minun sieluni, äläkä unohda, mitä hyvää hän on sinulle tehnyt.',
  daily_word_reflection: 'Herra on laupias ja armahtavainen, pitkämielinen ja suuri armossaan. Hän antaa anteeksi syntisi ja parantaa sairautesi.',
  week_rollover_day: 'thursday',
  week_cycle_mode: 'thursday_cycle',
  highlight_icon: 'candle',
  church_logo_variant: 'auto'
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

export async function getSetting(key, defaultValue = null) {
  try {
    const result = await query('SELECT value FROM site_settings WHERE key = $1', [key]);
    if (result.rows.length > 0 && result.rows[0].value !== null) {
      return result.rows[0].value;
    }
    return DEFAULT_SETTINGS[key] !== undefined ? DEFAULT_SETTINGS[key] : defaultValue;
  } catch (error) {
    return DEFAULT_SETTINGS[key] !== undefined ? DEFAULT_SETTINGS[key] : defaultValue;
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

  // Synchronize tenant names if parish_name or yhtyma_name are updated
  try {
    if (newSettings.parish_name) {
      await query(
        `UPDATE tenants SET name = $1, updated_at = NOW() WHERE slug = 'tuomiokirkko'`,
        [newSettings.parish_name.trim()]
      );
    }
    if (newSettings.yhtyma_name) {
      await query(
        `UPDATE tenants SET name = $1, updated_at = NOW() WHERE type = 'seurakuntayhtyma'`,
        [newSettings.yhtyma_name.trim()]
      );
    }
    if (newSettings.week_rollover_day || newSettings.week_cycle_mode) {
      const rollover = newSettings.week_rollover_day || 'thursday';
      const cycle = newSettings.week_cycle_mode || 'thursday_cycle';
      await query(
        `UPDATE tenants SET week_rollover_day = $1, week_cycle_mode = $2, updated_at = NOW()`,
        [rollover, cycle]
      );
    }
    if (newSettings.highlight_icon) {
      await query(
        `UPDATE tenants SET highlight_icon = $1, updated_at = NOW()`,
        [newSettings.highlight_icon]
      );
    }
    if (newSettings.church_logo_variant) {
      await query(
        `UPDATE tenants SET church_logo_variant = $1, updated_at = NOW()`,
        [newSettings.church_logo_variant]
      );
    }
  } catch (e) {
    // Tenants table might not exist in old migrations
  }

  return getAllSettings();
}
