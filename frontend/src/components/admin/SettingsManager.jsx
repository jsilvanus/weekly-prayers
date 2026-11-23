import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useSettings,
  DEFAULT_MINISTRY_GROUPS,
  DEFAULT_MINISTRY_TAGS,
  DEFAULT_PORTAL_CONFIG,
  parseSettingsList,
  parsePortalConfig
} from '../../context/SettingsContext';
import { ChurchCircleLogo, LocalParishLogo, PastorSealLogo } from '../../assets/churchIcons';
import { CHURCH_LOGO_VARIANTS, resolveChurchLogoVariant } from '../../utils/churchLogo';
import { withBasePath } from '../../services/api';

function SettingsManager() {
  const { t, i18n } = useTranslation();
  const { settings, palettes, saveSettings } = useSettings();

  const [formData, setFormData] = useState({ ...settings });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      setFormData((prev) => ({ ...settings, ...prev }));
    }
  }, [settings]);

  // File upload refs
  const parishLogoRef = useRef(null);
  const bishopCrestRef = useRef(null);
  const pastorLogoRef = useRef(null);
  const churchLogoRef = useRef(null);

  // New group & tag inputs for Section: Työalat ja ryhmät
  const [newGroupInput, setNewGroupInput] = useState('');
  const [newTagInput, setNewTagInput] = useState('');

  // Parsed current groups, tags, and portal configuration
  const currentGroups = parseSettingsList(formData.ministry_groups, DEFAULT_MINISTRY_GROUPS);
  const currentTags = parseSettingsList(formData.ministry_tags, DEFAULT_MINISTRY_TAGS);
  const currentPortalConfig = parsePortalConfig(formData.portal_config);

  const updatePortalConfig = (updater) => {
    const nextConfig = typeof updater === 'function' ? updater(currentPortalConfig) : updater;
    setFormData((prev) => ({
      ...prev,
      portal_config: JSON.stringify(nextConfig)
    }));
  };

  const handleMoveSlide = (slideId, direction) => {
    updatePortalConfig((cfg) => {
      const slides = [...cfg.carousel.slides].sort((a, b) => a.order - b.order);
      const idx = slides.findIndex((s) => s.id === slideId);
      if (idx === -1) return cfg;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= slides.length) return cfg;
      const temp = slides[idx];
      slides[idx] = slides[swapIdx];
      slides[swapIdx] = temp;
      const reordered = slides.map((s, i) => ({ ...s, order: i + 1 }));
      return {
        ...cfg,
        carousel: { ...cfg.carousel, slides: reordered }
      };
    });
  };

  const handleToggleSlide = (slideId) => {
    updatePortalConfig((cfg) => {
      const slides = cfg.carousel.slides.map((s) =>
        s.id === slideId ? { ...s, visible: !s.visible } : s
      );
      return {
        ...cfg,
        carousel: { ...cfg.carousel, slides }
      };
    });
  };

  const handleUpdateSection = (sectionId, patch) => {
    updatePortalConfig((cfg) => {
      const updated = cfg.sections.map((sec) =>
        sec.id === sectionId ? { ...sec, ...patch } : sec
      );
      const above = updated
        .filter((s) => s.position === 'above')
        .sort((a, b) => a.order - b.order)
        .map((s, i) => ({ ...s, order: i + 1 }));
      const below = updated
        .filter((s) => s.position !== 'above')
        .sort((a, b) => a.order - b.order)
        .map((s, i) => ({ ...s, order: i + 1 }));
      return {
        ...cfg,
        sections: [...above, ...below]
      };
    });
  };

  const handleMoveSectionInZone = (sectionId, zonePosition, direction) => {
    updatePortalConfig((cfg) => {
      const zoneList = cfg.sections
        .filter((s) => s.position === zonePosition)
        .sort((a, b) => a.order - b.order);
      const otherList = cfg.sections
        .filter((s) => s.position !== zonePosition)
        .sort((a, b) => a.order - b.order);

      const idx = zoneList.findIndex((s) => s.id === sectionId);
      if (idx === -1) return cfg;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= zoneList.length) return cfg;

      const temp = zoneList[idx];
      zoneList[idx] = zoneList[swapIdx];
      zoneList[swapIdx] = temp;

      const reorderedZone = zoneList.map((s, i) => ({ ...s, order: i + 1 }));
      return {
        ...cfg,
        sections: [...reorderedZone, ...otherList]
      };
    });
  };

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
        {/* Moduulien hallinta */}
        <div className="card">
          <h3 className="font-martti font-bold text-sm text-gray-900 uppercase tracking-wide mb-2 flex items-center gap-2">
            <span>🧩</span> Aktiiviset pääosiot ja moduulit
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Valitse mitkä neljästä pääsivusta ovat seurakuntasi käytössä. Sivuston ylänavigaatio, mobiilivalikko ja ristiinnavigointi mukautuvat automaattisesti aktiivisiin osioihin.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {[
              { id: 'prayers', title: 'Esirukoukset', icon: '🙏', desc: 'Seurakunnan esirukousaiheet ja jättölomake' },
              { id: 'pyhapaiva', title: 'Pyhäpäivä', icon: '⛪', desc: 'Sunnuntain evankeliumi, lukukappaleet ja teema' },
              { id: 'hartaus', title: 'Hartaus', icon: '✍️', desc: 'Valmiiksi kirjoitettu päivän hartaus' },
              { id: 'hours', title: 'Hetkirukous', icon: '⏰', desc: 'Kirkkokäsikirja III:n mukaiset rukoushetket' },
              { id: 'meditations', title: 'Meditaatiot', icon: '📿', desc: 'Rukoushelmet, katekismus, hiljaisuus ja adventti' },
              { id: 'bible', title: 'Raamattu & Sana', icon: '📖', desc: 'Päivän sana, lukukappaleet ja kirkkovuosi' },
            ].map((m) => {
              const activeList = parseSettingsList(formData.active_modules, ['prayers', 'bible', 'hours', 'hartaus', 'meditations', 'pyhapaiva']);
              const isChecked = activeList.includes(m.id);

              return (
                <div
                  key={m.id}
                  onClick={() => {
                    let next;
                    if (isChecked) {
                      if (activeList.length === 1) {
                        alert('Vähintään yhden moduulin on oltava aktiivinen.');
                        return;
                      }
                      next = activeList.filter((x) => x !== m.id);
                    } else {
                      next = [...activeList, m.id];
                    }
                    setFormData((prev) => ({ ...prev, active_modules: JSON.stringify(next) }));
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    isChecked
                      ? 'border-primary-600 bg-primary-50/50 shadow-sm ring-1 ring-primary-500/30'
                      : 'border-gray-200 bg-gray-50/60 opacity-60 hover:opacity-90'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xl">{m.icon}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded text-primary-600 focus:ring-primary-500 pointer-events-none"
                      />
                    </div>
                    <h4 className="font-semibold text-xs text-gray-900">{m.title}</h4>
                    <p className="text-[11px] text-gray-500 mt-1 leading-snug">{m.desc}</p>
                  </div>
                  <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-right">
                    {isChecked ? (
                      <span className="text-emerald-700">Käytössä</span>
                    ) : (
                      <span className="text-gray-400">Pois päältä</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mukautetut moduulien otsikot */}
        <div className="card">
          <h3 className="font-martti font-bold text-sm text-gray-900 uppercase tracking-wide mb-2 flex items-center gap-2">
            <span>🏷️</span> Osioiden mukautetut nimet
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Voit halutessasi nimetä pääosioiden sivut ja navigointipainikkeet seurakuntasi toiveiden mukaisesti. Jos jätät kentän tyhjäksi, käytetään oletusnimeä.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label text-xs">Esirukoukset (oletus: Esirukoukset)</label>
              <input
                type="text"
                value={formData.module_title_prayers || ''}
                onChange={(e) => setFormData({ ...formData, module_title_prayers: e.target.value })}
                className="input text-sm"
                placeholder="Esirukoukset"
              />
            </div>
            <div>
              <label className="label text-xs">Raamattu & Sana (oletus: Raamattu & Sana)</label>
              <input
                type="text"
                value={formData.module_title_bible || ''}
                onChange={(e) => setFormData({ ...formData, module_title_bible: e.target.value })}
                className="input text-sm"
                placeholder="Raamattu & Sana"
              />
            </div>
            <div>
              <label className="label text-xs">Hetkirukous (oletus: Hetkirukous)</label>
              <input
                type="text"
                value={formData.module_title_hours || ''}
                onChange={(e) => setFormData({ ...formData, module_title_hours: e.target.value })}
                className="input text-sm"
                placeholder="Hetkirukous"
              />
            </div>
            <div>
              <label className="label text-xs">Hartaus (oletus: Hartaus)</label>
              <input
                type="text"
                value={formData.module_title_hartaus || ''}
                onChange={(e) => setFormData({ ...formData, module_title_hartaus: e.target.value })}
                className="input text-sm"
                placeholder="Hartaus"
              />
            </div>
            <div>
              <label className="label text-xs">Meditaatiot (oletus: Meditaatiot)</label>
              <input
                type="text"
                value={formData.module_title_meditations || ''}
                onChange={(e) => setFormData({ ...formData, module_title_meditations: e.target.value })}
                className="input text-sm"
                placeholder="Meditaatiot"
              />
            </div>
            <div>
              <label className="label text-xs">Pyhäpäivä (oletus: Pyhäpäivä)</label>
              <input
                type="text"
                value={formData.module_title_pyhapaiva || ''}
                onChange={(e) => setFormData({ ...formData, module_title_pyhapaiva: e.target.value })}
                className="input text-sm"
                placeholder="Pyhäpäivä"
              />
            </div>
          </div>
        </div>

        {/* Etusivun portaali, mobiilikaruselli, osioiden sijoittelu ja sisältönostot */}
        <div className="card space-y-6 border-primary-200 bg-gradient-to-b from-white to-primary-50/20" data-testid="portal-settings-card">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-3">
            <div>
              <h3 className="font-martti font-bold text-sm text-primary-950 uppercase tracking-wide flex items-center gap-2">
                <span>🏠</span> Etusivun portaali (/), mobiilikaruselli ja nostot (Ylä-/Alapuoli)
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                Hallitse seurakunnan pääportaalin (/) hero-karusellia, osioiden näkyvyyttä ja järjestystä karusellin <strong>yläpuolella</strong> tai <strong>alapuolella</strong>, sekä yksittäisten sisältöjen (voimassa oleva hartaus, pyhäpäivä ja meditaatiot) nostoja.
              </p>
            </div>
            <button
              type="button"
              onClick={() => updatePortalConfig(DEFAULT_PORTAL_CONFIG)}
              className="text-xs text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg font-medium transition-colors"
            >
              🔄 Palauta portaalin oletusasetukset
            </button>
          </div>

          {/* 1. Mobiilikarusellin asetukset */}
          <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/90 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="font-martti font-bold text-sm text-slate-900 flex items-center gap-2">
                  <span>🎠</span> 1. Mobiili edellä -karuselli (Hero Carousel)
                </h4>
                <p className="text-xs text-slate-600">
                  Kosketusystävällinen karuselli nostaa esiin juuri nyt hengellisesti ajankohtaisen sisällön.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 bg-white px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer">
                  <span>Näytä karuselli etusivulla:</span>
                  <input
                    type="checkbox"
                    checked={currentPortalConfig.carousel.enabled}
                    onChange={(e) =>
                      updatePortalConfig((cfg) => ({
                        ...cfg,
                        carousel: { ...cfg.carousel, enabled: e.target.checked }
                      }))
                    }
                    className="rounded text-primary-600 focus:ring-primary-500"
                  />
                </label>

                <select
                  value={currentPortalConfig.carousel.autoPlayMs}
                  onChange={(e) =>
                    updatePortalConfig((cfg) => ({
                      ...cfg,
                      carousel: { ...cfg.carousel, autoPlayMs: Number(e.target.value) }
                    }))
                  }
                  className="input text-xs py-1.5 px-2.5 w-auto"
                  aria-label="Karusellin automaattinen vaihtonopeus"
                >
                  <option value={5000}>Vaihto: 5 sekuntia</option>
                  <option value={7000}>Vaihto: 7 sekuntia (Oletus)</option>
                  <option value={10000}>Vaihto: 10 sekuntia</option>
                  <option value={0}>Ei automaattista vaihtoa</option>
                </select>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {currentPortalConfig.carousel.slides.map((slide, idx) => {
                const slideMeta = {
                  hartaus: { icon: '🕯️', title: 'Päivän hartaus', desc: 'Nostaa tämän päivän hartauden pikalukupainikkeella' },
                  hours: { icon: '🕊️', title: 'Hetkirukous juuri nyt', desc: 'Kellonajan mukainen rukoushetki ja "Rukoile nyt" -painike' },
                  pyhapaiva: { icon: '⛪', title: 'Pyhäpäivä & evankeliumi', desc: 'Sunnuntain/pyhäpäivän teema, liturginen väri ja tekstit' },
                  prayers: { icon: '🙏', title: 'Rukousyhteisö & laskuri', desc: '"Jätä rukouspyyntö" -pikapainike ja "Olen rukoillut" -laskuri' }
                }[slide.id] || { icon: '✨', title: slide.id, desc: '' };

                return (
                  <div
                    key={slide.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                      slide.visible
                        ? 'bg-white border-primary-300 shadow-2xs'
                        : 'bg-gray-100/70 border-gray-200 opacity-60'
                    }`}
                  >
                    <label className="flex items-start gap-2.5 cursor-pointer min-w-0">
                      <input
                        type="checkbox"
                        checked={slide.visible}
                        onChange={() => handleToggleSlide(slide.id)}
                        className="mt-1 rounded text-primary-600"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                          <span>{slideMeta.icon}</span>
                          <span>Dia {idx + 1}: {slideMeta.title}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 leading-snug">{slideMeta.desc}</p>
                      </div>
                    </label>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveSlide(slide.id, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 text-xs"
                        title="Siirrä dia aiemmaksi"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveSlide(slide.id, 'down')}
                        disabled={idx === currentPortalConfig.carousel.slides.length - 1}
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 text-xs"
                        title="Siirrä dia myöhemmäksi"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Yksittäisten sisältöjen nosto etusivulle (Hartaus, Pyhäpäivä, Meditaatiot & Rukoukset) */}
          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-4">
            <div>
              <h4 className="font-martti font-bold text-sm text-amber-950 flex items-center gap-2">
                <span>📌</span> 2. Yksittäisten sisältöjen nostaminen pääsivulle (Lifted Content)
              </h4>
              <p className="text-xs text-amber-900/80 mt-0.5">
                Voit nostaa <strong>voimassa olevan päivän hartauden</strong>, <strong>tämänhetkisen pyhäpäivän</strong> tai <strong>yksittäisen meditaation</strong> täytenä nostokorttina suoraan etusivulle karusellin ylä- tai alapuolelle. (Yksittäiset piispan, kirkkoherran, työalan ja seurakuntalaisen rukouspyynnöt nostetaan <em>Esirukoukset</em>-hallintavälilehdellä!)
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* Voimassa oleva päivän hartaus */}
              <div className="p-3 bg-white rounded-xl border border-amber-200 flex flex-col justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <span>🕯️</span>
                    <span>Voimassa oleva päivän hartaus</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Nostaa kulloinkin vuorossa olevan päivän hartauden suoraan etusivulle luettavaksi.
                  </p>
                </div>
                <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start">
                  {[
                    { id: 'none', label: 'Ei nostoa' },
                    { id: 'above', label: '⬆️ Karusellin yläpuolella' },
                    { id: 'below', label: '⬇️ Karusellin alapuolella' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        updatePortalConfig((cfg) => ({ ...cfg, liftActiveDevotion: opt.id }))
                      }
                      className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                        currentPortalConfig.liftActiveDevotion === opt.id
                          ? 'bg-teal-700 text-white shadow-2xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tuleva / kuluva pyhäpäivä */}
              <div className="p-3 bg-white rounded-xl border border-amber-200 flex flex-col justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <span>⛪</span>
                    <span>Voimassa oleva Pyhäpäivä & evankeliumi</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Nostaa kuluvan/tulevan pyhäpäivän teeman, evankeliumin ja päivän rukouksen etusivulle.
                  </p>
                </div>
                <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start">
                  {[
                    { id: 'none', label: 'Ei nostoa' },
                    { id: 'above', label: '⬆️ Karusellin yläpuolella' },
                    { id: 'below', label: '⬇️ Karusellin alapuolella' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        updatePortalConfig((cfg) => ({ ...cfg, liftCurrentPyhapaiva: opt.id }))
                      }
                      className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                        currentPortalConfig.liftCurrentPyhapaiva === opt.id
                          ? 'bg-amber-700 text-white shadow-2xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Yksittäisten meditaatioiden nosto etusivulle */}
            <div className="pt-2 border-t border-amber-200/60">
              <div className="text-xs font-bold text-amber-950 mb-2 flex items-center gap-1.5">
                <span>📿</span>
                <span>Yksittäisten meditaatioiden nosto etusivulle:</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { id: 'lonnebo_beads', title: 'Pelastuksen rengas (Lönnebo)', icon: '📿' },
                  { id: 'luther_wreath', title: 'Lutherin rukousseppele', icon: '🌹' },
                  { id: 'jesus_prayer', title: 'Jeesuksen rukous (Hengitys)', icon: '🕊️' },
                  { id: 'lectio_divina', title: 'Lectio Divina', icon: '📜' },
                  { id: 'examen', title: 'Ignatiaaninen Examen', icon: '🕯️' },
                  { id: 'advent_children', title: 'Lasten adventti- & kynttilähetki', icon: '🕯️' },
                ].map((med) => {
                  const currentMedPos = currentPortalConfig.liftedMeditations?.[med.id] || 'none';
                  return (
                    <div key={med.id} className="p-2.5 bg-white rounded-xl border border-amber-200/80 flex flex-col justify-between gap-2">
                      <div className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                        <span>{med.icon}</span>
                        <span className="truncate">{med.title}</span>
                      </div>
                      <div className="inline-flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg self-start">
                        {[
                          { id: 'none', label: 'Ei' },
                          { id: 'above', label: '⬆️ Ylä' },
                          { id: 'below', label: '⬇️ Ala' }
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              updatePortalConfig((cfg) => ({
                                ...cfg,
                                liftedMeditations: {
                                  ...(cfg.liftedMeditations || {}),
                                  [med.id]: opt.id
                                }
                              }))
                            }
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                              currentMedPos === opt.id
                                ? opt.id === 'none'
                                  ? 'bg-slate-700 text-white'
                                  : 'bg-teal-700 text-white'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. Moduuliosioiden näkyvyys, Ylä-/Alapuolinen sijainti ja järjestys */}
          <div className="space-y-4">
            <div>
              <h4 className="font-martti font-bold text-sm text-gray-900 flex items-center gap-2">
                <span>📐</span> 3. Etusivun moduuliosiot: Näkyvyys, sijainti (karusellin ylä-/alapuolella) ja järjestys
              </h4>
              <p className="text-xs text-gray-500">
                Määritä jokaiselle päämoduulille, näytetäänkö sen koontiosio etusivulla ja sijoitetaanko se <strong>karusellin yläpuolelle</strong> vai <strong>karusellin alapuolelle</strong>.
              </p>
            </div>

            {[
              { zone: 'above', title: '⬆️ KARUSELLIN YLÄPUOLELLA (Above Carousel)', bg: 'bg-indigo-50/40 border-indigo-200' },
              { zone: 'below', title: '⬇️ KARUSELLIN ALAPUOLELLA (Below Carousel)', bg: 'bg-emerald-50/40 border-emerald-200' }
            ].map((zoneInfo, zIdx) => {
              const zoneSections = currentPortalConfig.sections
                .filter((s) => (zoneInfo.zone === 'above' ? s.position === 'above' : s.position !== 'above'))
                .sort((a, b) => a.order - b.order);

              const sectionMetaMap = {
                prayers: { icon: '🙏', title: formData.module_title_prayers || 'Esirukoukset', desc: 'Kirkkoherran/piispan rukous, yhteisön rukousnostot ja jättönappi' },
                hartaus: { icon: '🕯️', title: formData.module_title_hartaus || 'Hartaus', desc: 'Tämän päivän hartauden esikatselu ja kirjoittajatieto' },
                pyhapaiva: { icon: '⛪', title: formData.module_title_pyhapaiva || 'Pyhäpäivä', desc: 'Pyhäpäivän teema, liturginen väri ja sunnuntain evankeliumi' },
                hours: { icon: '⏰', title: formData.module_title_hours || 'Hetkirukous', desc: 'Ajankohtainen rukoushetki (Laudes, Seksti, Vesper, Kompletorio, Pieni rukoushetki)' },
                meditations: { icon: '📿', title: formData.module_title_meditations || 'Meditaatiot', desc: 'Rukoushelmet, katekismusmeditaatio, hengitysrukous ja hiljaisuus' },
                bible: { icon: '📖', title: formData.module_title_bible || 'Raamattu & Sana', desc: 'Päivän sana -jae, mietiskely ja raamatunlukukappaleet' }
              };

              return (
                <div key={zoneInfo.zone} className="space-y-3">
                  {zIdx === 1 && (
                    <div className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-primary-800 via-teal-800 to-primary-900 text-white text-center text-xs font-bold tracking-wider uppercase shadow-xs flex items-center justify-center gap-2">
                      <span>🎠</span>
                      <span>Mobiili edellä -karuselli sijaitsee tässä välissä</span>
                    </div>
                  )}

                  <div className={`p-3.5 rounded-2xl border ${zoneInfo.bg} space-y-2.5`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-800">
                        {zoneInfo.title}
                      </span>
                      <span className="text-[11px] text-gray-500 font-medium">
                        {zoneSections.length} osiota
                      </span>
                    </div>

                    {zoneSections.length === 0 ? (
                      <div className="p-3 rounded-xl bg-white/70 border border-dashed border-gray-300 text-center text-xs text-gray-500 italic">
                        Ei osioita tässä vyöhykkeessä. Voit siirtää minkä tahansa osion tähän valitsemalla sen sijainniksi &rdquo;{zoneInfo.zone === 'above' ? 'Karusellin yläpuolella' : 'Karusellin alapuolella'}&rdquo;.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {zoneSections.map((sec, idx) => {
                          const meta = sectionMetaMap[sec.id] || { icon: '🧩', title: sec.id, desc: '' };
                          return (
                            <div
                              key={sec.id}
                              className={`p-3 rounded-xl border bg-white flex flex-wrap items-center justify-between gap-3 transition-all ${
                                sec.visible ? 'border-gray-200 shadow-2xs' : 'border-gray-200 opacity-55 bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="text-xl shrink-0">{meta.icon}</span>
                                <div className="min-w-0">
                                  <div className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <span>{meta.title}</span>
                                    {!sec.visible && (
                                      <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-gray-200 text-gray-600">
                                        Piilotettu etusivulta
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-gray-500 truncate">{meta.desc}</p>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 ml-auto">
                                {/* Visibility toggle */}
                                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={sec.visible}
                                    onChange={(e) => handleUpdateSection(sec.id, { visible: e.target.checked })}
                                    className="rounded text-primary-600"
                                  />
                                  <span>Näytä</span>
                                </label>

                                {/* Above / Below Carousel Position Switcher */}
                                <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateSection(sec.id, { position: 'above', order: 99 })}
                                    className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
                                      sec.position === 'above'
                                        ? 'bg-indigo-700 text-white shadow-2xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                    title="Sijoita karusellin yläpuolelle"
                                  >
                                    ⬆️ Yläpuolella
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateSection(sec.id, { position: 'below', order: 99 })}
                                    className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
                                      sec.position !== 'above'
                                        ? 'bg-emerald-700 text-white shadow-2xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                    title="Sijoita karusellin alapuolelle"
                                  >
                                    ⬇️ Alapuolella
                                  </button>
                                </div>

                                {/* Order Up / Down buttons */}
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleMoveSectionInZone(sec.id, sec.position, 'up')}
                                    disabled={idx === 0}
                                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-30 text-xs font-bold"
                                    title="Siirrä ylemmäs"
                                  >
                                    ↑
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleMoveSectionInZone(sec.id, sec.position, 'down')}
                                    disabled={idx === zoneSections.length - 1}
                                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-30 text-xs font-bold"
                                    title="Siirrä alemmas"
                                  >
                                    ↓
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Aktiiviset meditaatiot */}
        <div className="card">
          <h3 className="font-martti font-bold text-sm text-gray-900 uppercase tracking-wide mb-2 flex items-center gap-2">
            <span>📿</span> Aktiiviset meditaatiot ja rukousperinteet
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Valitse mitkä meditaatiomuodot ovat käytettävissä seurakuntalaisille Meditaatiot-osiossa. Ylläpitäjät näkevät aina kaikki meditaatiot.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { id: 'lonnebo_beads', title: 'Pelastuksen rengas (Lönnebo)', icon: '📿', desc: 'Martti Lönnebon rukoushelmet (18 helmeä)' },
              { id: 'luther_wreath', title: 'Lutherin rukousseppele', icon: '🌹', desc: 'Vähän katekismuksen mukainen rukous ja uskontunnustus' },
              { id: 'jesus_prayer', title: 'Jeesuksen rukous (Sydämen rukous)', icon: '🕊️', desc: 'Itäisen kirkon ikiaikainen kontemplatiivinen rukous' },
              { id: 'lectio_divina', title: 'Lectio Divina (Hengellinen lukeminen)', icon: '📜', desc: 'Klassinen nelivaiheinen Raamatun mietiskely' },
              { id: 'examen', title: 'Ignatiaaninen tutkistelu (Examen)', icon: '🕯️', desc: 'Päivän läpikäynti ja Jumalan läsnäolon tunnistaminen' },
            ].map((med) => {
              const activeMeds = parseSettingsList(
                formData.active_meditations,
                ['lonnebo_beads', 'luther_wreath', 'jesus_prayer', 'lectio_divina', 'examen']
              );
              const isChecked = activeMeds.includes(med.id);

              return (
                <div
                  key={med.id}
                  onClick={() => {
                    let next;
                    if (isChecked) {
                      if (activeMeds.length === 1) {
                        alert('Vähintään yhden meditaation on oltava aktiivinen.');
                        return;
                      }
                      next = activeMeds.filter((x) => x !== med.id);
                    } else {
                      next = [...activeMeds, med.id];
                    }
                    setFormData((prev) => ({ ...prev, active_meditations: JSON.stringify(next) }));
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    isChecked
                      ? 'border-teal-600 bg-teal-50/50 shadow-sm ring-1 ring-teal-500/30'
                      : 'border-gray-200 bg-gray-50/60 opacity-60 hover:opacity-90'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xl">{med.icon}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded text-teal-600 focus:ring-teal-500 pointer-events-none"
                      />
                    </div>
                    <h4 className="font-semibold text-xs text-gray-900">{med.title}</h4>
                    <p className="text-[11px] text-gray-500 mt-1 leading-snug">{med.desc}</p>
                  </div>
                  <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-right">
                    {isChecked ? (
                      <span className="text-teal-700">Käytössä</span>
                    ) : (
                      <span className="text-gray-400">Pois päältä</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

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

            <div>
              <label className="label">Palvelun brändinimi (Brand Name)</label>
              <input
                type="text"
                value={formData.brand_name || ''}
                onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                className="input text-sm"
                placeholder="Rukoushetki"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Palvelun yleisnimi (oletus: Rukoushetki).
              </p>
            </div>
            <div>
              <label className="label">Yläpalkin korostus (Header Prominence)</label>
              <select
                value={formData.header_prominence || 'parish'}
                onChange={(e) => setFormData({ ...formData, header_prominence: e.target.value })}
                className="input text-sm"
              >
                <option value="parish">Seurakunta ensisijaisena (Seurakunnan nimi suurella, brändi pienenä)</option>
                <option value="brand">Brändinimi ensisijaisena (Brändinimi suurella, seurakunta pienenä)</option>
              </select>
              <p className="text-[11px] text-gray-500 mt-1">
                Määrittää kumpi näkyy sivun yläpalkissa ensisijaisena otsikkona.
              </p>
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

                        <div className="w-full h-28 flex items-center justify-center p-2 my-2 bg-stone-50/70 rounded-lg border border-stone-100">
                          <ChurchCircleLogo
                            variant={variant.id}
                            className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-2xs"
                            alt={variant.subtitle}
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
                  <div className="flex items-center gap-2">
                    <img
                      src={withBasePath(formData.church_logo_url)}
                      alt="Oma kirkon logo"
                      className="w-7 h-7 object-contain rounded-full border border-emerald-300 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, church_logo_url: '' })}
                      className="text-xs text-red-600 underline"
                    >
                      Palauta virallinen kirkon SVG
                    </button>
                  </div>
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
                    <img src={withBasePath(formData.parish_logo_url)} alt="Seurakunnan logo" className="max-h-full max-w-full object-contain" />
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
                    src={withBasePath(formData.bishop_crest_url || '/tampere_piispan_vaakuna.png')}
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
                      src={withBasePath(formData.pastor_logo_url)}
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

        {/* 5. Prayer Week Cycle & Rollover */}
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
