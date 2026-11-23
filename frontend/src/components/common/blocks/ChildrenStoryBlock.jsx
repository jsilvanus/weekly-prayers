export default function ChildrenStoryBlock({ data = {}, isPrint = false }) {
  const title = data.title || 'Lasten kertomushetki';
  const storyText = data.storyText || data.content || '';
  const illustrationUrl = data.illustrationUrl || data.image_url || '';
  const reflectionQuestion = data.reflectionQuestion || '';
  const childrenPrayer = data.childrenPrayer || '';

  if (isPrint) {
    return (
      <div className="border border-stone-300 rounded-xl p-4 my-3 bg-white space-y-2">
        <h4 className="font-serif font-bold text-base text-stone-900">✨ {title}</h4>
        <div className="text-xs sm:text-sm font-serif text-stone-800 whitespace-pre-wrap leading-relaxed">
          {storyText}
        </div>
        {reflectionQuestion && (
          <p className="text-xs font-bold text-stone-800 pt-1">
            Pohdittavaksi yhdessä: <span className="font-normal italic">{reflectionQuestion}</span>
          </p>
        )}
        {childrenPrayer && (
          <p className="text-xs font-serif italic text-stone-900 border-t border-stone-200 pt-2">
            <strong>Lasten rukous:</strong> {childrenPrayer}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className="card bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-yellow-50/80 border border-amber-200/90 rounded-3xl p-5 sm:p-7 space-y-5 shadow-sm"
      data-testid="children-story-block"
    >
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-2xl bg-amber-400/25 border border-amber-300 flex items-center justify-center text-xl shadow-2xs">
          🌟
        </span>
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block">
            Kertomus lapsille ja perheille
          </span>
          <h3 className="font-martti text-lg sm:text-xl font-bold text-stone-900">
            {title}
          </h3>
        </div>
      </div>

      {illustrationUrl && (
        <div className="rounded-2xl overflow-hidden border border-amber-200 max-h-72">
          <img
            src={illustrationUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {storyText && (
        <div className="text-sm sm:text-base text-stone-800 font-serif leading-relaxed whitespace-pre-wrap bg-white/80 p-4 sm:p-5 rounded-2xl border border-amber-200/60">
          {storyText}
        </div>
      )}

      {reflectionQuestion && (
        <div className="p-4 rounded-2xl bg-sky-50/90 border border-sky-200/80 flex items-start gap-3">
          <span className="text-lg">💬</span>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-900 block mb-0.5">
              Jutellaan yhdessä
            </span>
            <p className="text-xs sm:text-sm font-medium text-sky-950">
              {reflectionQuestion}
            </p>
          </div>
        </div>
      )}

      {childrenPrayer && (
        <div className="p-4 sm:p-5 rounded-2xl bg-teal-50/90 border border-teal-200/80 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-900">
            <span>🙏</span>
            <span>Yhteinen lasten rukous</span>
          </div>
          <p className="text-sm sm:text-base font-serif italic text-teal-950 leading-relaxed whitespace-pre-wrap">
            &ldquo;{childrenPrayer}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}
