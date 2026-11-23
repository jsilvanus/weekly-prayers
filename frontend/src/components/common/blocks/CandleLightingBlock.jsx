import { useState, useEffect } from 'react';
import { playChime } from './soundChime';

const DEFAULT_ADVENT_CANDLES = [
  {
    index: 1,
    label: '1. Adventti: Odotuksen ja toivon kynttilä',
    verse: 'Olkaa iloiset, sillä Kuninkaanne saapuu!',
    prayer: 'Rakas Jeesus, kiitos että tuot valon pimeän keskelle. Auta meitä odottamaan joulua iloisella mielellä.',
  },
  {
    index: 2,
    label: '2. Adventti: Rauhan kynttilä',
    verse: 'Hän tuo rauhan koko maailmaan.',
    prayer: 'Rakas Taivaan Isä, anna rauha jokaiseen kotiin, kouluun ja päiväkotiin.',
  },
  {
    index: 3,
    label: '3. Adventti: Ilon ja valmistautumisen kynttilä',
    verse: 'Valmistakaa tie Herralle!',
    prayer: 'Kiitos kaikista ystävistä ja läheisistä. Auta meitä jakamaan iloa ja auttamaan toisiamme.',
  },
  {
    index: 4,
    label: '4. Adventti: Rakkauden ja enkelien kynttilä',
    verse: 'Kunnia Jumalalle korkeuksissa ja maan päällä rauha!',
    prayer: 'Kiitos Jeesus-lapsesta ja rakkaudesta, joka lämmittää sydämemme. Siunaa perheemme joulu. Aamen.',
  },
];

const CANDLE_BODY_STYLES = {
  white: 'from-amber-50 via-white to-stone-200 border-stone-300',
  purple: 'from-purple-700 via-purple-800 to-indigo-950 border-purple-600',
  gold: 'from-amber-300 via-amber-400 to-yellow-600 border-amber-400',
  red: 'from-rose-600 via-red-700 to-rose-900 border-rose-500',
};

export default function CandleLightingBlock({ data = {}, isPrint = false }) {
  const maxCandles = Math.min(Math.max(Number(data.maxCandles || data.candleCount || 4), 1), 12);
  const initialLitCount = Math.min(Math.max(Number(data.initialLitCount ?? 1), 0), maxCandles);
  const interactive = data.interactive !== false;
  const candleColor = data.candleColor || 'white';

  const candleMetaList = Array.from({ length: maxCandles }, (_, idx) => {
    const custom = Array.isArray(data.candles) ? data.candles[idx] : null;
    const fallback = DEFAULT_ADVENT_CANDLES[idx] || {
      index: idx + 1,
      label: `${idx + 1}. rukouskynttilä`,
      verse: 'Kristus on maailman valo.',
      prayer: 'Herra, kuule hiljainen rukouksemme ja tuo valosi elämäämme.',
    };
    return {
      index: idx + 1,
      label: custom?.label || fallback.label,
      verse: custom?.verse ?? fallback.verse,
      prayer: custom?.prayer ?? fallback.prayer,
    };
  });

  // Track which candles are currently lit (boolean array)
  const [litState, setLitState] = useState(() =>
    Array.from({ length: maxCandles }, (_, i) => i < initialLitCount)
  );
  const [activeCandleIdx, setActiveCandleIdx] = useState(
    initialLitCount > 0 ? initialLitCount - 1 : 0
  );

  useEffect(() => {
    setLitState(Array.from({ length: maxCandles }, (_, i) => i < initialLitCount));
    setActiveCandleIdx(initialLitCount > 0 ? initialLitCount - 1 : 0);
  }, [maxCandles, initialLitCount]);

  const handleToggleCandle = (idx) => {
    if (!interactive || isPrint) return;
    setLitState((prev) => {
      const next = [...prev];
      const willLight = !next[idx];
      next[idx] = willLight;
      if (willLight) {
        playChime('candle_spark');
      }
      return next;
    });
    setActiveCandleIdx(idx);
  };

  const handleLightNext = () => {
    const firstUnlit = litState.findIndex((isLit) => !isLit);
    if (firstUnlit !== -1) {
      handleToggleCandle(firstUnlit);
    }
  };

  const litCount = litState.filter(Boolean).length;
  const activeMeta = candleMetaList[activeCandleIdx] || candleMetaList[0];
  const bodyColorClass = CANDLE_BODY_STYLES[candleColor] || CANDLE_BODY_STYLES.white;

  if (isPrint) {
    return (
      <div className="border border-stone-300 rounded-xl p-4 my-3 bg-white">
        <h4 className="font-serif font-bold text-base text-stone-900 mb-2">
          🕯️ {data.title || 'Kynttilöiden sytytys'} ({initialLitCount} / {maxCandles} kynttilää)
        </h4>
        <div className="space-y-2 text-xs text-stone-800">
          {candleMetaList.slice(0, Math.max(initialLitCount, 1)).map((c) => (
            <div key={c.index} className="pl-2 border-l-2 border-amber-500">
              <div className="font-bold">{c.label}</div>
              {c.verse && <div className="italic text-stone-600">&ldquo;{c.verse}&rdquo;</div>}
              {c.prayer && <div className="mt-0.5">{c.prayer}</div>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-3xl border border-amber-300/60 bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-amber-50 p-5 sm:p-7 shadow-lg space-y-6 relative overflow-hidden"
      data-testid="candle-lighting-block"
    >
      {/* Ambient background glow based on lit candles */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-1000"
        style={{
          opacity: Math.min(0.15 + litCount * 0.2, 0.9),
          background:
            'radial-gradient(circle at 50% 35%, rgba(251, 191, 36, 0.28), rgba(245, 158, 11, 0.08) 55%, transparent 80%)',
        }}
      />

      <div className="relative z-10 text-center space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-300/30 text-amber-200 text-xs font-semibold">
          <span>🕯️</span>
          <span>
            {litCount} / {maxCandles} kynttilää sytytetty
          </span>
        </div>
        <h3 className="font-martti text-xl sm:text-2xl font-bold text-amber-100">
          {data.title || 'Adventti- ja rukouskynttilät'}
        </h3>
        <p className="text-xs sm:text-sm text-amber-200/80 max-w-md mx-auto">
          {data.subtitle ||
            (interactive
              ? 'Kosketa tai klikkaa kynttilää sytyttääksesi tai sammuttaaksesi sen!'
              : 'Kynttilän valo muistuttaa meitä Kristuksen läsnäolosta ja rauhasta.')}
        </p>
      </div>

      {/* Candles Row */}
      <div className="relative z-10 flex items-end justify-center gap-4 sm:gap-8 pt-10 pb-4 px-2 flex-wrap">
        {candleMetaList.map((c, idx) => {
          const isLit = Boolean(litState[idx]);
          const isFocused = activeCandleIdx === idx;

          return (
            <button
              key={c.index}
              type="button"
              onClick={() => handleToggleCandle(idx)}
              aria-pressed={isLit}
              aria-label={`${c.label} (${isLit ? 'Sytytetty' : 'Sammutettu'})`}
              className={`group flex flex-col items-center focus:outline-none transition-transform ${
                interactive ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'
              }`}
            >
              {/* Flame & Aura container */}
              <div className="relative h-14 w-12 flex items-end justify-center mb-0.5">
                {isLit ? (
                  <>
                    {/* Outer glowing halo */}
                    <div className="absolute -top-2 w-14 h-14 rounded-full bg-amber-400/35 blur-md animate-pulse" />
                    <div className="absolute top-1 w-8 h-8 rounded-full bg-yellow-300/50 blur-xs" />
                    {/* Animated SVG Flame */}
                    <svg
                      viewBox="0 0 32 48"
                      className="w-8 h-12 relative z-10 drop-shadow-[0_0_10px_rgba(251,191,36,0.95)] animate-bounce"
                      style={{ animationDuration: `${2.2 + (idx % 3) * 0.3}s` }}
                    >
                      <path
                        d="M16 2 C16 2 6 16 6 28 C6 36 10.5 42 16 42 C21.5 42 26 36 26 28 C26 16 16 2 16 2 Z"
                        fill="url(#flameOuterGrad)"
                      />
                      <path
                        d="M16 12 C16 12 10 21 10 29 C10 34 12.5 39 16 39 C19.5 39 22 34 22 29 C22 21 16 12 16 12 Z"
                        fill="url(#flameInnerGrad)"
                      />
                      <ellipse cx="16" cy="35" rx="3" ry="4" fill="#fffbeb" />
                      <defs>
                        <linearGradient id="flameOuterGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#fef08a" />
                          <stop offset="55%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#ea580c" />
                        </linearGradient>
                        <linearGradient id="flameInnerGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ffffff" />
                          <stop offset="70%" stopColor="#fde047" />
                          <stop offset="100%" stopColor="#f97316" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-end h-full pb-1">
                    {interactive && (
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-amber-500/20 text-amber-200 px-2 py-0.5 rounded-full border border-amber-400/30 mb-1 whitespace-nowrap">
                        🔥 Sytytä
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Wick */}
              <div
                className={`w-1 h-2.5 rounded-t-full transition-colors ${
                  isLit ? 'bg-amber-300 shadow-[0_0_4px_#fbbf24]' : 'bg-stone-500'
                }`}
              />

              {/* Candle Pillar */}
              <div
                className={`w-12 sm:w-14 h-28 sm:h-32 rounded-t-lg rounded-b-md border bg-gradient-to-r ${bodyColorClass} shadow-md relative flex flex-col items-center justify-between py-2.5 transition-all ${
                  isLit
                    ? 'ring-2 ring-amber-400/80 shadow-[0_0_22px_rgba(251,191,36,0.35)]'
                    : 'opacity-75 hover:opacity-95'
                } ${isFocused ? 'scale-105' : ''}`}
              >
                {/* Melted wax top rim glow */}
                {isLit && (
                  <div className="w-full h-3 bg-gradient-to-b from-amber-200/80 to-transparent rounded-t-md absolute top-0 left-0" />
                )}

                <span
                  className={`mt-auto font-martti font-bold text-xs sm:text-sm px-2 py-0.5 rounded-full ${
                    candleColor === 'white' || candleColor === 'gold'
                      ? 'bg-amber-900/15 text-stone-800'
                      : 'bg-black/30 text-amber-100'
                  }`}
                >
                  {c.index}
                </span>
              </div>

              {/* Evergreen base wreath accent */}
              <div className="w-16 sm:w-18 h-3 -mt-1 rounded-full bg-gradient-to-r from-emerald-800 via-emerald-600 to-emerald-800 border border-emerald-500/40 shadow-sm" />
            </button>
          );
        })}
      </div>

      {/* Quick Action Bar */}
      {interactive && (
        <div className="relative z-10 flex items-center justify-center gap-2.5 flex-wrap">
          {litCount < maxCandles && (
            <button
              type="button"
              onClick={handleLightNext}
              className="px-4 py-2 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5"
            >
              <span>🔥</span>
              <span>Sytytä {litCount + 1}. kynttilä</span>
            </button>
          )}
          {litCount > 0 && (
            <button
              type="button"
              onClick={() => setLitState(Array.from({ length: maxCandles }, () => false))}
              className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-amber-100 border border-white/15 text-xs font-medium transition-all"
            >
              Sammuta kynttilät
            </button>
          )}
        </div>
      )}

      {/* Selected / Lit Candle Card with Verse & Prayer */}
      {activeMeta && (
        <div className="relative z-10 bg-white/10 backdrop-blur-sm border border-amber-300/30 rounded-2xl p-4 sm:p-5 space-y-2.5 max-w-xl mx-auto">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-martti font-bold text-base sm:text-lg text-amber-200 flex items-center gap-2">
              <span>{litState[activeCandleIdx] ? '🕯️' : '⚪'}</span>
              <span>{activeMeta.label}</span>
            </h4>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200">
              {litState[activeCandleIdx] ? 'Palaa' : 'Odottaa sytytystä'}
            </span>
          </div>

          {activeMeta.verse && (
            <p className="text-xs sm:text-sm font-serif italic text-amber-100/90 border-l-2 border-amber-400 pl-3">
              &ldquo;{activeMeta.verse}&rdquo;
            </p>
          )}

          {activeMeta.prayer && (
            <div className="pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block mb-0.5">
                🙏 Kynttilän rukous
              </span>
              <p className="text-xs sm:text-sm text-amber-50 leading-relaxed font-serif">
                {activeMeta.prayer}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
