import { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import BlockBuilder from '../common/blocks/BlockBuilder';
import { ensureMeditationBlocks } from '../common/blocks/legacyDevotionAdapter';
import { meditationClient } from '../common/blocks/meditationClient';

export default function MeditationManager() {
  const { currentTenant } = useTenant();
  const [meditations, setMeditations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  const loadMeditations = async () => {
    setLoading(true);
    try {
      const res = await meditationClient.getMeditations(true, currentTenant?.slug);
      setMeditations(res?.meditations || []);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Meditaatioiden lataus epäonnistui' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeditations();
  }, [currentTenant?.slug]);

  const handleStartCreate = () => {
    setEditingItem({
      id: null,
      dbId: null,
      slug: '',
      template_key: null,
      title: '',
      subtitle: '',
      category: 'custom',
      icon: '🕯️',
      shortDescription: '',
      introduction: '',
      display_order: (meditations.length + 1) * 10,
      is_published: true,
      portal_position: null,
      blocks: [
        {
          id: `intro_${Date.now()}`,
          type: 'intro',
          data: {
            title: 'Tervetuloa hiljentymään',
            content: 'Kirjoita tähän meditaation tai rukoushetken johdanto...',
          },
        },
      ],
    });
    setFeedback(null);
  };

  const handleStartEdit = (med) => {
    setEditingItem({
      id: med.dbId || med.id,
      dbId: med.dbId || null,
      slug: med.slug || med.id,
      template_key: med.template_key || med.id,
      title: med.title || '',
      subtitle: med.subtitle || '',
      category: med.category || 'custom',
      icon: med.icon || '📿',
      shortDescription: med.shortDescription || med.short_description || '',
      introduction: med.introduction || '',
      display_order: med.display_order ?? 100,
      is_published: med.is_published !== false,
      is_system_template: Boolean(med.is_system_template),
      portal_position: med.portal_position || null,
      blocks: JSON.parse(JSON.stringify(ensureMeditationBlocks(med))),
    });
    setFeedback(null);
  };

  const handleDuplicate = (med) => {
    setEditingItem({
      id: null,
      dbId: null,
      slug: `${med.slug || med.id}_oma_${Date.now().toString(36).slice(-4)}`,
      template_key: null,
      title: `${med.title} (Seurakunnan versio)`,
      subtitle: med.subtitle || '',
      category: med.category || 'custom',
      icon: med.icon || '📿',
      shortDescription: med.shortDescription || '',
      introduction: med.introduction || '',
      display_order: (meditations.length + 1) * 10,
      is_published: true,
      portal_position: null,
      blocks: JSON.parse(JSON.stringify(ensureMeditationBlocks(med))),
    });
    setFeedback(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    setSaving(true);
    setFeedback(null);
    try {
      await meditationClient.saveMeditation({
        ...editingItem,
        tenant: currentTenant?.slug,
      });
      setFeedback({ type: 'success', text: 'Meditaatio tallennettu onnistuneesti!' });
      setEditingItem(null);
      await loadMeditations();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Tallennus epäonnistui' });
    } finally {
      setSaving(false);
    }
  };

  const handlePortalPositionChange = async (med, nextPos) => {
    try {
      await meditationClient.updateMeditationPortal(
        med.dbId || med.id,
        nextPos || null,
        currentTenant?.slug
      );
      setFeedback({
        type: 'success',
        text: nextPos
          ? `Meditaatio "${med.title}" nostettu etusivulle (${nextPos === 'above' ? 'karusellin yläpuolelle' : 'karusellin alapuolelle'}).`
          : `Meditaation "${med.title}" etusivunosto poistettu.`,
      });
      await loadMeditations();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Etusivunoston päivitys epäonnistui' });
    }
  };

  const handleDelete = async (med) => {
    if (!window.confirm(`Haluatko varmasti poistaa meditaation "${med.title}"?`)) return;
    try {
      await meditationClient.deleteMeditation(med.dbId || med.id, currentTenant?.slug);
      setFeedback({ type: 'success', text: 'Meditaatio poistettu.' });
      await loadMeditations();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Poisto epäonnistui' });
    }
  };

  return (
    <div className="space-y-6" data-testid="meditation-manager">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-50 via-sky-50 to-indigo-50 p-5 rounded-3xl border border-teal-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-martti text-xl sm:text-2xl font-bold text-stone-900 flex items-center gap-2">
            <span>📿</span>
            <span>Meditaatioiden ja rukoushetkien rakentaja</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Muokkaa klassisia meditaatioperinteitä, rakenna uusia rukouspolkuja ja lasten kynttilähetkiä palikoista tai nosta niitä etusivulle.
          </p>
        </div>
        {!editingItem && (
          <button
            type="button"
            onClick={handleStartCreate}
            className="btn-primary text-xs sm:text-sm py-2.5 px-5 rounded-2xl font-semibold flex items-center gap-2"
          >
            <span>+</span>
            <span>Rakenna uusi meditaatio</span>
          </button>
        )}
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs sm:text-sm font-medium border ${
            feedback.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-emerald-50 text-emerald-900 border-emerald-200'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* EDITOR FORM */}
      {editingItem ? (
        <form
          onSubmit={handleSave}
          className="card p-5 sm:p-7 bg-white border border-stone-200 rounded-3xl space-y-6 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
                🛠️ Rakennuspalikkaeditori (Building Blocks)
              </span>
              <h3 className="font-martti text-lg sm:text-xl font-bold text-stone-900">
                {editingItem.id ? `Muokkaa: ${editingItem.title}` : 'Luo uusi meditaatio'}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100"
            >
              ← Palaa listaan
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Meditaation otsikko *
              </label>
              <input
                type="text"
                required
                placeholder="Esim. Lasten adventtihetki tai Hiljaisen viikon rukoushelmet"
                value={editingItem.title}
                onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                className="input-field text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Kuvake (Emoji)
              </label>
              <input
                type="text"
                value={editingItem.icon}
                onChange={(e) => setEditingItem({ ...editingItem, icon: e.target.value })}
                className="input-field text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Perinnekategoria
              </label>
              <select
                value={editingItem.category || 'custom'}
                onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                className="input-field text-xs sm:text-sm"
              >
                <option value="rukoushelmet">📿 Rukoushelmet</option>
                <option value="luther">🌹 Luther / Katekismus</option>
                <option value="huokaus">🕯️ Huokaus- &amp; Sydämen rukous</option>
                <option value="lectio">📖 Lectio Divina</option>
                <option value="examen">🌙 Examen / Iltakatselmus</option>
                <option value="advent">🕯️ Adventti &amp; Perheet</option>
                <option value="hours">⏰ Hetkirukous</option>
                <option value="custom">✨ Seurakunnan oma</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Alaotsikko
              </label>
              <input
                type="text"
                placeholder="Lyhyt tarkenne otsikon alle"
                value={editingItem.subtitle}
                onChange={(e) => setEditingItem({ ...editingItem, subtitle: e.target.value })}
                className="input-field text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                📌 Näkyvyys etusivulla
              </label>
              <select
                value={editingItem.portal_position || ''}
                onChange={(e) =>
                  setEditingItem({
                    ...editingItem,
                    portal_position: e.target.value || null,
                  })
                }
                className="input-field text-xs sm:text-sm"
              >
                <option value="">Ei nostoa etusivulle</option>
                <option value="above">⬆️ Karusellin yläpuolella</option>
                <option value="below">⬇️ Karusellin alapuolella</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Julkaisutila
              </label>
              <select
                value={editingItem.is_published ? 'true' : 'false'}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, is_published: e.target.value === 'true' })
                }
                className="input-field text-xs sm:text-sm"
              >
                <option value="true">✓ Julkinen</option>
                <option value="false">Luonnos / Piilotettu</option>
              </select>
            </div>

            <div className="sm:col-span-4">
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Johdanto ja taustoitus
              </label>
              <textarea
                rows={2}
                placeholder="Historiallinen tai hengellinen johdanto meditaation alkuun..."
                value={editingItem.introduction}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, introduction: e.target.value })
                }
                className="input-field text-xs sm:text-sm font-serif"
              />
            </div>
          </div>

          <BlockBuilder
            blocks={editingItem.blocks}
            title={editingItem.title}
            onChange={(nextBlocks) => setEditingItem({ ...editingItem, blocks: nextBlocks })}
          />

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              className="btn-secondary text-xs py-2 px-4"
            >
              Peruuta
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary text-xs py-2.5 px-6 font-semibold"
            >
              {saving ? 'Tallennetaan...' : '💾 Tallenna meditaatio'}
            </button>
          </div>
        </form>
      ) : (
        /* MEDITATIONS LIST */
        <div className="space-y-3">
          {loading ? (
            <div className="p-8 text-center text-stone-500 text-sm">Ladataan meditaatioita...</div>
          ) : meditations.length === 0 ? (
            <div className="p-8 text-center text-stone-500 text-sm">Ei meditaatioita.</div>
          ) : (
            meditations.map((med) => {
              const blockCount = ensureMeditationBlocks(med).length;
              return (
                <div
                  key={med.id}
                  className="card p-4 sm:p-5 bg-white border border-stone-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-teal-300 transition-all"
                >
                  <div className="flex items-start gap-3.5">
                    <span className="text-2xl sm:text-3xl pt-0.5">{med.icon}</span>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-martti font-bold text-base sm:text-lg text-stone-900">
                          {med.title}
                        </h3>
                        {med.is_system_template && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200">
                            Perinnemalli
                          </span>
                        )}
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                          {blockCount} palikkaa
                        </span>
                        {med.isActive === false && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                            Piilotettu
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-600">{med.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Main Page Portal Lifting Dropdown */}
                    <select
                      aria-label={`Nosta ${med.title} etusivulle`}
                      value={med.portal_position || ''}
                      onChange={(e) => handlePortalPositionChange(med, e.target.value || null)}
                      className={`text-xs rounded-xl border px-2.5 py-1.5 font-medium ${
                        med.portal_position
                          ? 'bg-teal-50 border-teal-400 text-teal-900 font-semibold'
                          : 'bg-stone-50 border-stone-200 text-stone-700'
                      }`}
                    >
                      <option value="">📌 Ei etusivunostoa</option>
                      <option value="above">📌 ⬆️ Karusellin yläpuolella</option>
                      <option value="below">📌 ⬇️ Karusellin alapuolella</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => handleStartEdit(med)}
                      className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
                    >
                      🛠️ Muokkaa palikoita
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDuplicate(med)}
                      className="px-2.5 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-medium"
                      title="Luo kopio pohjaksi uudelle meditaatiolle"
                    >
                      Kopioi
                    </button>

                    {!med.is_system_template && (
                      <button
                        type="button"
                        onClick={() => handleDelete(med)}
                        className="px-2.5 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-medium"
                      >
                        Poista
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
