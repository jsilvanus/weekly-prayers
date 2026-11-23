import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import LandingHero from '../common/LandingHero';
import BlockRenderer from '../common/blocks/BlockRenderer';
import BlockBuilder from '../common/blocks/BlockBuilder';
import { ensureMeditationBlocks } from '../common/blocks/legacyDevotionAdapter';
import { meditationClient } from '../common/blocks/meditationClient';
import { useTenant } from '../../context/TenantContext';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';

export default function MeditationPage() {
  const { t } = useTranslation();
  const { currentTenant, isModuleEnabled } = useTenant();
  const { getModuleTitle } = useSettings();
  const { user, isWorkerOrAbove } = useAuth();
  const canEdit = isWorkerOrAbove || user?.role === 'admin' || user?.role === 'devotion';
  const isEnabled = isModuleEnabled('meditations');

  const [meditations, setMeditations] = useState([]);
  const [activeTab, setActiveTab] = useState('lonnebo_beads');
  const [loading, setLoading] = useState(true);
  const [isPrintView, setIsPrintView] = useState(false);
  const [printLayout, setPrintLayout] = useState('indented'); // 'standard' | 'indented' | 'compact'

  // Inline Builder state for Staff / Admin
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [builderForm, setBuilderForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await meditationClient.getMeditations(canEdit, currentTenant?.slug);
      if (res?.meditations && res.meditations.length > 0) {
        setMeditations(res.meditations);
        if (!res.meditations.some((m) => m.id === activeTab || m.slug === activeTab)) {
          setActiveTab(res.meditations[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load meditations from backend:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [canEdit, currentTenant?.slug]);

  const activeMeditation =
    meditations.find((m) => m.id === activeTab || m.slug === activeTab) || meditations[0];

  const resolvedBlocks = ensureMeditationBlocks(activeMeditation);

  const handleStartPractice = () => {
    const el = document.getElementById('meditation-content-area');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleOpenEdit = (med) => {
    setBuilderForm({
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
      portal_position: med.portal_position || null,
      is_published: med.is_published !== false,
      blocks: JSON.parse(JSON.stringify(ensureMeditationBlocks(med))),
    });
    setIsBuilderOpen(true);
    setFeedback(null);
  };

  const handleOpenCreateNew = () => {
    setBuilderForm({
      id: null,
      dbId: null,
      slug: '',
      template_key: null,
      title: 'Uusi meditaatio tai rukoushetki',
      subtitle: 'Seurakunnan oma hiljentymisen polku',
      category: 'custom',
      icon: '🕯️',
      shortDescription: '',
      introduction: '',
      portal_position: null,
      is_published: true,
      blocks: [
        {
          id: `intro_${Date.now()}`,
          type: 'intro',
          data: {
            title: 'Tervetuloa hiljentymään',
            content: 'Asetu rauhaan Jumalan kasvojen eteen.',
          },
        },
      ],
    });
    setIsBuilderOpen(true);
    setFeedback(null);
  };

  const handleSaveBuilder = async (e) => {
    e.preventDefault();
    if (!builderForm) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await meditationClient.saveMeditation({
        ...builderForm,
        tenant: currentTenant?.slug,
      });
      setFeedback({ type: 'success', text: 'Meditaatio tallennettu onnistuneesti!' });
      setIsBuilderOpen(false);
      await loadData();
      if (res?.meditation?.id) {
        setActiveTab(res.meditation.id);
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Tallennus epäonnistui' });
    } finally {
      setSaving(false);
    }
  };

  const handleQuickPortalLift = async (med, position) => {
    try {
      await meditationClient.updateMeditationPortal(
        med.dbId || med.id,
        position,
        currentTenant?.slug
      );
      await loadData();
    } catch (err) {
      console.error('Portal lift update failed:', err);
    }
  };

  const moduleTitle = getModuleTitle
    ? getModuleTitle('meditations', 'Kristilliset meditaatiot & Hiljaisuus')
    : 'Kristilliset meditaatiot & Hiljaisuus';

  if (!isEnabled && !canEdit) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="text-4xl">📿</div>
        <h2 className="font-martti text-2xl font-bold text-stone-900">
          {moduleTitle} ei ole käytössä
        </h2>
        <p className="text-sm text-stone-600">
          Tämä osio ei ole tällä hetkellä aktivoitu seurakunnan sivustolla.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 btn-primary text-xs py-2 px-4 rounded-full"
        >
          &larr; Siirry etusivulle
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {!isEnabled && canEdit && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 px-4 py-2.5 rounded-2xl text-xs sm:text-sm flex items-center gap-2 font-medium print:hidden">
          <span>⚠️</span>
          <span>
            Meditaatiot on poissa käytöstä julkisilta kävijöiltä. Ylläpitäjänä ja työntekijänä näet
            sivun normaalisti.
          </span>
        </div>
      )}

      {/* Landing Hero with Sibling cross-navigation */}
      <div className="print:hidden">
        <LandingHero
          currentModule="meditations"
          title={moduleTitle}
          subtitle="Rukoushelmien, katekismuksen, sydämen rukouksen ja adventtikynttilöiden perinne johdattaa hiljentymään, rauhoittumaan ja kohtaamaan Jumalan arjen keskellä."
          primaryAction={{
            label: 'Aloita hiljentyminen',
            icon: '📿',
            onClick: handleStartPractice,
          }}
        />
      </div>

      {/* Tabs navigation for Meditations */}
      <div
        id="meditation-content-area"
        className="bg-gray-100/90 p-1.5 rounded-2xl border border-gray-200 shadow-2xs print:hidden"
      >
        <div className="flex items-center justify-between gap-2">
          <nav
            className="flex items-center gap-1 overflow-x-auto scrollbar-thin pb-0.5"
            aria-label="Meditaatioperinteet"
          >
            {meditations.map((med) => {
              const isSelected = activeTab === med.id || activeTab === med.slug;
              return (
                <button
                  key={med.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(med.id);
                    setIsBuilderOpen(false);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-white text-primary-900 shadow-sm font-semibold ring-1 ring-black/5'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                  }`}
                >
                  <span className="text-base">{med.icon}</span>
                  <span>{med.title.split('(')[0].trim()}</span>
                  {med.portal_position && (
                    <span
                      className="text-[10px] font-bold text-teal-800 bg-teal-100 px-1.5 py-0.2 rounded-full"
                      title={`Nostettu etusivulle (${med.portal_position === 'above' ? 'Karusellin yläpuolella' : 'Karusellin alapuolella'})`}
                    >
                      📌
                    </span>
                  )}
                  {med.isActive === false && (
                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/90 px-1.5 py-0.2 rounded-full border border-amber-300">
                      Ei julkinen
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {canEdit && (
            <button
              type="button"
              onClick={handleOpenCreateNew}
              className="shrink-0 px-3 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs flex items-center gap-1 shadow-xs"
            >
              <span>+</span>
              <span className="hidden sm:inline">Uusi meditaatio</span>
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs sm:text-sm font-medium border print:hidden ${
            feedback.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-emerald-50 text-emerald-900 border-emerald-200'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* INLINE BLOCK BUILDER FOR STAFF / ADMIN */}
      {isBuilderOpen && builderForm ? (
        <form
          onSubmit={handleSaveBuilder}
          className="card p-5 sm:p-7 bg-white border-2 border-teal-600/40 rounded-3xl space-y-6 shadow-md print:hidden"
        >
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
                🛠️ Meditaatiorakentaja (Building Blocks)
              </span>
              <h3 className="font-martti text-lg sm:text-xl font-bold text-stone-900">
                {builderForm.dbId ? `Muokkaa: ${builderForm.title}` : 'Rakenna uusi meditaatio'}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsBuilderOpen(false)}
              className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100"
            >
              Sulje editori
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-stone-700 block mb-1">Otsikko</label>
              <input
                type="text"
                required
                value={builderForm.title}
                onChange={(e) => setBuilderForm({ ...builderForm, title: e.target.value })}
                className="input-field text-xs sm:text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">Ikoni</label>
              <input
                type="text"
                value={builderForm.icon}
                onChange={(e) => setBuilderForm({ ...builderForm, icon: e.target.value })}
                className="input-field text-xs sm:text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                📌 Nosta etusivulle
              </label>
              <select
                value={builderForm.portal_position || ''}
                onChange={(e) =>
                  setBuilderForm({
                    ...builderForm,
                    portal_position: e.target.value || null,
                  })
                }
                className="input-field text-xs sm:text-sm"
              >
                <option value="">Ei nostoa</option>
                <option value="above">⬆️ Karusellin yläpuolelle</option>
                <option value="below">⬇️ Karusellin alapuolelle</option>
              </select>
            </div>
            <div className="sm:col-span-4">
              <label className="text-xs font-semibold text-stone-700 block mb-1">Alaotsikko</label>
              <input
                type="text"
                value={builderForm.subtitle}
                onChange={(e) => setBuilderForm({ ...builderForm, subtitle: e.target.value })}
                className="input-field text-xs sm:text-sm"
              />
            </div>
            <div className="sm:col-span-4">
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Johdanto / taustoitus
              </label>
              <textarea
                rows={2}
                value={builderForm.introduction}
                onChange={(e) => setBuilderForm({ ...builderForm, introduction: e.target.value })}
                className="input-field text-xs sm:text-sm font-serif"
              />
            </div>
          </div>

          <BlockBuilder
            blocks={builderForm.blocks}
            title={builderForm.title}
            onChange={(nextBlocks) => setBuilderForm({ ...builderForm, blocks: nextBlocks })}
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setIsBuilderOpen(false)}
              className="btn-secondary text-xs py-2 px-4"
            >
              Peruuta
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary text-xs py-2 px-5 font-semibold"
            >
              {saving ? 'Tallennetaan...' : '💾 Tallenna meditaatio'}
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <div className="text-center py-12 text-gray-500 text-sm">Ladataan meditaatioita...</div>
      ) : !activeMeditation ? (
        <div className="text-center py-8 text-gray-500">Meditaatioita ei löytynyt.</div>
      ) : (
        <div className="space-y-6">
          {/* Header Card for current Meditation */}
          <div className="bg-gradient-to-r from-teal-50/70 via-sky-50/50 to-indigo-50/70 p-5 sm:p-7 rounded-3xl border border-teal-200/70 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl sm:text-3xl">{activeMeditation.icon}</span>
                <div>
                  <h2 className="font-martti text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                    {activeMeditation.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-primary-800 font-medium">
                    {activeMeditation.subtitle}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Print Leaflet & Staff Customize / Lift */}
              <div className="flex flex-wrap items-center gap-1.5 print:hidden">
                <button
                  type="button"
                  onClick={() => setIsPrintView((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                    isPrintView
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-white/90 hover:bg-white text-stone-800 border-stone-300'
                  }`}
                >
                  <span>🖨️</span>
                  <span>{isPrintView ? 'Normaalinäkymä' : 'Tulosta lehtinen'}</span>
                </button>

                {canEdit && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(activeMeditation)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/90 hover:bg-white text-teal-900 border border-teal-300 flex items-center gap-1"
                    >
                      <span>🛠️</span>
                      <span>Muokkaa palikoita</span>
                    </button>
                    <select
                      aria-label="Nosta etusivulle"
                      value={activeMeditation.portal_position || ''}
                      onChange={(e) =>
                        handleQuickPortalLift(activeMeditation, e.target.value || null)
                      }
                      className="text-xs rounded-xl border border-teal-300 bg-white/90 px-2.5 py-1.5 text-teal-950 font-medium"
                    >
                      <option value="">📌 Ei etusivunostoa</option>
                      <option value="above">📌 ⬆️ Karusellin yläpuolella</option>
                      <option value="below">📌 ⬇️ Karusellin alapuolella</option>
                    </select>
                  </>
                )}
              </div>
            </div>

            {activeMeditation.introduction && (
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mt-3 font-serif">
                {activeMeditation.introduction}
              </p>
            )}

            {/* Print Leaflet Toolbar when active */}
            {isPrintView && (
              <div className="mt-4 pt-3 border-t border-teal-200/70 flex flex-wrap items-center justify-between gap-2 print:hidden">
                <div className="flex items-center gap-2 text-xs text-stone-700">
                  <span className="font-semibold">Käsiohjelman taitto:</span>
                  <select
                    value={printLayout}
                    onChange={(e) => setPrintLayout(e.target.value)}
                    className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs"
                  >
                    <option value="indented">⇥ Sisennetty laulu- ja psalmitaitto</option>
                    <option value="standard">☰ Tavallinen 1-palstainen</option>
                    <option value="compact">📖 Kompakti 2-palstainen lehtinen</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold"
                >
                  🖨️ Avaa tulostusikkuna
                </button>
              </div>
            )}
          </div>

          {/* Dynamic Building Blocks Renderer */}
          <BlockRenderer
            blocks={resolvedBlocks}
            printLayout={printLayout}
            isPrint={isPrintView}
          />
        </div>
      )}
    </div>
  );
}
