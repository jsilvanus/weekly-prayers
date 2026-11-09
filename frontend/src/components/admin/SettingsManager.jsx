import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../context/SettingsContext';
import { ChurchCircleLogo, LocalParishLogo, BishopCrestLogo, PastorSealLogo } from '../../assets/churchIcons';

function SettingsManager() {
  const { t } = useTranslation();
  const { settings, palettes, saveSettings } = useSettings();

  const [formData, setFormData] = useState({ ...settings });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const parishLogoRef = useRef(null);
  const bishopCrestRef = useRef(null);

  const handleFileUpload = (field, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.result }));
    };
    reader.readAsDataURL(file);
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

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="font-martti text-xl font-bold text-primary-900">
          Seurakunnan asetukset ja kirkon graafinen ilme
        </h2>
        <p className="text-xs text-gray-600 mt-1">
          Määritä seurakunnan nimi, viralliset logot, Suomen ev.lut. kirkon graafisen ohjeiston väripaletti sekä Päivän sana -osio.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Parish Details */}
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
            <div>
              <label className="label">Alaotsikko / Teema</label>
              <input
                type="text"
                value={formData.parish_subtitle || ''}
                onChange={(e) => setFormData({ ...formData, parish_subtitle: e.target.value })}
                className="input text-sm"
                placeholder="esim. Viikon rukousaiheet"
              />
            </div>
            <div>
              <label className="label">Piispan nimi</label>
              <input
                type="text"
                value={formData.bishop_name || ''}
                onChange={(e) => setFormData({ ...formData, bishop_name: e.target.value })}
                className="input text-sm"
                placeholder="esim. Matti Repo"
              />
            </div>
            <div>
              <label className="label">Hiippakunta</label>
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
        </div>

        {/* 3. Logos and Crests */}
        <div className="card">
          <h3 className="font-martti font-bold text-sm text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-2">
            <span>🖼️</span> Kirkon ja seurakunnan logot
          </h3>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* General Church Logo */}
            <div className="p-3.5 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-800">
                  Kirkon virallinen ympyrälogo (2024–2025)
                </label>
                <input
                  type="checkbox"
                  checked={formData.show_church_logo !== 'false'}
                  onChange={(e) => setFormData({ ...formData, show_church_logo: String(e.target.checked) })}
                  className="rounded text-primary-600"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-full border border-gray-200 p-1 flex items-center justify-center">
                  <ChurchCircleLogo className="w-8 h-8 text-primary-700" />
                </div>
                <div className="text-[11px] text-gray-500">
                  Suomen ev.lut. kirkon virallinen risti-ympyrälogo yläpalkissa.
                </div>
              </div>
            </div>

            {/* Local Parish Logo */}
            <div className="p-3.5 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-800">
                  Seurakunnan oma logo (PNG/SVG)
                </label>
                <input
                  type="checkbox"
                  checked={formData.show_parish_logo !== 'false'}
                  onChange={(e) => setFormData({ ...formData, show_parish_logo: String(e.target.checked) })}
                  className="rounded text-primary-600"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded border border-gray-200 p-1 flex items-center justify-center shrink-0">
                  {formData.parish_logo_url ? (
                    <img src={formData.parish_logo_url} alt="Seurakunnan logo" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <LocalParishLogo className="w-8 h-8 text-amber-600" />
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    ref={parishLogoRef}
                    onChange={(e) => handleFileUpload('parish_logo_url', e.target.files?.[0])}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => parishLogoRef.current?.click()}
                    className="btn-secondary text-xs py-1 px-2.5"
                  >
                    📁 {formData.parish_logo_url ? 'Vaihda logo' : 'Lataa logo'}
                  </button>
                  {formData.parish_logo_url && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, parish_logo_url: '' })}
                      className="text-[11px] text-red-600 ml-2 underline"
                    >
                      Palauta
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Bishop's Crest (Default: Tampereen hiippakunta) */}
            <div className="p-3.5 bg-purple-50/50 rounded-lg border border-purple-200 sm:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-purple-950">
                  Piispan virallinen vaakuna (Oletus: Tampereen hiippakunta / Piispa Matti Repo)
                </label>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-14 h-16 bg-white rounded border border-purple-200 p-1 flex items-center justify-center shrink-0 shadow-sm">
                  <img
                    src={formData.bishop_crest_url || '/tampere_piispan_vaakuna.png'}
                    alt="Piispan vaakuna"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div>
                  <input
                    type="file"
                    ref={bishopCrestRef}
                    onChange={(e) => handleFileUpload('bishop_crest_url', e.target.files?.[0])}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => bishopCrestRef.current?.click()}
                      className="btn-secondary text-xs py-1 px-2.5 border-purple-300 text-purple-900 hover:bg-purple-100"
                    >
                      📁 {formData.bishop_crest_url && formData.bishop_crest_url !== '/tampere_piispan_vaakuna.png' ? 'Vaihda vaakuna' : 'Lataa oma vaakuna'}
                    </button>
                    {formData.bishop_crest_url && formData.bishop_crest_url !== '/tampere_piispan_vaakuna.png' && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, bishop_crest_url: '/tampere_piispan_vaakuna.png' })}
                        className="text-[11px] text-red-600 underline"
                      >
                        Palauta Tampereen hiippakunnan vaakuna
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Käytetään oletuksena piispan rukousaiheen yhteydessä ja sunnuntain messun esirukoustulosteessa.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Daily Word / Bible Stuff (Päivän sana) */}
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
