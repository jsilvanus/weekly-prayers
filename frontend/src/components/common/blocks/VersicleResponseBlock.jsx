const DEFAULT_GLORIA_PATRI = [
  { v: 'Kunnia Isälle ja Pojalle ja Pyhälle Hengelle,', r: 'niin kuin oli alussa, nyt on ja aina, iankaikkisesta iankaikkiseen. Aamen.' },
];

export default function VersicleResponseBlock({ data = {}, isPrint = false }) {
  const title = data.title || 'Vuorolauseet (Versiculum)';
  const leaderLabel = data.leaderLabel || 'E'; // Esilukija / V:
  const assemblyLabel = data.assemblyLabel || 'S'; // Seurakunta / R:
  const includeGloriaPatri = Boolean(data.includeGloriaPatri);

  let pairs = Array.isArray(data.pairs) && data.pairs.length > 0 ? data.pairs : [];
  if (pairs.length === 0 && typeof data.text === 'string') {
    const lines = data.text.split('\n').map((l) => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i += 2) {
      pairs.push({
        v: lines[i].replace(/^(V:|E:|–|-)\s*/i, ''),
        r: (lines[i + 1] || '').replace(/^(R:|S:|–|-)\s*/i, ''),
      });
    }
  }
  if (pairs.length === 0) {
    pairs = [
      { v: 'Herra, avaa minun huuleni,', r: 'niin suuni julistaa sinun kunniaasi.' },
      { v: 'Jumala, riennä minua auttamaan.', r: 'Herra, kiirehdi minun avukseni.' },
    ];
  }

  const allPairs = includeGloriaPatri ? [...pairs, ...DEFAULT_GLORIA_PATRI] : pairs;

  return (
    <div
      className={
        isPrint
          ? 'border-l-2 border-stone-400 pl-3 my-2 space-y-1.5 text-xs font-serif text-stone-900'
          : 'card bg-stone-50/90 border border-stone-200/90 rounded-2xl p-4 sm:p-6 space-y-3'
      }
      data-testid="versicle-response-block"
    >
      {!isPrint && (
        <div className="flex items-center justify-between border-b border-stone-200/70 pb-2">
          <h4 className="font-martti font-bold text-sm text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
            <span>🕊️</span>
            <span>{title}</span>
          </h4>
          <span className="text-[10px] text-stone-500 font-medium">
            {leaderLabel} = Esilukija &bull; {assemblyLabel} = Seurakunta
          </span>
        </div>
      )}

      <div className="space-y-2.5 font-serif text-xs sm:text-sm">
        {allPairs.map((pair, idx) => (
          <div key={idx} className="space-y-1">
            {pair.v && (
              <div className="flex items-baseline gap-2 text-stone-800">
                <span className="font-sans font-bold text-[11px] text-teal-800 w-5 shrink-0">
                  {leaderLabel}:
                </span>
                <span>{pair.v}</span>
              </div>
            )}
            {pair.r && (
              <div className="flex items-baseline gap-2 text-stone-950 font-semibold pl-3 sm:pl-5">
                <span className="font-sans font-bold text-[11px] text-amber-800 w-5 shrink-0">
                  {assemblyLabel}:
                </span>
                <span>{pair.r}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
