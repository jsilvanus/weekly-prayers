import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LandingHero from '../common/LandingHero';
import { api } from '../../services/api';

const BEAD_COLORS = {
  gold: 'bg-amber-400 text-amber-950 border-amber-300 ring-amber-400',
  pearl: 'bg-slate-100 text-slate-800 border-slate-300 ring-slate-300',
  'pearl-small': 'bg-slate-200 text-slate-700 border-slate-300 ring-slate-300',
  white: 'bg-white text-gray-900 border-gray-300 ring-gray-200',
  'white-small': 'bg-white text-gray-800 border-gray-300 ring-gray-200',
  sand: 'bg-amber-700 text-amber-50 border-amber-800 ring-amber-700',
  blue: 'bg-sky-400 text-sky-950 border-sky-300 ring-sky-400',
  red: 'bg-rose-600 text-white border-rose-700 ring-rose-500',
  black: 'bg-gray-900 text-gray-100 border-black ring-gray-800',
  yellow: 'bg-yellow-300 text-yellow-950 border-yellow-400 ring-yellow-300',
};

export default function MeditationPage() {
  const { t } = useTranslation();
  const [meditations, setMeditations] = useState([]);
  const [activeTab, setActiveTab] = useState('lonnebo_beads');
  const [selectedBeadIndex, setSelectedBeadIndex] = useState(0);
  const [selectedLutherEx, setSelectedLutherEx] = useState(0);
  const [breathPhase, setBreathPhase] = useState('in'); // 'in' | 'out'
  const [isBreathingActive, setIsBreathingActive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.getMeditations();
        if (res?.meditations) {
          setMeditations(res.meditations);
        }
      } catch (err) {
        console.error('Failed to load meditations from backend:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Breathing rhythm timer
  useEffect(() => {
    let interval = null;
    if (isBreathingActive) {
      interval = setInterval(() => {
        setBreathPhase((prev) => (prev === 'in' ? 'out' : 'in'));
      }, 5000); // 5 seconds in, 5 seconds out
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isBreathingActive]);

  const activeMeditation = meditations.find((m) => m.id === activeTab) || meditations[0];

  const handleStartPractice = () => {
    const el = document.getElementById('meditation-content-area');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
    if (activeTab === 'jesus_prayer') {
      setIsBreathingActive(true);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Landing Hero with Sibling cross-navigation */}
      <LandingHero
        currentModule="meditations"
        title="Kristilliset meditaatiot &amp; Hiljaisuus"
        subtitle="Rukoushelmien, katekismuksen ja sydämen rukouksen perinne johdattaa hiljentymään, rauhoittumaan ja kohtaamaan Jumalan arjen keskellä."
        primaryAction={{
          label: 'Aloita hiljentyminen',
          icon: '📿',
          onClick: handleStartPractice,
        }}
      />

      {/* Tabs navigation for Meditations */}
      <div id="meditation-content-area" className="bg-gray-100/90 p-1.5 rounded-2xl border border-gray-200 shadow-2xs">
        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-thin pb-0.5" aria-label="Meditaatioperinteet">
          {meditations.map((med) => {
            const isSelected = activeTab === med.id;
            return (
              <button
                key={med.id}
                type="button"
                onClick={() => {
                  setActiveTab(med.id);
                  if (med.id !== 'jesus_prayer') {
                    setIsBreathingActive(false);
                  }
                }}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-white text-primary-900 shadow-sm font-semibold ring-1 ring-black/5'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <span className="text-base">{med.icon}</span>
                <span>{med.title.split('(')[0].trim()}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 text-sm">Ladataan meditaatioita...</div>
      ) : !activeMeditation ? (
        <div className="text-center py-8 text-gray-500">Meditaatioita ei löytynyt.</div>
      ) : (
        <div className="space-y-6">
          {/* Header Card for current Meditation */}
          <div className="bg-gradient-to-r from-teal-50/70 via-sky-50/50 to-indigo-50/70 p-5 sm:p-7 rounded-3xl border border-teal-200/70 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
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
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mt-3 font-serif">
              {activeMeditation.introduction}
            </p>
          </div>

          {/* 1. MARTIN LÖNNEBO PRAYER BEADS (FRÄLSARKRANSEN) */}
          {activeMeditation.id === 'lonnebo_beads' && activeMeditation.beads && (
            <div className="space-y-6">
              {/* Beads Carousel / Ring Selector */}
              <div className="card p-4 sm:p-6 bg-white/95">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                  <div>
                    <h3 className="font-martti font-bold text-base text-gray-900">
                      Rukousnauhan 18 helmeä
                    </h3>
                    <p className="text-xs text-gray-500">
                      Valitse helmi alta tai siirry eteenpäin järjestyksessä.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-primary-100 text-primary-800 px-2.5 py-1 rounded-full">
                    {selectedBeadIndex + 1} / {activeMeditation.beads.length}
                  </span>
                </div>

                {/* Horizontal Bead String */}
                <div className="flex items-center gap-2 overflow-x-auto py-3 px-2 scrollbar-thin justify-start sm:justify-center">
                  {activeMeditation.beads.map((bead, idx) => {
                    const isSelected = selectedBeadIndex === idx;
                    const colorStyle = BEAD_COLORS[bead.color] || BEAD_COLORS.pearl;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedBeadIndex(idx)}
                        title={`${idx + 1}. ${bead.name} (${bead.colorName})`}
                        className={`transition-all transform shrink-0 rounded-full flex items-center justify-center font-bold text-[10px] border shadow-xs ${colorStyle} ${
                          isSelected
                            ? 'scale-125 ring-3 ring-primary-500/50 shadow-md z-10 w-8 h-8 sm:w-9 sm:h-9'
                            : 'hover:scale-110 opacity-80 hover:opacity-100 w-6 h-6 sm:w-7 sm:h-7'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                {/* Selected Bead Detail Box */}
                {(() => {
                  const bead = activeMeditation.beads[selectedBeadIndex];
                  if (!bead) return null;
                  const colorStyle = BEAD_COLORS[bead.color] || BEAD_COLORS.pearl;

                  return (
                    <div className="mt-6 p-5 sm:p-6 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border shadow-sm shrink-0 flex items-center justify-center text-xs font-bold ${colorStyle}`}
                          >
                            {selectedBeadIndex + 1}
                          </span>
                          <div>
                            <h4 className="font-martti text-lg sm:text-xl font-bold text-gray-900 leading-tight">
                              {bead.name}
                            </h4>
                            <span className="text-xs text-gray-500">{bead.colorName} ({bead.shape})</span>
                          </div>
                        </div>
                      </div>

                      {/* Symbolism */}
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-primary-800 block mb-1">
                          Merkitys ja teologia
                        </span>
                        <p className="text-xs sm:text-sm text-gray-700 leading-relaxed font-aptos">
                          {bead.symbolism}
                        </p>
                      </div>

                      {/* Scripture */}
                      {bead.scripture && (
                        <div className="p-3 bg-white rounded-xl border border-gray-200/80">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block mb-0.5">
                            📖 Raamatunkohta
                          </span>
                          <p className="text-xs sm:text-sm text-gray-800 italic font-serif">
                            {bead.scripture}
                          </p>
                        </div>
                      )}

                      {/* Prayer */}
                      {bead.prayer && (
                        <div className="p-4 bg-teal-50/80 rounded-xl border border-teal-200/70">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-900 block mb-1">
                            🙏 Helmen rukous
                          </span>
                          <p className="text-sm sm:text-base text-teal-950 font-serif leading-relaxed italic">
                            &quot;{bead.prayer}&quot;
                          </p>
                        </div>
                      )}

                      {/* Prev / Next controls */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedBeadIndex((prev) =>
                              prev > 0 ? prev - 1 : activeMeditation.beads.length - 1
                            )
                          }
                          className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                        >
                          <span>←</span>
                          <span>Edellinen helmi</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedBeadIndex((prev) =>
                              prev < activeMeditation.beads.length - 1 ? prev + 1 : 0
                            )
                          }
                          className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5"
                        >
                          <span>Seuraava helmi</span>
                          <span>→</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* 2. MARTIN LUTHER CATECHISM MEDITATION */}
          {activeMeditation.id === 'luther_wreath' && (
            <div className="space-y-6">
              {/* Four Strands Explanation */}
              <div className="card space-y-4">
                <h3 className="font-martti font-bold text-base text-gray-900 flex items-center gap-2">
                  <span>🌹</span> Nelisäikeinen seppele (Viersträhniger Kranz)
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 font-aptos">
                  Luther neuvoo ottamaan minkä tahansa Katekismuksen osan tai Raamatun jakeen ja kutomaan siitä nelisäikeisen seppeleen Jumalan eteen:
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  {activeMeditation.strands?.map((s) => (
                    <div key={s.strand} className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/80">
                      <div className="font-bold text-xs sm:text-sm text-amber-950 mb-1">
                        {s.name}
                      </div>
                      <div className="text-xs font-medium text-amber-900 mb-1.5 italic">
                        {s.question}
                      </div>
                      <p className="text-[11px] sm:text-xs text-gray-600 leading-snug">
                        {s.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interactive Examples */}
              {activeMeditation.examples && (
                <div className="card space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <h3 className="font-martti font-bold text-base text-gray-900">
                      Esimerkkejä Lutherin katekismusmeditaatiosta
                    </h3>
                  </div>

                  <div className="flex gap-2">
                    {activeMeditation.examples.map((ex, idx) => (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => setSelectedLutherEx(idx)}
                        className={`text-xs px-3 py-2 rounded-lg font-medium transition-colors ${
                          selectedLutherEx === idx
                            ? 'bg-primary-700 text-white font-semibold'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {ex.title.split(':')[0]}
                      </button>
                    ))}
                  </div>

                  {(() => {
                    const ex = activeMeditation.examples[selectedLutherEx];
                    if (!ex) return null;

                    return (
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                        <h4 className="font-serif font-bold text-sm text-gray-900">
                          {ex.title}
                        </h4>
                        <div className="space-y-2.5">
                          {ex.strands.map((st, i) => (
                            <div key={i} className="p-3 bg-white rounded-xl border border-gray-200/80 text-xs sm:text-sm">
                              <p className="text-gray-800 leading-relaxed font-aptos">
                                {st.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* 3. JESUS PRAYER & BREATH PRAYER */}
          {activeMeditation.id === 'jesus_prayer' && (
            <div className="space-y-6">
              {/* Breath guide visualizer */}
              <div className="card p-6 sm:p-8 text-center space-y-6 bg-gradient-to-b from-white to-sky-50/40">
                <h3 className="font-martti font-bold text-lg text-gray-900">
                  Hengitys ja Jeesus-rukous
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 max-w-lg mx-auto font-aptos">
                  Istu rauhassa, rentouta hartiasi ja anna hengityksen virrata vapaasti. Seuraa alla olevaa rauhallista rytmiä.
                </p>

                {/* Animated breathing circle */}
                <div className="py-6 flex flex-col items-center justify-center">
                  <div
                    className={`rounded-full flex flex-col items-center justify-center transition-all duration-3000 ease-in-out shadow-lg ${
                      breathPhase === 'in'
                        ? 'w-48 h-48 sm:w-56 sm:h-56 bg-sky-200/80 border-4 border-sky-400 text-sky-950 scale-105'
                        : 'w-40 h-40 sm:w-44 sm:h-44 bg-teal-100/70 border-4 border-teal-400 text-teal-950 scale-95'
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-800 mb-1">
                      {breathPhase === 'in' ? 'Sisäänhengitys' : 'Uloshengitys'}
                    </span>
                    <span className="text-xs sm:text-sm font-serif font-semibold max-w-[160px] text-center leading-snug px-2">
                      {breathPhase === 'in'
                        ? 'Herra Jeesus Kristus, Jumalan Poika'
                        : 'Armahda minua syntistä'}
                    </span>
                  </div>

                  <div className="mt-6 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsBreathingActive((prev) => !prev)}
                      className={`btn-primary text-xs sm:text-sm py-2 px-5 ${
                        isBreathingActive ? 'bg-amber-600 hover:bg-amber-700' : ''
                      }`}
                    >
                      {isBreathingActive ? 'Pysäytä rytmi' : 'Käynnistä hengitysrytmi'}
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-sky-200 max-w-md mx-auto text-xs text-sky-900">
                  💡 <strong>Vinkki:</strong> {activeMeditation.breathingGuide?.alternativeShort}
                </div>
              </div>

              {/* Steps */}
              {activeMeditation.steps && (
                <div className="card space-y-3">
                  <h4 className="font-martti font-bold text-sm text-gray-900 uppercase tracking-wide">
                    Sydämen rukouksen neljä vaihetta
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {activeMeditation.steps.map((st) => (
                      <div key={st.step} className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                        <div className="font-bold text-gray-900 mb-1">{st.step}. {st.title}</div>
                        <p className="text-gray-600 leading-relaxed font-aptos">{st.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. LECTIO DIVINA */}
          {activeMeditation.id === 'lectio_divina' && (
            <div className="space-y-6">
              <div className="card space-y-4">
                <h3 className="font-martti font-bold text-base text-gray-900">
                  Lectio Divina &mdash; Hengellinen lukeminen
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 font-aptos">
                  Valitse lyhyt raamatunkohta (esim. päivän evankeliumi tai psalmi) ja etene rauhassa neljän askeleen kautta:
                </p>

                <div className="space-y-3">
                  {activeMeditation.steps?.map((step) => (
                    <div key={step.step} className="p-4 bg-teal-50/50 rounded-xl border border-teal-200/80">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs sm:text-sm text-teal-950 font-martti">
                          {step.step}. {step.name}
                        </span>
                        <span className="text-[11px] font-mono font-semibold text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                          {step.latin}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-700 leading-relaxed font-serif">
                        {step.guidance}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 5. EXAMEN (PÄIVÄN KATSELMUS) */}
          {activeMeditation.id === 'examen' && (
            <div className="space-y-6">
              <div className="card space-y-4">
                <h3 className="font-martti font-bold text-base text-gray-900">
                  Päivän katselmuksen viisi askelta
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 font-aptos">
                  Iltarukous ja päivän katselu auttaa jättämään kuluneen vuorokauden Jumalan käsiin ja löytämään levollisen unen.
                </p>

                <div className="space-y-3">
                  {activeMeditation.steps?.map((step) => (
                    <div key={step.step} className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-200/80">
                      <div className="font-bold text-xs sm:text-sm text-indigo-950 mb-1">
                        {step.title}
                      </div>
                      <p className="text-xs sm:text-sm text-gray-700 leading-relaxed font-aptos">
                        {step.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
