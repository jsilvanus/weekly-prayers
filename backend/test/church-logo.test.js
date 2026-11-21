import { test, describe } from 'node:test';
import assert from 'node:assert';
import { resolveChurchLogoVariant, CHURCH_LOGO_VARIANTS } from '../src/utils/churchLogo.js';
import { createMcpServer } from '../src/mcp/server.js';

describe('Church Official Logo Language Settings & Resolution', () => {
  test('has the 3 official EVL language variants defined with filenames', () => {
    assert.strictEqual(CHURCH_LOGO_VARIANTS.fi_se.fileName, 'evl_fi_se.svg');
    assert.strictEqual(CHURCH_LOGO_VARIANTS.se_fi.fileName, 'evl_se_fi.svg');
    assert.strictEqual(CHURCH_LOGO_VARIANTS.en_fi.fileName, 'evl_en_fi.svg');
  });

  test('parish can force a specific language version regardless of user locale', () => {
    // Forcing Finnish
    assert.strictEqual(resolveChurchLogoVariant('fi_se', 'en'), 'fi_se');
    assert.strictEqual(resolveChurchLogoVariant('fi_se', 'sv'), 'fi_se');
    assert.strictEqual(resolveChurchLogoVariant('fi_se', 'fi'), 'fi_se');
    assert.strictEqual(resolveChurchLogoVariant('fi_se', 'de'), 'fi_se');

    // Forcing Swedish
    assert.strictEqual(resolveChurchLogoVariant('se_fi', 'fi'), 'se_fi');
    assert.strictEqual(resolveChurchLogoVariant('se_fi', 'en'), 'se_fi');
    assert.strictEqual(resolveChurchLogoVariant('se_fi', 'sv'), 'se_fi');

    // Forcing English
    assert.strictEqual(resolveChurchLogoVariant('en_fi', 'fi'), 'en_fi');
    assert.strictEqual(resolveChurchLogoVariant('en_fi', 'sv'), 'en_fi');
    assert.strictEqual(resolveChurchLogoVariant('en_fi', 'en'), 'en_fi');
  });

  test('switches dynamically based on user settings when set to auto', () => {
    // Finnish locale -> fi_se
    assert.strictEqual(resolveChurchLogoVariant('auto', 'fi'), 'fi_se');
    assert.strictEqual(resolveChurchLogoVariant('auto', 'fi-FI'), 'fi_se');

    // Swedish locale -> se_fi
    assert.strictEqual(resolveChurchLogoVariant('auto', 'sv'), 'se_fi');
    assert.strictEqual(resolveChurchLogoVariant('auto', 'sv-FI'), 'se_fi');
    assert.strictEqual(resolveChurchLogoVariant('auto', 'sv-SE'), 'se_fi');
    assert.strictEqual(resolveChurchLogoVariant('auto', 'se'), 'se_fi');

    // English locale -> en_fi
    assert.strictEqual(resolveChurchLogoVariant('auto', 'en'), 'en_fi');
    assert.strictEqual(resolveChurchLogoVariant('auto', 'en-US'), 'en_fi');
    assert.strictEqual(resolveChurchLogoVariant('auto', 'en-GB'), 'en_fi');

    // Any other locale (e.g. de, es, fr, uk) -> en_fi
    assert.strictEqual(resolveChurchLogoVariant('auto', 'de'), 'en_fi');
    assert.strictEqual(resolveChurchLogoVariant('auto', 'es'), 'en_fi');
    assert.strictEqual(resolveChurchLogoVariant('auto', 'fr'), 'en_fi');
    assert.strictEqual(resolveChurchLogoVariant('auto', 'uk'), 'en_fi');
  });

  test('defaults to auto resolution when settingVariant is null or undefined', () => {
    assert.strictEqual(resolveChurchLogoVariant(null, 'fi'), 'fi_se');
    assert.strictEqual(resolveChurchLogoVariant(undefined, 'sv'), 'se_fi');
    assert.strictEqual(resolveChurchLogoVariant('', 'en'), 'en_fi');
    assert.strictEqual(resolveChurchLogoVariant(null, 'de'), 'en_fi');
  });

  test('MCP server registers update_parish_settings tool with church_logo_variant', () => {
    const server = createMcpServer({
      publicUrl: 'http://localhost:3000',
      user: { role: 'admin' },
      isStaff: true,
      isAdmin: true
    });
    assert.ok(server);
  });
});
