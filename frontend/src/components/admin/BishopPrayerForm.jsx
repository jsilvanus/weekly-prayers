import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import DateRangeCalendar from '../common/DateRangeCalendar';
import { BishopCrestLogo } from '../../assets/churchIcons';

function BishopPrayerForm() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const bishopName = settings?.bishop_name || 'Matti Repo';
  const bishopDiocese = settings?.bishop_diocese || 'Tampereen hiippakunta';
  const defaultCrest = settings?.bishop_crest_url || '/tampere_piispan_vaakuna.png';
  const [content, setContent] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
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
      await api.submitBishopPrayer(
        content.trim(),
        startDate || undefined,
        endDate || undefined,
        logoUrl || undefined
      );
      setMessage({ type: 'success', text: t('admin.bishop.success') });
      setContent('');
      setLogoUrl('');
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xl">☩</span>
        <div>
          <h2 className="font-martti text-xl font-bold text-purple-900">
            {t('admin.bishop.title')} — Piispa {bishopName}
          </h2>
          <p className="text-xs text-gray-500">
            {bishopDiocese} — Valinnainen piispan rukousaihe. Näytetään etusivulla ja messutulosteessa vain, jos aihe on lisätty.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card border-purple-200">
        <textarea
          className="textarea h-40 mb-4 border-purple-200 focus:border-purple-500"
          placeholder={t('admin.bishop.placeholder')}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={3000}
          disabled={loading}
        />

        {/* Bishop Crest / Logo Upload Section */}
        <div className="mb-4 p-3.5 bg-purple-50/60 rounded-lg border border-purple-200">
          <label className="block text-xs font-semibold text-purple-950 uppercase tracking-wide mb-2">
            Piispan vaakuna / Crest (Oletus: Tampereen hiippakunnan vaakuna)
          </label>
          <div className="flex items-center gap-4">
            <div className="w-14 h-16 bg-white rounded border border-purple-200 p-1 flex items-center justify-center shrink-0 shadow-sm">
              <img
                src={logoUrl || defaultCrest}
                alt="Piispan vaakuna"
                className="max-h-full max-w-full object-contain"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/tampere_piispan_vaakuna.png';
                }}
              />
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
                  className="btn-secondary text-xs py-1 px-3 border border-purple-300 hover:bg-purple-100 text-purple-900"
                >
                  📁 Lataa oma vaakuna (PNG)
                </button>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl('')}
                    className="text-xs text-red-600 hover:text-red-800 underline"
                  >
                    Palauta oletustunnus
                  </button>
                )}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Näytetään piispan rukousaiheen yhteydessä ja messutulosteessa.
              </p>
            </div>
          </div>
        </div>

        {/* Visibility timeline selector */}
        <div className="mb-4 p-3 bg-purple-50/40 rounded-lg border border-purple-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-purple-900">
              {startDate && endDate
                ? `📅 Näkyvyys: ${startDate} – ${endDate}`
                : '📅 Näkyvyys: Oletuksena kuluva viikko'}
            </span>
            <button
              type="button"
              onClick={() => setShowCalendar(!showCalendar)}
              className="text-xs text-purple-700 hover:text-purple-900 font-medium underline"
            >
              {showCalendar ? 'Piilota kalenteri' : 'Valitse aikaväli'}
            </button>
          </div>

          {showCalendar && (
            <div className="mt-3 pt-3 border-t border-purple-100">
              <DateRangeCalendar
                startDate={startDate}
                endDate={endDate}
                onChange={({ startDate: s, endDate: e }) => {
                  setStartDate(s);
                  setEndDate(e);
                }}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">{content.length}/3000</span>
          <button
            type="submit"
            className="btn bg-purple-700 hover:bg-purple-800 text-white"
            disabled={loading || !content.trim()}
          >
            {loading ? t('common.loading') : t('admin.bishop.add')}
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

export default BishopPrayerForm;
