import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useSettings,
  DEFAULT_MINISTRY_GROUPS,
  DEFAULT_MINISTRY_TAGS,
  parseSettingsList
} from '../../context/SettingsContext';
import { ChurchCircleLogo, LocalParishLogo, PastorSealLogo } from '../../assets/churchIcons';
import { CHURCH_LOGO_VARIANTS, resolveChurchLogoVariant } from '../../utils/churchLogo';

function SettingsManager() {
  const { t, i18n } = useTranslation();
  const { settings, palettes, saveSettings } = useSettings();

  const [formData, setFormData] = useState({ ...settings });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // File upload refs
  const parishLogoRef = useRef(null);
  const bishopCrestRef = useRef(null);
  const pastorLogoRef = useRef(null);
  const churchLogoRef = useRef(null);

  // New group & tag inputs for Section: Työalat ja ryhmät
  const [newGroupInput, setNewGroupInput] = useState('');
  const [newTagInput, setNewTagInput] = useState('');

  // Parsed current groups and tags
  const currentGroups = parseSettingsList(formData.ministry_groups, DEFAULT_MINISTRY_GROUPS);
  const currentTags = parseSettingsList(formData.ministry_tags, DEFAULT_MINISTRY_TAGS);

  const handleFileUpload = (field, file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Valitse kuvatiedosto (PNG, JPG tai SVG).' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Kuvatiedosto on liian suuri. Suositeltu enimmäiskoko logolle on 2 Mt.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.result }));
      setMessage({ type: 'success', text: 'Kuva ladattu esikatseluun. Muista tallentaa asetukset sivun alareunasta!' });
    };
    reader.readAsDataURL(file);
  };

  // Group addition & removal
  const handleAddGroup = () => {
    const trimmed = newGroupInput.trim();
    if (!trimmed) return;
    if (currentGroups.includes(trimmed)) {
      setMessage({ type: 'error', text: 'Tämä ryhmä on jo olemassa.' });
      return;
    }
    const updated = [...currentGroups, trimmed];
    setFormData((prev) => ({ ...prev, ministry_groups: JSON.stringify(updated) }));
    setNewGroupInput('');
  };

  const handleRemoveGroup = (groupToRemove) => {
    const updated = currentGroups.filter((g) => g !== groupToRemove);
    setFormData((prev) => ({ ...prev, ministry_groups: JSON.stringify(updated) }));
  };

  // Tag addition & removal
  const handleAddTag = () => {
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    if (currentTags.includes(trimmed)) {
      setMessage({ type: 'error', text: 'Tämä työala/tunniste on jo olemassa.' });
      return;
    }
    const updated = [...currentTags, trimmed];
    setFormData((prev) => ({ ...prev, ministry_tags: JSON.stringify(updated) }));
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove) => {
    const updated = currentTags.filter((tag) => tag !== tagToRemove);
    setFormData((prev) => ({ ...prev, ministry_tags: JSON.stringify(updated) }));
  };

  const handleResetGroupsAndTags = () => {
    if (window.confirm('Haluatko palauttaa ryhmät ja työalat oletusasetuksiin?')) {
      setFormData((prev) => ({
        ...prev,
        ministry_groups: JSON.stringify(DEFAULT_MINISTRY_GROUPS),
        ministry_tags: JSON.stringify(DEFAULT_MINISTRY_TAGS)
      }));
      setMessage({ type: 'success', text: 'Oletusryhmät ja työalat palautettu.' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await saveSettings(formData);
      setMessage({ type: 'success', text: 'Asetukset ja ilme tallennettu onnistuneesti!' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  // Current resolved variant for live preview badge
  const activePreviewVariant = resolveChurchLogoVariant(
    formData.church_logo_variant || 'auto',
    i18n.language || 'fi'
  );

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="font-martti text-xl font-bold text-primary-900">
          Seurakunnan asetukset ja kirkon graafinen ilme
        </h2>
        <p className="text-xs text-gray-600 mt-1">
          Määritä seurakunnan nimi, viralliset logot ja kieliversiot, Suomen ev.lut. kirkon graafisen ohjeiston väripaletti, kirkkoherran ja piispan tiedot sekä työalojen ryhmittelyt.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Parish Details & Clergy */}
        <div className="card">
          <h3 className="font-martti font-bold text-sm text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-2">
            <span>🏛️</span> Seurakunnan ja yhtymän perustiedot
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Seurakunnan nimi (Parish)</label>
              <input
                type="text"
                value={formData.parish_name || ''}
                onChange={(e) => setFormData({ ...formData, parish_name: e.target.value })}
                className="input text-sm"
                placeholder="esim. Tuomiokirkkoseurakunta"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Näkyy sivuston otsikossa, yläpalkissa ja esirukouslistassa.
              </p>
            </div>
            <div>
              <label className="label">Seurakuntayhtymän nimi (Union / Yhtymä)</label>
              <input
                type="text"
                value={formData.yhtyma_name || ''}
                onChange={(e) => setFormData({ ...formData, yhtyma_name: e.target.value })}
                className="input text-sm"
                placeholder="esim. Tampereen seurakuntayhtymä"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Näkyy rukoussivun seurakuntavalitsimessa ja yhtymän yhteisissä aiheissa.
              </p>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Alaotsikko / Teema</label>
              <input
                type="text"
                value={formData.parish_subtitle || ''}
                onChange={(e) => setFormData({ ...formData, parish_subtitle: e.target.value })}
                className="input text-sm"
                placeholder="esim. Viikon rukousaiheet"
              />
            </div>

            {/* Kirkkoherran perustiedot */}
            <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/80 sm:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                  <span>✝️</span> Kirkkoherran asetukset
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs font-medium text-amber-900">Näytä aihe etusivulla:</span>
                  <input
                    type="checkbox"
                    checked={formData.show_pastor_prayer !== 'false'}
                    onChange={(e) => setFormData({ ...formData, show_pastor_prayer: String(e.target.checked) })}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label text-xs">Kirkkoherran nimi</label>
                  <input
                    type="text"
                    value={formData.pastor_name || ''}
                    onChange={(e) => setFormData({ ...formData, pastor_name: e.target.value })}
                    className="input text-sm"
                    placeholder="esim. Olli-Pekka Silfverhuth"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Tulostuu kirkkoherran esirukousaiheen yhteyteen (ei aiheen syöttäjän nimeä).
                  </p>
                </div>
                <div>
                  <label className="label text-xs">Kirkkoherran titteli</label>
                  <input
                    type="text"
                    value={formData.pastor_title || ''}
                    onChange={(e) => setFormData({ ...formData, pastor_title: e.target.value })}
                    className="input text-sm"
                    placeholder="esim. Kirkkoherra tai Tuomiorovasti"
                  />
                </div>
              </div>
            </div>

            {/* Piispan perustiedot */}
            <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-200/80 sm:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-purple-950 uppercase tracking-wide flex items-center gap-1.5">
                  <span>☩</span> Piispan asetukset
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs font-medium text-purple-900">Näytä aihe etusivulla:</span>
                  <input
                    type="checkbox"
                    checked={formData.show_bishop_prayer !== 'false'}
                    onChange={(e) => setFormData({ ...formData, show_bishop_prayer: String(e.target.checked) })}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label text-xs">Piispan nimi</label>
                  <input
                    type="text"
                    value={formData.bishop_name || ''}
                    onChange={(e) => setFormData({ ...formData, bishop_name: e.target.value })}
                    className="input text-sm"
                    placeholder="esim. Matti Repo"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Tulostuu piispan esirukousaiheen yhteyteen.
                  </p>
                </div>
                <div>
                  <label className="label text-xs">Hiippakunta</label>
                  <input
                    type="text"
                    value={formData.bishop_diocese || ''}
                    onChange={(e) => setFormData({ ...formData, bishop_diocese: e.target.value })}
                    className="input text-sm"
                    placeholder="esim. Tampereen hiippakunta"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Color Palettes and EVL Guidelines */}
        <div className="card">
          <h3 className="font-martti font-bold text-sm text-gray-900 uppercase tracking-wide mb-1 flex items-center gap-2">
            <span>🎨</span> Kirkon väripaletti ja paikallisväri
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Kirkon graafinen ohjeisto noudattaa liturgisia värejä. Voit valita kirkkovuoden liturgisen paletin tai määrittää seurakunnan oman paikallisvärin.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-4">
            {Object.entries(palettes).map(([key, pal]) => {
              const isSelected = formData.color_palette === key;
              return (
                <div
                  key={key}
                  onClick={() => setFormData({ ...formData, color_palette: key })}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary-600 bg-primary-50/50 shadow-sm ring-2 ring-primary-500/20'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <span
                      className="w-5 h-5 rounded-full shadow-sm shrink-0"
                      style={{ backgroundColor: pal.hex }}
                    />
                    <span className="text-xs font-semibold text-gray-900 truncate">
                      {pal.name}
                    </span>
                  </div>
                  <div className="flex h-3 rounded overflow-hidden">
                    {[50, 200, 400, 600, 800].map((s) => (
                      <div
                        key={s}
                        className="flex-1"
                        style={{ backgroundColor: pal.shades[s] }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Manual Local Custom Color Option */}
            <div
              onClick={() => setFormData({ ...formData, color_palette: 'custom' })}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                formData.color_palette === 'custom'
                  ? 'border-primary-600 bg-primary-50/50 shadow-sm ring-2 ring-primary-500/20'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-5 h-5 rounded-full shadow-sm shrink-0 border border-gray-300"
                  style={{ backgroundColor: formData.custom_color || '#1e3a5f' }}
                />
                <span className="text-xs font-semibold text-gray-900">
                  🎯 Paikallinen oma väri (Custom)
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                Määritä seurakunnan oma tunnusväri
              </p>
            </div>
          </div>

          {/* Custom Color Picker input */}
          {formData.color_palette === 'custom' && (
            <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-amber-950">Valitse oma väri:</label>
                <input
                  type="color"
                  value={formData.custom_color || '#1e3a5f'}
                  onChange={(e) => setFormData({ ...formData, custom_color: e.target.value })}
                  className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-amber-950">HEX-koodi:</label>
                <input
                  type="text"
                  value={formData.custom_color || ''}
                  onChange={(e) => setFormData({ ...formData, custom_color: e.target.value })}
                  className="input py-1 px-2.5 text-xs w-28 uppercase font-mono"
                  placeholder="#1E3A5F"
                />
              </div>
              <span className="text-xs text-amber-800">
                Pääväri, painikkeet ja korostukset päivittyvät tähän sävyyn.
              </span>
            </div>
          )}

          {/* Highlight Icon selector */}
          <div className="mt-5 pt-4 border-t border-gray-200">
            <label className="label text-xs font-semibold mb-1 flex items-center gap-1.5">
              <span>✨</span> {t('settings.highlightIcon', 'Nostokuvake')}
            </label>
            <p className="text-xs text-gray-500 mb-3">
              {t('settings.highlightIconDesc', 'Valitse symboli, jolla esiin nostetut rukousaiheet merkitään rukouslistoissa ja tulosteissa.')}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'candle', emoji: '🕯️', name: t('settings.highlightIconCandle', 'Kynttilä (Candle)'), isDefault: true },
                { id: 'star', emoji: '⭐', name: t('settings.highlightIconStar', 'Tähti (Star)') },
                { id: 'hands', emoji: '🙏', name: t('settings.highlightIconHands', 'Rukoilevat kädet (Praying hands)') }
              ].map((opt) => {
                const isSelected = (formData.highlight_icon || 'candle') === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, highlight_icon: opt.id })}
                    className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                      isSelected
                        ? 'border-primary-600 bg-primary-50/60 shadow-sm ring-2 ring-primary-500/20 font-semibold text-primary-950'
                        : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                    }`}
                  >
                    <span className="text-2xl shrink-0">{opt.emoji}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-gray-900">{opt.name}</div>
                      {opt.isDefault && (
                        <span className="text-[10px] text-gray-500">[{t('settings.default', 'Oletus')}]</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. Logos and Crests (Kirkon viralliset logot, kieliversiot, sinetit) */}
        <div className="card space-y-6">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="font-martti font-bold text-sm text-gray-900 uppercase tracking-wide flex items-center gap-2">
              <span>🖼️</span> Kirkon ja seurakunnan logot ja tunnukset
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Suomen ev.lut. kirkon virallinen ympyrälogo kieliversioineen, seurakunnan oma logo, kirkkoherran sinetti ja piispan vaakuna.
            </p>
          </div>

          {/* Section: Suomen ev.lut. kirkon virallinen logo & kieliversiointi */}
          <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-200/80 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/60 pb-3">
              <div>
                <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                  <span>⛪</span> Suomen ev.lut. kirkon virallinen logo
                </h4>
                <p className="text-xs text-emerald-800">
                  Kirkon virallinen risti-ympyrälogo eri kieliversioina. Voidaan näyttää automaattisesti käyttäjän kielen mukaan tai pakottaa seurakunnan pääkieli.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-emerald-200 shadow-2xs">
                <span className="text-xs font-semibold text-gray-700">Näytä yläpalkissa:</span>
                <input
                  type="checkbox"
                  checked={formData.show_church_logo !== 'false'}
                  onChange={(e) => setFormData({ ...formData, show_church_logo: String(e.target.checked) })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
              </label>
            </div>

            {/* Language Mode Selector */}
            <div>
              <label className="block text-xs font-semibold text-emerald-950 uppercase tracking-wider mb-2">
                Logon kielitila (Language mode)
              </label>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    id: 'auto',
                    title: '🌐 Automaattinen',
                    desc: 'Käyttäjän kielen mukaan (fi ➔ fi_se, sv ➔ se_fi, en/muut ➔ en_fi)'
                  },
                  {
                    id: 'fi_se',
                    title: '🇫🇮 Pakota suomi (fi_se)',
                    desc: 'Suomen evankelis-luterilainen kirkko (pääkieli suomi)'
                  },
                  {
                    id: 'se_fi',
                    title: '🇸🇪 Pakota ruotsi (se_fi)',
                    desc: 'Evangelisk-lutherska kyrkan i Finland (pääkieli ruotsi)'
                  },
                  {
                    id: 'en_fi',
                    title: '🇬🇧 Pakota englanti (en_fi)',
                    desc: 'The Evangelical Lutheran Church of Finland (kansainvälinen)'
                  }
                ].map((mode) => {
                  const isSelected = (formData.church_logo_variant || 'auto') === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, church_logo_variant: mode.id })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-emerald-600 bg-white ring-2 ring-emerald-500/20 shadow-xs text-emerald-950'
                          : 'border-emerald-200/70 bg-white/70 hover:bg-white text-gray-700'
                      }`}
                    >
                      <div className="text-xs font-bold mb-1 flex items-center justify-between">
                        <span>{mode.title}</span>
                        {isSelected && <span className="text-emerald-600 font-mono text-[10px]">✓ Valittu</span>}
                      </div>
                      <div className="text-[11px] text-gray-600 leading-snug">
                        {mode.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visual SVG Gallery / Preview Cards */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-emerald-950 uppercase tracking-wider">
                  Viralliset SVG-logot (Napsauta korttia valitaksesi kyseinen kieliversio)
                </span>
                <span className="text-[11px] text-emerald-800 font-medium bg-emerald-100/60 px-2 py-0.5 rounded">
                  Aktiivinen esikatselussa: <strong className="font-mono">{activePreviewVariant}</strong>
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {Object.values(CHURCH_LOGO_VARIANTS).map((variant) => {
                  const isForcedSelected = formData.church_logo_variant === variant.id;
                  const isCurrentlyActive = activePreviewVariant === variant.id;

                  return (
                    <div
                      key={variant.id}
                      onClick={() => setFormData({ ...formData, church_logo_variant: variant.id })}
                      className={`p-3.5 rounded-xl border bg-white cursor-pointer transition-all flex flex-col justify-between ${
                        isForcedSelected
                          ? 'border-emerald-600 ring-2 ring-emerald-500/20 shadow-sm'
                          : isCurrentlyActive
                          ? 'border-emerald-400 bg-emerald-50/20'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-800">
                            {variant.id}
                          </span>
                          {isForcedSelected ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              ✓ Pakotettu
                            </span>
                          ) : isCurrentlyActive ? (
                            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              🌐 Aktiivinen (Käyttäjäkieli)
                            </span>
                          ) : null}
                        </div>

                        <div className="w-full h-24 flex items-center justify-center p-2 my-2 bg-stone-50/70 rounded-lg border border-stone-100">
                          <img
                            src={`/logos/${variant.fileName}`}
                            alt={variant.subtitle}
                            className="max-h-full max-w-full object-contain drop-shadow-2xs"
                          />
                        </div>

                        <div className="text-xs font-semibold text-gray-900 mt-1">
                          {variant.fallbackLabel}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                          {variant.subtitle}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Optional Custom Church Logo Override Upload */}
            <div className="pt-2 border-t border-emerald-200/50 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-emerald-900">
                Haluatko ladata seurakuntakohtaisen mukautetun risti-ikonin oletusvektorien tilalle?
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={churchLogoRef}
                  onChange={(e) => handleFileUpload('church_logo_url', e.target.files?.[0])}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => churchLogoRef.current?.click()}
                  className="btn-secondary text-xs py-1 px-2.5"
                >
                  📁 {formData.church_logo_url ? 'Vaihda oma logo' : 'Lataa oma logo'}
                </button>
                {formData.church_logo_url && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, church_logo_url: '' })}
                    className="text-xs text-red-600 underline"
                  >
                    Palauta virallinen kirkon SVG
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Three Emblem Cards: Parish Logo, Bishop Crest, Pastor Seal */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* 1. Local Parish Logo */}
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-800">
                    Seurakunnan oma logo
                  </label>
                  <input
                    type="checkbox"
                    checked={formData.show_parish_logo !== 'false'}
                    onChange={(e) => setFormData({ ...formData, show_parish_logo: String(e.target.checked) })}
                    className="rounded text-primary-600"
                  />
                </div>
                <div className="w-full h-20 bg-white rounded-lg border border-gray-200 p-2 flex items-center justify-center my-2">
                  {formData.parish_logo_url ? (
                    <img src={formData.parish_logo_url} alt="Seurakunnan logo" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <LocalParishLogo className="w-10 h-10 text-amber-600" />
                  )}
                </div>
              </div>
              <div>
                <input
                  type="file"
                  ref={parishLogoRef}
                  onChange={(e) => handleFileUpload('parish_logo_url', e.target.files?.[0])}
                  accept="image/*"
                  className="hidden"
                />
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => parishLogoRef.current?.click()}
                    className="btn-secondary text-xs py-1 px-2.5 w-full text-center"
                  >
                    📁 {formData.parish_logo_url ? 'Vaihda logo' : 'Lataa logo'}
                  </button>
                  {formData.parish_logo_url && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, parish_logo_url: '' })}
                      className="text-[11px] text-red-600 underline shrink-0"
                    >
                      Palauta
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Bishop's Crest */}
            <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-purple-950">
                    Piispan virallinen vaakuna
                  </label>
                </div>
                <div className="w-full h-20 bg-white rounded-lg border border-purple-200 p-2 flex items-center justify-center my-2 shadow-2xs">
                  <img
                    src={formData.bishop_crest_url || '/tampere_piispan_vaakuna.png'}
                    alt="Piispan vaakuna"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>
              <div>
                <input
                  type="file"
                  ref={bishopCrestRef}
                  onChange={(e) => handleFileUpload('bishop_crest_url', e.target.files?.[0])}
                  accept="image/*"
                  className="hidden"
                />
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => bishopCrestRef.current?.click()}
                    className="btn-secondary text-xs py-1 px-2.5 border-purple-300 text-purple-900 hover:bg-purple-100 w-full text-center"
                  >
                    📁 {formData.bishop_crest_url && formData.bishop_crest_url !== '/tampere_piispan_vaakuna.png' ? 'Vaihda vaakuna' : 'Lataa oma vaakuna'}
                  </button>
                  {formData.bishop_crest_url && formData.bishop_crest_url !== '/tampere_piispan_vaakuna.png' && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, bishop_crest_url: '/tampere_piispan_vaakuna.png' })}
                      className="text-[11px] text-red-600 underline shrink-0"
                    >
                      Palauta
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Pastor's Seal / Logo */}
            <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-amber-950">
                    Kirkkoherran sinetti / tunnus
                  </label>
                </div>
                <div className="w-full h-20 bg-white rounded-lg border border-amber-200 p-2 flex items-center justify-center my-2 shadow-2xs">
                  {formData.pastor_logo_url ? (
                    <img
                      src={formData.pastor_logo_url}
                      alt="Kirkkoherran sinetti"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <PastorSealLogo className="w-10 h-10 opacity-70" />
                  )}
                </div>
              </div>
              <div>
                <input
                  type="file"
                  ref={pastorLogoRef}
                  onChange={(e) => handleFileUpload('pastor_logo_url', e.target.files?.[0])}
                  accept="image/*"
                  className="hidden"
                />
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => pastorLogoRef.current?.click()}
                    className="btn-secondary text-xs py-1 px-2.5 border-amber-300 text-amber-900 hover:bg-amber-100 w-full text-center"
                  >
                    📁 {formData.pastor_logo_url ? 'Vaihda sinetti' : 'Lataa sinetti'}
                  </button>
                  {formData.pastor_logo_url && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, pastor_logo_url: '' })}
                      className="text-[11px] text-red-600 underline shrink-0"
                    >
                      Poista
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Työalat ja ryhmät (Ministries and Groups Management) */}
        <div className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
            <div>
              <h3 className="font-martti font-bold text-sm text-gray-900 uppercase tracking-wide flex items-center gap-2">
                <span>📋</span> Työalan rukouspyyntöjen ryhmät ja tunnisteet
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Määritä vapaasti seurakuntasi käyttämät vastuuryhmät ja työalatunnisteet (tags). Työntekijät valitsevat näistä lisätessään työalan rukouspyyntöjä.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetGroupsAndTags}
              className="text-xs text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-md transition-colors"
            >
              🔄 Palauta oletusryhmät
            </button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Ministry Groups */}
            <div className="p-3.5 bg-blue-50/40 rounded-xl border border-blue-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                  Ryhmät / Vastuualueet ({currentGroups.length})
                </label>
                <span className="text-[11px] text-blue-800">Vapaa määrä</span>
              </div>

              {/* Group Chips */}
              <div className="flex flex-wrap gap-2 min-h-[50px] p-2 bg-white rounded-lg border border-blue-100">
                {currentGroups.map((group) => (
                  <span
                    key={group}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-900 border border-blue-200"
                  >
                    <span>{group}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveGroup(group)}
                      className="text-blue-600 hover:text-red-700 font-bold ml-0.5"
                      title={`Poista ryhmä "${group}"`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>

              {/* Add Group Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGroupInput}
                  onChange={(e) => setNewGroupInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddGroup();
                    }
                  }}
                  placeholder="Uusi ryhmä (esim. Musiikki)..."
                  className="input text-xs flex-1"
                />
                <button
                  type="button"
                  onClick={handleAddGroup}
                  disabled={!newGroupInput.trim()}
                  className="btn-secondary text-xs py-1 px-3 border-blue-300 text-blue-900 hover:bg-blue-100 disabled:opacity-50"
                >
                  Lisää
                </button>
              </div>
            </div>

            {/* Ministry Tags */}
            <div className="p-3.5 bg-emerald-50/40 rounded-xl border border-emerald-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                  Työalat ja tunnisteet ({currentTags.length})
                </label>
                <span className="text-[11px] text-emerald-800">Vapaa määrä</span>
              </div>

              {/* Tag Chips */}
              <div className="flex flex-wrap gap-2 min-h-[50px] p-2 bg-white rounded-lg border border-emerald-100">
                {currentTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-900 border border-emerald-200"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-emerald-600 hover:text-red-700 font-bold ml-0.5"
                      title={`Poista työala "${tag}"`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>

              {/* Add Tag Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Uusi työala (esim. Viestintä)..."
                  className="input text-xs flex-1"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  disabled={!newTagInput.trim()}
                  className="btn-secondary text-xs py-1 px-3 border-emerald-300 text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
                >
                  Lisää
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Daily Word / Bible Stuff (Päivän sana) */}
        <div className="card">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
            <div>
              <h3 className="font-martti font-bold text-sm text-gray-900 uppercase tracking-wide flex items-center gap-2">
                <span>📖</span> Päivän sana (Word of the Day / Raamattu)
              </h3>
              <p className="text-xs text-gray-500">
                Avattava palkki rukousaiheiden alussa.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs font-medium text-gray-700">Näytä etusivulla:</span>
              <input
                type="checkbox"
                checked={formData.daily_word_enabled !== 'false'}
                onChange={(e) => setFormData({ ...formData, daily_word_enabled: String(e.target.checked) })}
                className="rounded text-primary-600"
              />
            </label>
          </div>

          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label text-xs">Otsikko</label>
                <input
                  type="text"
                  value={formData.daily_word_title || ''}
                  onChange={(e) => setFormData({ ...formData, daily_word_title: e.target.value })}
                  className="input text-xs"
                  placeholder="Päivän sana"
                />
              </div>
              <div>
                <label className="label text-xs">Raamatunkohta / Viite</label>
                <input
                  type="text"
                  value={formData.daily_word_verse || ''}
                  onChange={(e) => setFormData({ ...formData, daily_word_verse: e.target.value })}
                  className="input text-xs"
                  placeholder="esim. Ps. 103:1–4"
                />
              </div>
            </div>

            <div>
              <label className="label text-xs">Raamatunteksti</label>
              <textarea
                value={formData.daily_word_content || ''}
                onChange={(e) => setFormData({ ...formData, daily_word_content: e.target.value })}
                className="textarea h-20 text-xs"
                placeholder="Kirjoita päivän raamatunjae tähän..."
              />
            </div>

            <div>
              <label className="label text-xs">Mietiskely / Lyhyt rukous</label>
              <input
                type="text"
                value={formData.daily_word_reflection || ''}
                onChange={(e) => setFormData({ ...formData, daily_word_reflection: e.target.value })}
                className="input text-xs"
                placeholder="Lyhyt mietiskely tai saatesana..."
              />
            </div>
          </div>
        </div>

        {/* 6. Prayer Week Cycle & Rollover */}
        <div className="card">
          <h3 className="font-martti font-bold text-sm text-gray-900 uppercase tracking-wide mb-1 flex items-center gap-2">
            <span>📅</span> Rukousviikon kierto ja vaihtumispäivä
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Määritä milloin seurakunnan esirukousviikko vaihtuu. Seurakuntatyössä viikko aloitetaan usein torstaisin tulevaa sunnuntaita varten.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label text-xs font-semibold">Viikon vaihtumispäivä</label>
              <select
                value={formData.week_rollover_day || 'thursday'}
                onChange={(e) => setFormData({ ...formData, week_rollover_day: e.target.value })}
                className="input text-xs"
              >
                <option value="thursday">Torstai (Seurakunnan suositus)</option>
                <option value="wednesday">Keskiviikko</option>
                <option value="friday">Perjantai</option>
                <option value="monday">Maanantai (Standardi kalenteriviikko)</option>
              </select>
              <p className="text-[11px] text-gray-500 mt-1">
                Päivä, jolloin sivuston aktiivinen esirukouslista ja aiheet siirtyvät uuteen viikkoon.
              </p>
            </div>

            <div>
              <label className="label text-xs font-semibold">Rukousviikon sykli ja aikaväli</label>
              <select
                value={formData.week_cycle_mode || 'thursday_cycle'}
                onChange={(e) => setFormData({ ...formData, week_cycle_mode: e.target.value })}
                className="input text-xs"
              >
                <option value="thursday_cycle">Torstaista keskiviikkoon (To–Ke, sunnuntai viikon keskellä)</option>
                <option value="rollover">Ennakoiva viikonvaihto (To–Su ennakoi tulevaa sunnuntaita)</option>
                <option value="calendar">Tavallinen kalenteriviikko (Ma–Su)</option>
              </select>
              <p className="text-[11px] text-gray-500 mt-1">
                To–Ke -sykli kattaa 7 päivää siten, että tulevan sunnuntain messu on rukousviikon keskipisteenä.
              </p>
            </div>
          </div>

          <div className="mt-3 bg-primary-50/60 border border-primary-200/80 rounded-lg p-3 text-xs text-primary-900">
            <span className="font-semibold">💡 Vinkki:</span> Kun valitset <em>Torstai</em>, työntekijät ja seurakuntalaiset näkevät tulevan viikonlopun esirukouslistan valmiina jo torstaiaamusta alkaen.
          </div>
        </div>

        {/* Save button and messages */}
        <div className="flex items-center justify-between pt-2">
          {message ? (
            <div
              className={`p-2.5 rounded-lg text-xs ${
                message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {message.text}
            </div>
          ) : <div />}

          <button
            type="submit"
            disabled={saving}
            className="btn-primary text-sm px-6"
          >
            {saving ? t('common.loading') : '💾 Tallenna asetukset'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default SettingsManager;
