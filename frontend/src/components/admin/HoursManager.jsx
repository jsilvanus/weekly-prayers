import { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../services/api';
import { Link } from 'react-router-dom';

export default function HoursManager() {
  const { currentTenant, isModuleEnabled } = useTenant();
  const [hours, setHours] = useState([]);
  const [currentHourId, setCurrentHourId] = useState('laudes');
  const [selectedHour, setSelectedHour] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHours() {
      setLoading(true);
      try {
        const res = await api.getLiturgicalHours();
        if (res?.hours) {
          setHours(res.hours);
          setCurrentHourId(res.currentHourId || 'laudes');
          const found = res.hours.find((h) => h.id === (res.currentHourId || 'laudes')) || res.hours[0];
          setSelectedHour(found);
        }
      } catch (err) {
        console.error('Failed to load hours info:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchHours();
  }, []);

  const enabled = isModuleEnabled('hours');

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-sky-50 to-indigo-50 p-4 sm:p-5 rounded-2xl border border-sky-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-martti text-xl font-bold text-gray-900 flex items-center gap-2">
              <span>⏰</span> Hetkirukoukset &amp; Kirkkokäsikirja III
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Hetkirukoukset (Liturgy of the Hours) perustuvat Suomen evankelis-luterilaisen kirkon viralliseen Kirkkokäsikirja III:een.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                enabled
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              {enabled ? '✓ Moduuli aktiivinen' : '⚠ Moduuli poistettu käytöstä'}
            </span>
            <Link
              to="/prayer-moment"
              target="_blank"
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <span>↗</span>
              <span>Avaa sivusto</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Liturgies Grid */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div>
            <h3 className="font-martti font-bold text-base text-gray-900">
              Kirkkokäsikirjan rukoushetket ({hours.length})
            </h3>
            <p className="text-xs text-gray-500">
              Käyttäjälle avautuva &quot;Rukoile nyt&quot; -toiminto valitsee automaattisesti tämänhetkistä kellonaikaa vastaavan rukoushetken.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500 text-sm">Ladataan hetkirukouksia...</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {hours.map((h) => {
              const isCurrent = h.id === currentHourId;
              const isSelected = selectedHour?.id === h.id;

              return (
                <div
                  key={h.id}
                  onClick={() => setSelectedHour(h)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary-600 bg-primary-50/50 shadow-sm ring-2 ring-primary-500/20'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg">{h.icon}</span>
                    <div className="flex items-center gap-1.5">
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 uppercase">
                          Aktiivinen nyt
                        </span>
                      )}
                      <span className="text-xs font-mono text-gray-500">{h.timeRange}</span>
                    </div>
                  </div>
                  <h4 className="font-semibold text-sm text-gray-900">{h.name}</h4>
                  <p className="text-xs text-primary-700 font-medium mb-1">{h.subtitle}</p>
                  <p className="text-[11px] text-gray-500 line-clamp-2">{h.description}</p>

                  <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                    <span>{h.sections?.length || 0} osiota</span>
                    {h.canticle && <span className="font-medium text-primary-800">Canticle: {h.canticle.title}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Liturgy Structure Preview */}
      {selectedHour && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h3 className="font-martti font-bold text-base text-gray-900 flex items-center gap-2">
                <span>{selectedHour.icon}</span>
                <span>{selectedHour.name} — Liturgian rakenne ja tekstit</span>
              </h3>
              <p className="text-xs text-gray-500">
                Suomen ev.lut. kirkon kirkkokäsikirja III:n mukainen kaava.
              </p>
            </div>
            <span className="px-2.5 py-1 bg-gray-100 rounded-md text-xs font-mono text-gray-600">
              Aikaväli: {selectedHour.timeRange}
            </span>
          </div>

          <div className="space-y-3">
            {selectedHour.sections?.map((sec, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-gray-800 uppercase tracking-wide text-[11px]">
                    {idx + 1}. {sec.title}
                  </span>
                  {sec.hasParishIntentions && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-100 text-primary-900">
                      Sisältää seurakunnan esirukouslistan dialogin
                    </span>
                  )}
                </div>
                <div className="text-gray-600 font-serif whitespace-pre-line leading-relaxed">
                  {sec.text ? (sec.text.length > 200 ? sec.text.substring(0, 200) + '...' : sec.text) : (
                    <span className="italic text-gray-400">Dynaaminen tekstisisältö (päivän teksti tai dialogi)</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
