import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { useTenant } from '../../context/TenantContext';
import { PastorSealLogo } from '../../assets/churchIcons';

function PastorPrayerForm() {
  const { t } = useTranslation();
  const { currentTenant, yhtyma, isPartOfYhtyma } = useTenant();
  const [content, setContent] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [isYhtymaWide, setIsYhtymaWide] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Valitse kuvatiedosto (PNG, JPG tai SVG)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoUrl(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!content.trim()) return;

    setLoading(true);
    setMessage(null);

    try {
      await api.submitPastorPrayer(
        content.trim(),
        undefined,
        undefined,
        logoUrl || undefined,
        isYhtymaWide,
        currentTenant?.id
      );
      setMessage({ type: 'success', text: 'Kirkkoherran aihe lisätty onnistuneesti.' });
      setContent('');
      setLogoUrl('');
      setIsYhtymaWide(false);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-martti text-xl font-bold text-primary-900">
            {t('admin.pastor.title')}
          </h2>
          <p className="text-xs text-gray-500">
            Lisää seurakunnan kirkkoherran rukousaihe kuluvalle viikolle.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card">
        {/* Yhtymä-wide toggle */}
        {isPartOfYhtyma && (
          <div className="mb-4 p-3.5 bg-gradient-to-r from-blue-50/80 to-indigo-50/60 border border-blue-200/80 rounded-xl" data-testid="pastor-yhtyma-wide-toggle">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isYhtymaWide}
                onChange={(e) => setIsYhtymaWide(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                disabled={loading}
              />
              <div>
                <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <span className="text-base">🏛️</span>
                  <span>{t('admin.pastor.yhtymaWide') || 'Yhtymän laajuinen kirkkoherran aihe'}</span>
                </span>
                <p className="text-xs text-slate-600 mt-0.5">
                  {`Aihe näkyy kaikissa ${yhtyma?.name || 'seurakuntayhtymän'} seurakunnissa.`}
                </p>
              </div>
            </label>
          </div>
        )}

        <textarea
          className="textarea h-44 mb-4"
          placeholder="Kirjoita kirkkoherran rukousaihe tähän..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={3000}
          disabled={loading}
        />

        {/* Optional Pastor Logo / Seal Upload */}
        <div className="mb-4 p-3.5 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-800 uppercase tracking-wide">
              Valinnainen kirkkoherran tunnus / sinetti (PNG, JPG, SVG)
            </label>
            <span className="text-[11px] text-gray-500 italic">Valinnainen</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded border border-gray-200 p-1 flex items-center justify-center shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Kirkkoherran logo" className="max-h-full max-w-full object-contain" />
              ) : (
                <PastorSealLogo className="w-8 h-8 opacity-40" />
              )}
            </div>

            <div className="flex-1 text-xs">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/png,image/jpeg,image/svg+xml"
                className="hidden"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary text-xs py-1 px-3"
                >
                  📁 {logoUrl ? 'Vaihda logo (PNG)' : 'Lataa kirkkoherran logo'}
                </button>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl('')}
                    className="text-xs text-red-600 hover:text-red-800 underline"
                  >
                    Poista logo
                  </button>
                )}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Jos kuvaa ei ladata, aihe näytetään ilman logoa.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">{content.length}/3000</span>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !content.trim()}
          >
            {loading ? t('common.loading') : t('admin.pastor.add')}
          </button>
        </div>

        {message && (
          <div
            className={`mt-4 p-3 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}
      </form>
    </div>
  );
}

export default PastorPrayerForm;
