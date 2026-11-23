import { useState, useEffect } from 'react';
import CandleLightingBlock from './CandleLightingBlock';
import ChildrenStoryBlock from './ChildrenStoryBlock';
import VersicleResponseBlock from './VersicleResponseBlock';
import LiturgicalPsalmBlock from './LiturgicalPsalmBlock';
import { playChime } from './soundChime';

export const BEAD_COLORS = {
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
  green: 'bg-emerald-600 text-white border-emerald-700 ring-emerald-500',
  purple: 'bg-purple-700 text-white border-purple-800 ring-purple-600',
};

export function getYouTubeEmbedId(url) {
  if (!url || typeof url !== 'string') return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

/**
 * 1. Bead Sequence Block (Lönnebo Prayer Beads / Rosary / Custom Bead String)
 */
function BeadSequenceSubBlock({ data = {}, isPrint = false }) {
  const beads = Array.isArray(data.beads || data.items) ? (data.beads || data.items) : [];
  const [selectedBeadIndex, setSelectedBeadIndex] = useState(0);

  if (beads.length === 0) return null;

  if (isPrint) {
    return (
      <div className="border border-stone-300 rounded-xl p-4 my-3 bg-white space-y-2">
        <h4 className="font-serif font-bold text-base text-stone-900">
          📿 {data.title || `Rukousnauhan ${beads.length} helmeä`}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-serif">
          {beads.map((b, idx) => (
            <div key={idx} className="p-2 border border-stone-200 rounded">
              <div className="font-bold">
                {idx + 1}. {b.name} {b.colorName ? `(${b.colorName})` : ''}
              </div>
              {b.scripture && <div className="italic text-stone-600">{b.scripture}</div>}
              {b.prayer && <div className="mt-0.5 text-stone-900">&ldquo;{b.prayer}&rdquo;</div>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const safeIdx = Math.min(selectedBeadIndex, beads.length - 1);
  const bead = beads[safeIdx];
  const colorStyle = BEAD_COLORS[bead?.color] || BEAD_COLORS.pearl;

  return (
    <div className="card p-4 sm:p-6 bg-white/95 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div>
          <h3 className="font-martti font-bold text-base text-gray-900">
            {data.title || `Rukousnauhan ${beads.length} helmeä`}
          </h3>
          <p className="text-xs text-gray-500">
            Valitse helmi alta tai siirry eteenpäin järjestyksessä.
          </p>
        </div>
        <span className="text-xs font-mono font-bold bg-primary-100 text-primary-800 px-2.5 py-1 rounded-full">
          {safeIdx + 1} / {beads.length}
        </span>
      </div>

      {/* Horizontal Bead String */}
      <div className="flex items-center gap-2 overflow-x-auto py-3 px-2 scrollbar-thin justify-start sm:justify-center">
        {beads.map((b, idx) => {
          const isSelected = safeIdx === idx;
          const cStyle = BEAD_COLORS[b.color] || BEAD_COLORS.pearl;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedBeadIndex(idx)}
              title={`${idx + 1}. ${b.name} (${b.colorName || b.color})`}
              className={`transition-all transform shrink-0 rounded-full flex items-center justify-center font-bold text-[10px] border shadow-xs ${cStyle} ${
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

      {/* Selected Bead Detail */}
      {bead && (
        <div className="mt-4 p-5 sm:p-6 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-4">
          <div className="flex items-center gap-3">
            <span
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border shadow-sm shrink-0 flex items-center justify-center text-xs font-bold ${colorStyle}`}
            >
              {safeIdx + 1}
            </span>
            <div>
              <h4 className="font-martti text-lg sm:text-xl font-bold text-gray-900 leading-tight">
                {bead.name}
              </h4>
              {(bead.colorName || bead.shape) && (
                <span className="text-xs text-gray-500">
                  {bead.colorName} {bead.shape ? `(${bead.shape})` : ''}
                </span>
              )}
            </div>
          </div>

          {bead.symbolism && (
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary-800 block mb-1">
                Merkitys ja teologia
              </span>
              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed font-aptos">
                {bead.symbolism}
              </p>
            </div>
          )}

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

          {bead.prayer && (
            <div className="p-4 bg-teal-50/80 rounded-xl border border-teal-200/70">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-900 block mb-1">
                🙏 Helmen rukous
              </span>
              <p className="text-sm sm:text-base text-teal-950 font-serif leading-relaxed italic">
                &ldquo;{bead.prayer}&rdquo;
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() =>
                setSelectedBeadIndex((prev) => (prev > 0 ? prev - 1 : beads.length - 1))
              }
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <span>←</span>
              <span>Edellinen helmi</span>
            </button>
            <button
              type="button"
              onClick={() =>
                setSelectedBeadIndex((prev) => (prev < beads.length - 1 ? prev + 1 : 0))
              }
              className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5"
            >
              <span>Seuraava helmi</span>
              <span>→</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 2. Multi-Strand Wreath Block (Luther's 4-Strand Catechism / ACTS Matrix)
 */
function MultiStrandSubBlock({ data = {}, isPrint = false }) {
  const strands = Array.isArray(data.strands) ? data.strands : [];
  const examples = Array.isArray(data.examples) ? data.examples : [];
  const [selectedEx, setSelectedEx] = useState(0);

  return (
    <div className="space-y-4">
      <div className={isPrint ? 'border border-stone-300 rounded-xl p-4 bg-white space-y-3' : 'card space-y-4'}>
        <h3 className="font-martti font-bold text-base text-gray-900 flex items-center gap-2">
          <span>🌹</span> {data.title || 'Nelisäikeinen seppele (Viersträhniger Kranz)'}
        </h3>
        {data.description && (
          <p className="text-xs sm:text-sm text-gray-600 font-aptos">{data.description}</p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {strands.map((s, idx) => (
            <div key={s.strand || idx} className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/80">
              <div className="font-bold text-xs sm:text-sm text-amber-950 mb-1">{s.name}</div>
              {s.question && (
                <div className="text-xs font-medium text-amber-900 mb-1.5 italic">{s.question}</div>
              )}
              {s.explanation && (
                <p className="text-[11px] sm:text-xs text-gray-600 leading-snug">{s.explanation}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {examples.length > 0 && !isPrint && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h3 className="font-martti font-bold text-base text-gray-900">
              Esimerkkejä rukousseppeleestä
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {examples.map((ex, idx) => (
              <button
                key={ex.id || idx}
                type="button"
                onClick={() => setSelectedEx(idx)}
                className={`text-xs px-3 py-2 rounded-lg font-medium transition-colors ${
                  selectedEx === idx
                    ? 'bg-primary-700 text-white font-semibold'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {(ex.title || `Esimerkki ${idx + 1}`).split(':')[0]}
              </button>
            ))}
          </div>

          {examples[selectedEx] && (
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
              <h4 className="font-serif font-bold text-sm text-gray-900">
                {examples[selectedEx].title}
              </h4>
              <div className="space-y-2.5">
                {(examples[selectedEx].strands || []).map((st, i) => (
                  <div
                    key={i}
                    className="p-3 bg-white rounded-xl border border-gray-200/80 text-xs sm:text-sm"
                  >
                    <p className="text-gray-800 leading-relaxed font-aptos">{st.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 3. Breathing Timer Block (Jesus Prayer / Breath Prayer)
 */
function BreathingTimerSubBlock({ data = {}, isPrint = false }) {
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState('in'); // 'in' | 'out'
  const cycleMs = Math.max(Number(data.cycleSeconds || 5), 2) * 1000;

  useEffect(() => {
    if (!isActive) return undefined;
    const interval = setInterval(() => {
      setPhase((p) => (p === 'in' ? 'out' : 'in'));
    }, cycleMs);
    return () => clearInterval(interval);
  }, [isActive, cycleMs]);

  const inText = data.inBreath || data.inBreathText || 'Herra Jeesus Kristus, Jumalan Poika';
  const outText = data.outBreath || data.outBreathText || 'Armahda minua syntistä';

  if (isPrint) {
    return (
      <div className="border border-stone-300 rounded-xl p-4 my-3 bg-white text-xs font-serif space-y-1">
        <div className="font-bold text-sm text-stone-900">
          🌬️ {data.title || 'Huokausrukous ja hengitysrytmi'}
        </div>
        <div>
          <strong>Sisäänhengitys:</strong> &ldquo;{inText}&rdquo;
        </div>
        <div>
          <strong>Uloshengitys:</strong> &ldquo;{outText}&rdquo;
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6 sm:p-8 text-center space-y-5 bg-gradient-to-b from-white to-sky-50/40">
      <h3 className="font-martti font-bold text-lg text-gray-900">
        {data.title || 'Hengitys ja sydämen rukous'}
      </h3>
      <p className="text-xs sm:text-sm text-gray-600 max-w-lg mx-auto font-aptos">
        Istu rauhassa, rentouta hartiasi ja anna hengityksen virrata vapaasti. Seuraa alla olevaa rauhallista rytmiä.
      </p>

      <div className="py-4 flex flex-col items-center justify-center">
        <div
          className={`rounded-full flex flex-col items-center justify-center transition-all duration-3000 ease-in-out shadow-lg ${
            phase === 'in'
              ? 'w-48 h-48 sm:w-56 sm:h-56 bg-sky-200/80 border-4 border-sky-400 text-sky-950 scale-105'
              : 'w-40 h-40 sm:w-44 sm:h-44 bg-teal-100/70 border-4 border-teal-400 text-teal-950 scale-95'
          }`}
        >
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-800 mb-1">
            {phase === 'in' ? 'Sisäänhengitys' : 'Uloshengitys'}
          </span>
          <span className="text-xs sm:text-sm font-serif font-semibold max-w-[170px] text-center leading-snug px-2">
            {phase === 'in' ? inText : outText}
          </span>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsActive((prev) => !prev)}
            className={`btn-primary text-xs sm:text-sm py-2 px-5 ${
              isActive ? 'bg-amber-600 hover:bg-amber-700' : ''
            }`}
          >
            {isActive ? 'Pysäytä rytmi' : 'Käynnistä hengitysrytmi'}
          </button>
        </div>
      </div>

      {data.alternativeShort && (
        <div className="p-3 bg-white rounded-xl border border-sky-200 max-w-md mx-auto text-xs text-sky-900">
          💡 <strong>Vinkki:</strong> {data.alternativeShort}
        </div>
      )}
    </div>
  );
}

/**
 * 4. Sacred Silence & Singing Bowl Timer Block
 */
function SilenceTimerSubBlock({ data = {}, isPrint = false }) {
  const defaultMin = Number(data.defaultMinutes || 3);
  const [selectedMin, setSelectedMin] = useState(defaultMin);
  const [secondsLeft, setSecondsLeft] = useState(defaultMin * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    setSecondsLeft(selectedMin * 60);
    setRunning(false);
  }, [selectedMin]);

  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          playChime(data.chimeType || 'singing_bowl');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [running, data.chimeType]);

  const handleToggle = () => {
    if (!running) {
      if (secondsLeft === 0) setSecondsLeft(selectedMin * 60);
      playChime(data.chimeType || 'singing_bowl');
      setRunning(true);
    } else {
      setRunning(false);
    }
  };

  if (isPrint) {
    return (
      <div className="border border-stone-300 rounded-xl p-3 my-2 bg-stone-50 text-xs font-serif italic text-stone-800">
        🔔 <strong>{data.title || 'Hiljainen hetki'} ({defaultMin} min):</strong>{' '}
        {data.guidingPrompt || 'Hiljennytään Jumalan läsnäolossa.'}
      </div>
    );
  }

  const mins = Math.floor(secondsLeft / 60);
  const secs = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="card p-5 sm:p-6 bg-gradient-to-r from-stone-50 via-amber-50/40 to-teal-50/40 border border-stone-200/90 rounded-2xl text-center space-y-4">
      <div className="space-y-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
          🔔 Pyhä hiljaisuus &amp; Äänimalja
        </span>
        <h4 className="font-martti font-bold text-base sm:text-lg text-stone-900">
          {data.title || 'Hiljainen rukous ja lepo'}
        </h4>
        <p className="text-xs sm:text-sm text-stone-600 font-serif italic">
          {data.guidingPrompt || 'Lepää hiljaisuudessa Jumalan rakastavan katseen alla.'}
        </p>
      </div>

      {/* Duration presets */}
      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        {[1, 3, 5, 10, 15].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setSelectedMin(m)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedMin === m
                ? 'bg-teal-800 text-white font-semibold'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
            }`}
          >
            {m} min
          </button>
        ))}
      </div>

      <div className="text-3xl sm:text-4xl font-mono font-bold text-stone-900 tracking-wider">
        {mins}:{secs}
      </div>

      <div className="flex items-center justify-center gap-2.5">
        <button
          type="button"
          onClick={handleToggle}
          className={`btn-primary text-xs sm:text-sm py-2 px-5 flex items-center gap-2 ${
            running ? 'bg-amber-700 hover:bg-amber-800' : ''
          }`}
        >
          <span>🔔</span>
          <span>{running ? 'Keskeytä hiljaisuus' : 'Aloita hiljaisuus äänimaljalla'}</span>
        </button>
        <button
          type="button"
          onClick={() => playChime(data.chimeType || 'singing_bowl')}
          className="btn-secondary text-xs py-2 px-3"
          title="Soita äänimaljaa"
        >
          🎵 Kello
        </button>
      </div>
    </div>
  );
}

/**
 * 5. Steps Guide Block (Lectio Divina / Examen / Guided Movements)
 */
function StepsGuideSubBlock({ data = {}, isPrint = false }) {
  const steps = Array.isArray(data.steps) ? data.steps : [];
  const isGrid = data.layout === 'grid';

  if (steps.length === 0) return null;

  return (
    <div className={isPrint ? 'border border-stone-300 rounded-xl p-4 my-3 bg-white space-y-2' : 'card space-y-4'}>
      {data.title && (
        <h3 className="font-martti font-bold text-base text-gray-900">{data.title}</h3>
      )}
      {data.description && (
        <p className="text-xs sm:text-sm text-gray-600 font-aptos">{data.description}</p>
      )}

      <div className={isGrid ? 'grid gap-3 sm:grid-cols-2' : 'space-y-3'}>
        {steps.map((step, idx) => (
          <div
            key={step.step || idx}
            className="p-4 bg-teal-50/40 rounded-xl border border-teal-200/70 space-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs sm:text-sm text-teal-950 font-martti">
                {step.name || step.title || `${idx + 1}. Vaihe`}
              </span>
              {(step.latin || step.badge) && (
                <span className="text-[11px] font-mono font-semibold text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                  {step.latin || step.badge}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed font-serif">
              {step.guidance || step.desc || step.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Universal BlockRenderer Component
 * Renders an array of blocks across Meditations, Devotions (Hartaus), Liturgy of the Hours, and Printable Service Leaflets.
 */
export default function BlockRenderer({
  blocks = [],
  printLayout = 'standard', // 'standard' | 'indented' | 'compact'
  isPrint = false,
}) {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return null;
  }

  const containerClass =
    isPrint && printLayout === 'compact'
      ? 'columns-1 sm:columns-2 gap-6 space-y-4 text-xs'
      : 'space-y-6';

  return (
    <div className={containerClass} data-testid="block-renderer">
      {blocks.map((block, idx) => {
        if (!block || !block.type) return null;
        const key = block.id || `block-${idx}`;
        const data = block.data || block;

        switch (block.type) {
          case 'intro':
          case 'intro_markdown':
          case 'reflection':
          case 'meditation':
            if (!data.content && !data.text && !data.title) return null;
            return (
              <div
                key={key}
                className={
                  isPrint
                    ? 'my-2 text-stone-900 font-serif text-xs sm:text-sm leading-relaxed whitespace-pre-wrap'
                    : 'card bg-white/95 border border-stone-200/80 rounded-2xl p-5 sm:p-6 space-y-2'
                }
              >
                {data.title && (
                  <h3 className="font-martti font-bold text-base sm:text-lg text-stone-900">
                    {data.title}
                  </h3>
                )}
                <div className="text-stone-800 font-serif text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                  {data.content || data.text}
                </div>
              </div>
            );

          case 'scripture':
          case 'scripture_passage':
            if (!data.text && !data.reference) return null;
            return (
              <div
                key={key}
                className="bg-stone-50 border-l-4 border-teal-600 p-5 rounded-r-2xl space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  {data.reference && (
                    <p className="text-xs font-bold uppercase tracking-wider text-teal-900">
                      📖 {data.reference}
                    </p>
                  )}
                  {data.translation && (
                    <span className="text-[10px] font-mono text-stone-500 bg-stone-200/70 px-2 py-0.5 rounded">
                      {data.translation}
                    </span>
                  )}
                </div>
                {data.text && (
                  <blockquote className="text-stone-900 font-serif text-sm sm:text-lg italic leading-relaxed whitespace-pre-wrap">
                    &ldquo;{data.text}&rdquo;
                  </blockquote>
                )}
              </div>
            );

          case 'prayer':
            if (!data.content && !data.text) return null;
            return (
              <div
                key={key}
                className="bg-teal-50/70 border border-teal-200 p-5 rounded-2xl space-y-2"
              >
                <h3 className="font-martti text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🙏</span>
                  <span>{data.title || 'Rukous'}</span>
                </h3>
                <p className="text-stone-900 font-serif text-sm sm:text-base leading-relaxed italic whitespace-pre-wrap">
                  {data.content || data.text}
                </p>
                {data.amen && (
                  <p className="text-xs font-bold text-teal-950 font-serif">{data.amen}</p>
                )}
              </div>
            );

          case 'hymn':
          case 'hymn_suggestion':
            if (!data.title && !data.number && !data.verses) return null;
            return (
              <div
                key={key}
                className="p-4 rounded-2xl bg-stone-50 border border-stone-200/90 space-y-1.5 text-xs sm:text-sm text-stone-800"
              >
                <div className="flex items-center gap-2 font-bold text-stone-900">
                  <span className="text-base">🎵</span>
                  <span>
                    {data.number ? `${data.number}: ` : 'Virsi tai musiikki: '}
                    {data.title}
                  </span>
                </div>
                {data.verses && (
                  <p className="font-serif italic text-stone-700 whitespace-pre-wrap pl-6">
                    {data.verses}
                  </p>
                )}
                {data.hint && <p className="text-[11px] text-stone-500 pl-6">{data.hint}</p>}
              </div>
            );

          case 'blessing':
          case 'liturgical_blessing':
            if (!data.text && !data.content) return null;
            return (
              <div
                key={key}
                className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/90 space-y-1.5"
              >
                <h4 className="font-martti text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <span>✝️</span>
                  <span>{data.title || 'Herran siunaus'}</span>
                </h4>
                <p className="font-serif text-sm sm:text-base text-amber-950 leading-relaxed whitespace-pre-wrap">
                  {data.text || data.content}
                </p>
              </div>
            );

          case 'media_embed': {
            if (isPrint) return null;
            const ytId = getYouTubeEmbedId(data.url);
            if (!ytId && !data.url) return null;
            return (
              <div key={key} className="card p-4 sm:p-5 space-y-2.5">
                {data.title && (
                  <h4 className="font-martti font-bold text-sm text-stone-900 flex items-center gap-1.5">
                    <span>🎬</span>
                    <span>{data.title}</span>
                  </h4>
                )}
                {ytId ? (
                  <div className="aspect-video w-full rounded-2xl overflow-hidden border border-stone-200 bg-black shadow-sm">
                    <iframe
                      title={data.title || 'Hartaus- ja meditaatiovideo'}
                      src={`https://www.youtube-nocookie.com/embed/${ytId}`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <audio controls src={data.url} className="w-full">
                    Selaimesi ei tue äänitoistoa.
                  </audio>
                )}
                {data.caption && <p className="text-xs text-stone-500">{data.caption}</p>}
              </div>
            );
          }

          case 'bead_sequence':
            return <BeadSequenceSubBlock key={key} data={data} isPrint={isPrint} />;

          case 'multi_strand':
            return <MultiStrandSubBlock key={key} data={data} isPrint={isPrint} />;

          case 'breathing_timer':
            return <BreathingTimerSubBlock key={key} data={data} isPrint={isPrint} />;

          case 'silence_timer':
          case 'timer_silence':
            return <SilenceTimerSubBlock key={key} data={data} isPrint={isPrint} />;

          case 'steps_guide':
            return <StepsGuideSubBlock key={key} data={data} isPrint={isPrint} />;

          case 'candle_lighting':
            return <CandleLightingBlock key={key} data={data} isPrint={isPrint} />;

          case 'children_story':
            return <ChildrenStoryBlock key={key} data={data} isPrint={isPrint} />;

          case 'versicle_response':
            return <VersicleResponseBlock key={key} data={data} isPrint={isPrint} />;

          case 'liturgical_psalm':
          case 'canticle':
            return (
              <LiturgicalPsalmBlock
                key={key}
                data={data}
                printLayout={printLayout}
                isPrint={isPrint}
              />
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
