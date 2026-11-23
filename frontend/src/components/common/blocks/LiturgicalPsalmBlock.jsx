import { useState } from 'react';
import NotationViewer from '../NotationViewer';

const DEFAULT_GLORIA =
  'Kunnia Isälle ja Pojalle ja Pyhälle Hengelle,\nniin kuin oli alussa, nyt on ja aina, iankaikkisesta iankaikkiseen. Aamen.';

export default function LiturgicalPsalmBlock({
  data = {},
  printLayout = 'standard',
  isPrint = false,
}) {
  const [viewMode, setViewMode] = useState(data.defaultViewMode || 'text'); // 'text' | 'notation'
  const [localLayout, setLocalLayout] = useState(data.layout || 'indented'); // 'indented' | 'standard'

  const effectiveLayout = isPrint && printLayout === 'indented' ? 'indented' : localLayout;
  const hasNotation = Boolean(data.antiphon_abc || data.antiphon_image_url || data.notation_abc);
  const includeGloria = data.includeGloriaPatri !== false;

  // Normalize verses into an array of lines or hemistich pairs
  let lines = [];
  if (Array.isArray(data.verses) && data.verses.length > 0) {
    data.verses.forEach((v) => {
      if (typeof v === 'string') {
        lines.push(v);
      } else if (v.textPartA || v.textPartB) {
        if (v.textPartA) lines.push(v.textPartA);
        if (v.textPartB) lines.push(v.textPartB);
      } else if (v.text) {
        lines.push(...v.text.split('\n').filter(Boolean));
      }
    });
  } else if (typeof data.text === 'string') {
    lines = data.text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  }

  return (
    <div
      className={
        isPrint
          ? 'border border-stone-300 rounded-xl p-4 my-3 bg-white space-y-2.5 text-stone-900'
          : 'card bg-white border border-stone-200/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs'
      }
      data-testid="liturgical-psalm-block"
    >
      {/* Header & Layout/Notation Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-stone-100">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 block">
            📜 Liturginen psalmi / Kiitosvirsi
          </span>
          <h4 className="font-martti font-bold text-base sm:text-lg text-stone-900">
            {data.title || data.reference || 'Hetken psalmi'}
            {data.reference && data.title && data.title !== data.reference && (
              <span className="ml-2 text-xs font-normal text-stone-500">({data.reference})</span>
            )}
          </h4>
        </div>

        {!isPrint && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                setLocalLayout((prev) => (prev === 'indented' ? 'standard' : 'indented'))
              }
              className="text-[11px] px-2.5 py-1 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 font-medium"
              title="Vaihda säeparien sisennys (virsikirja-/psalmitaitto)"
            >
              {effectiveLayout === 'indented' ? '⇥ Sisennetty laulu' : '☰ Tavallinen taitto'}
            </button>

            {hasNotation && (
              <button
                type="button"
                onClick={() => setViewMode((prev) => (prev === 'text' ? 'notation' : 'text'))}
                className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition-colors ${
                  viewMode === 'notation'
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'bg-teal-50 text-teal-900 border-teal-200 hover:bg-teal-100'
                }`}
              >
                {viewMode === 'notation' ? '📖 Näytä pelkkä teksti' : '🎵 Näytä nuotit'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Opening Antiphon */}
      {data.antiphon && (
        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2">
          {viewMode === 'notation' && hasNotation && (
            <NotationViewer
              notation_abc={data.antiphon_abc || data.notation_abc}
              notation_image_url={data.antiphon_image_url || data.notation_image_url}
              title={`${data.reference || 'Psalmi'} – Antifoni`}
            />
          )}
          <p className="text-xs sm:text-sm font-serif text-amber-950">
            <strong className="font-sans text-[11px] uppercase tracking-wider text-amber-900 mr-1.5">
              Antifoni:
            </strong>
            <span className="italic">&ldquo;{data.antiphon}&rdquo;</span>
          </p>
        </div>
      )}

      {/* Psalm Verses */}
      {lines.length > 0 && (
        <div className="space-y-1.5 font-serif text-xs sm:text-base text-stone-900 leading-relaxed py-1">
          {lines.map((line, idx) => {
            const isSecondHalf = effectiveLayout === 'indented' && idx % 2 === 1;
            return (
              <p
                key={idx}
                className={
                  isSecondHalf
                    ? 'pl-5 sm:pl-8 text-stone-800 italic'
                    : 'font-medium text-stone-950'
                }
              >
                {line}
              </p>
            );
          })}
        </div>
      )}

      {/* Gloria Patri */}
      {includeGloria && (
        <div className="pt-2 border-t border-stone-200/70 font-serif text-xs sm:text-sm text-stone-700 italic space-y-1">
          {(data.gloriaPatri || DEFAULT_GLORIA).split('\n').map((gLine, gIdx) => (
            <p
              key={gIdx}
              className={effectiveLayout === 'indented' && gIdx % 2 === 1 ? 'pl-5 sm:pl-8' : ''}
            >
              {gLine}
            </p>
          ))}
        </div>
      )}

      {/* Closing Antiphon Repeat */}
      {data.antiphon && (
        <div className="p-2.5 rounded-xl bg-amber-50/40 border border-amber-200/60 text-xs sm:text-sm font-serif text-amber-950">
          <strong className="font-sans text-[11px] uppercase tracking-wider text-amber-900 mr-1.5">
            Antifoni:
          </strong>
          <span className="italic">&ldquo;{data.antiphon}&rdquo;</span>
        </div>
      )}
    </div>
  );
}
