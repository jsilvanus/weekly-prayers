import { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../services/api';

export default function TenantManager() {
  const { currentTenant, switchParish, refetchTenant } = useTenant();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [formSaving, setFormSaving] = useState(false);

  const initialFormData = {
    name: '',
    slug: '',
    type: 'seurakunta',
    parent_id: '',
    domain: '',
    diocese: 'Tampereen hiippakunta'
  };

  const [formData, setFormData] = useState(initialFormData);

  const loadTenants = async () => {
    setLoading(true);
    try {
      const res = await api.getTenants();
      setTenants(res?.tenants || []);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Seurakuntien lataus epäonnistui' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const openCreateModal = () => {
    setEditingTenant(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const openEditModal = (t) => {
    setEditingTenant(t);
    setFormData({
      name: t.name || '',
      slug: t.slug || '',
      type: t.type || 'seurakunta',
      parent_id: t.parent_id || '',
      domain: t.domain || '',
      diocese: t.diocese || 'Tampereen hiippakunta'
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTenant(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormSaving(true);
    setFeedback(null);

    try {
      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim().toLowerCase(),
        type: formData.type,
        parent_id: formData.type === 'seurakunta' && formData.parent_id ? formData.parent_id : null,
        domain: formData.domain ? formData.domain.trim() : null,
        diocese: formData.diocese ? formData.diocese.trim() : null
      };

      if (editingTenant) {
        await api.updateTenant(editingTenant.id, payload);
        setFeedback({ type: 'success', text: `Seurakunta "${formData.name}" päivitetty onnistuneesti.` });
      } else {
        await api.createTenant(payload);
        setFeedback({ type: 'success', text: `Uusi seurakunta "${formData.name}" luotu onnistuneesti.` });
      }

      closeModal();
      await loadTenants();
      refetchTenant();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Tallennus epäonnistui' });
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = async (t) => {
    if (!window.confirm(`Haluatko varmasti poistaa seurakunnan "${t.name}"?`)) {
      return;
    }

    try {
      await api.deleteTenant(t.id);
      setFeedback({ type: 'success', text: `Seurakunta "${t.name}" poistettu.` });
      await loadTenants();
      refetchTenant();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Poisto epäonnistui' });
    }
  };

  const yhtymaList = tenants.filter(t => t.type === 'seurakuntayhtyma');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h2 className="font-martti text-xl font-bold text-primary-900">
            Seurakunnat ja yhtymät (Tenants)
          </h2>
          <p className="text-xs text-gray-600 mt-1">
            Hallitse seurakuntia, yhtymärakennetta ja verkkotunnusreitityksiä (domain). Ulkoasu, logot ja värit määritetään <strong>Ilme & asetukset</strong> -välilehdellä.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn-primary flex items-center justify-center gap-1.5 text-sm py-2 px-4 shrink-0 shadow-sm"
        >
          <span>➕</span>
          <span>Uusi seurakunta / yhtymä</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-lg text-sm flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold px-2 py-0.5 rounded hover:bg-black/10"
          >
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-500">Ladataan seurakuntia...</div>
      ) : tenants.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500">Ei vielä lisättyjä seurakuntia.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tenants.map((t) => {
              const isCurrent = currentTenant?.id === t.id || currentTenant?.slug === t.slug;

              return (
                <div
                  key={t.id}
                  className={`bg-white rounded-xl p-5 border shadow-2xs transition-all relative flex flex-col justify-between ${
                    isCurrent ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {t.type === 'seurakuntayhtyma' ? '🏛️' : '⛪'}
                        </span>
                        <h3 className="font-martti text-lg font-bold text-gray-900 leading-tight">
                          {t.name}
                        </h3>
                      </div>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                          t.type === 'seurakuntayhtyma'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {t.type === 'seurakuntayhtyma' ? 'Yhtymä' : 'Seurakunta'}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-gray-600 mt-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-gray-700">Tunniste (slug):</span>
                        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-primary-800 font-mono">
                          {t.slug}
                        </code>
                      </div>

                      {t.domain ? (
                        <div className="flex items-start gap-1.5">
                          <span className="font-semibold text-gray-700 shrink-0">Verkkotunnukset:</span>
                          <span className="text-emerald-700 font-mono bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 break-all">
                            🌐 {t.domain}
                          </span>
                        </div>
                      ) : (
                        <div className="text-gray-400 italic">Ei määriteltyä omaa verkkotunnusta</div>
                      )}

                      {t.parent_name && (
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-gray-700">Kuuluu yhtymään:</span>
                          <span>{t.parent_name}</span>
                        </div>
                      )}

                      {t.diocese && (
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-gray-700">Hiippakunta:</span>
                          <span>{t.diocese}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => switchParish(t.slug)}
                      disabled={isCurrent}
                      className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                        isCurrent
                          ? 'bg-primary-50 text-primary-700 cursor-default font-semibold'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {isCurrent ? '✓ Aktiivinen' : 'Vaihda esikatseluun'}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(t)}
                        className="text-xs text-primary-700 hover:text-primary-900 font-medium px-2 py-1 hover:bg-primary-50 rounded"
                      >
                        Muokkaa
                      </button>
                      <button
                        onClick={() => handleDelete(t)}
                        className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 hover:bg-red-50 rounded"
                      >
                        Poista
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
              <h3 className="font-martti text-lg font-bold text-gray-900">
                {editingTenant ? 'Muokkaa seurakuntaa' : 'Uusi seurakunta tai yhtymä'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  Seurakunnan / yhtymän nimi *
                </label>
                <input
                  type="text"
                  required
                  placeholder="esim. Riihimäen seurakunta"
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      name,
                      slug: !editingTenant && !prev.slugTouched
                        ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                        : prev.slug
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">
                    Tunniste (slug) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="riihimaki"
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      slug: e.target.value.toLowerCase(),
                      slugTouched: true
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-1">
                    Tyyppi
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  >
                    <option value="seurakunta">Seurakunta</option>
                    <option value="seurakuntayhtyma">Seurakuntayhtymä</option>
                  </select>
                </div>
              </div>

              {formData.type === 'seurakunta' && yhtymaList.length > 0 && (
                <div>
                  <label className="block font-medium text-gray-700 mb-1">
                    Emoyhtymä (valinnainen)
                  </label>
                  <select
                    value={formData.parent_id || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, parent_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  >
                    <option value="">-- Ei kuulu yhtymään (itsenäinen) --</option>
                    {yhtymaList.map(y => (
                      <option key={y.id} value={y.id}>
                        {y.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  Verkkotunnukset (Domain & aliverkot)
                </label>
                <input
                  type="text"
                  placeholder="riihimaenseurakunta.fi, riihimaki.rukous.fi"
                  value={formData.domain}
                  onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Voit syöttää useita verkkotunnuksia pilkulla eroteltuna. Tukee pääverkkotunnuksia (<code>riihimaenseurakunta.fi</code>), aliverkkoja (<code>riihimaki.rukous.fi</code>) sekä polkuja (<code>palvelin.fi/rukous</code>).
                </p>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  Hiippakunta
                </label>
                <input
                  type="text"
                  placeholder="Tampereen hiippakunta"
                  value={formData.diocese}
                  onChange={(e) => setFormData(prev => ({ ...prev, diocese: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Peruuta
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="btn-primary py-2 px-5 shadow-sm font-medium"
                >
                  {formSaving ? 'Tallennetaan...' : (editingTenant ? 'Tallenna muutokset' : 'Luo seurakunta')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}