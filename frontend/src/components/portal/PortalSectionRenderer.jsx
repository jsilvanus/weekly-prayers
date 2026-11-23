import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';

const LITURGICAL_BADGE_COLORS = {
  vihreä: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  valkoinen: 'bg-amber-50 text-amber-900 border-amber-200',
  violetti: 'bg-purple-100 text-purple-900 border-purple-300',
  punainen: 'bg-rose-100 text-rose-900 border-rose-300',
  musta: 'bg-stone-200 text-stone-900 border-stone-400',
  sininen: 'bg-sky-100 text-sky-900 border-sky-300',
};

const HOURS_QUICK_LIST = [
  { key: 'morning', icon: '🌅', label: 'Aamurukous', latin: 'Laudes', slot: '06:00–10:00' },
  { key: 'noon', icon: '☀️', label: 'Päivärukous', latin: 'Seksti', slot: '11:00–16:00' },
  { key: 'evening', icon: '🌇', label: 'Iltarukous', latin: 'Vesper', slot: '17:00–20:00' },
  { key: 'night', icon: '🌙', label: 'Yörukous', latin: 'Kompletorio', slot: '21:00–05:00' },
  { key: 'small', icon: '🕊️', label: 'Pieni rukoushetki', latin: 'Milloin vain', slot: 'Arjen tauko' },
];

export default function PortalSectionRenderer({
  sectionId,
  prayers,
  devotion,
  bibleData,
  pyhapaivaData,
  meditations = [],
  prayerCount = 0,
  onIncrementPrayerCount,
  onOpenPrayerModal,
  onOpenDailyVerseModal,
}) {
  const { isModuleEnabled } = useTenant();
  const { settings, getModuleTitle, highlightEmoji } = useSettings();
  const { user, isWorkerOrAbove } = useAuth();
  const [justPrayed, setJustPrayed] = useState(false);

  const canSeeDisabled = isWorkerOrAbove || user?.role === 'admin';
  const enabled = isModuleEnabled(sectionId);
  if (!enabled && !canSeeDisabled) return null;

  const handlePrayed = async () => {
    if (justPrayed || !onIncrementPrayerCount) return;
    setJustPrayed(true);
    await onIncrementPrayerCount();
    setTimeout(() => setJustPrayed(false), 2500);
  };

  // 1. HARTAUS (Today's Devotion Section)
  if (sectionId === 'hartaus') {
    const title = getModuleTitle('hartaus', 'Päivän hartaus');
    const authorDisplay = devotion?.author
      ? [devotion.author.title, devotion.author.name].filter(Boolean).join(' ')
      : 'Seurakunta';

    return (
      <section
        className="bg-white rounded-3xl border border-stone-200/90 shadow-xs p-5 sm:p-7 space-y-4"
        data-testid="portal-section-hartaus"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center text-lg">
              🕯️
            </span>
            <div>
              <h2 className="font-martti text-lg sm:text-xl font-bold text-stone-900">
                {title}
              </h2>
              <p className="text-xs text-stone-500">
                {devotion?.liturgical_day || 'Valmiiksi valmisteltu hiljentymishetki tälle päivälle'}
              </p>
            </div>
          </div>

          <Link
            to="/hartaus"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors shadow-2xs"
          >
            <span>Lue päivän hartaus</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>

        {devotion ? (
          <div className="bg-gradient-to-r from-teal-50/50 via-stone-50/40 to-white rounded-2xl border border-teal-200/60 p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-martti text-lg sm:text-xl font-bold text-stone-900">
                {devotion.title}
              </h3>
              <span className="text-xs font-semibold text-teal-900 bg-teal-100/70 px-2.5 py-0.5 rounded-full">
                ✍️ {authorDisplay}
              </span>
            </div>

            {devotion.scripture_reference && (
              <p className="text-xs font-bold uppercase tracking-wider text-teal-800">
                📖 {devotion.scripture_reference}
              </p>
            )}

            <p className="text-sm text-stone-700 font-serif leading-relaxed line-clamp-3">
              {devotion.meditation_content || devotion.content || devotion.scripture_text}
            </p>
          </div>
        ) : (
          <p className="text-xs text-stone-500 italic">Ladataan päivän hartautta...</p>
        )}
      </section>
    );
  }

  // 2. PYHÄPÄIVÄ (Sunday Gospel & Holy Day Theme Section)
  if (sectionId === 'pyhapaiva') {
    const title = getModuleTitle('pyhapaiva', 'Pyhäpäivä');
    const holyDay = pyhapaivaData?.holyDay || pyhapaivaData || bibleData?.liturgicalInfo || {};
    const colorKey = (
      holyDay?.liturgicalColor?.color ||
      holyDay?.color?.color ||
      holyDay?.color ||
      'vihreä'
    ).toLowerCase();
    const badgeColor = LITURGICAL_BADGE_COLORS[colorKey] || LITURGICAL_BADGE_COLORS.vihreä;

    const heading =
      pyhapaivaData?.heading ||
      pyhapaivaData?.customHeading ||
      holyDay.custom_heading ||
      holyDay.dayName ||
      holyDay.name ||
      'Kirkkovuoden pyhäpäivä';
    const officialName =
      pyhapaivaData?.name && pyhapaivaData.name !== heading
        ? pyhapaivaData.name
        : pyhapaivaData?.customHeading && (holyDay.dayName || holyDay.name)
        ? holyDay.dayName || holyDay.name
        : null;
    const description =
      pyhapaivaData?.description ||
      pyhapaivaData?.customDescription ||
      pyhapaivaData?.pastoralReflection ||
      holyDay.theme ||
      bibleData?.dailyVerse?.meditation ||
      'Kirkkovuoden pyhän tekstit, evankeliumi, psalmi ja päivän rukous.';

    return (
      <section
        className="bg-white rounded-3xl border border-stone-200/90 shadow-xs p-5 sm:p-7 space-y-4"
        data-testid="portal-section-pyhapaiva"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-lg">
              ⛪
            </span>
            <div>
              <h2 className="font-martti text-lg sm:text-xl font-bold text-stone-900">
                {title}
              </h2>
              <p className="text-xs text-stone-500">
                {holyDay.season || 'Evankelis-luterilainen kirkkovuosi'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${badgeColor}`}>
              Liturginen väri: {colorKey}
            </span>
            <Link
              to="/pyhapaiva"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold transition-colors shadow-2xs"
            >
              <span>Pyhäpäivän tekstit</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>

        <div className="bg-gradient-to-r from-amber-50/70 via-stone-50/50 to-white rounded-2xl border border-amber-200/70 p-4 sm:p-5 space-y-2.5">
          <div>
            <h3 className="font-martti text-lg sm:text-xl font-bold text-stone-900">
              {heading}
            </h3>
            {officialName && (
              <p className="text-xs text-amber-800 font-medium">
                {officialName}
              </p>
            )}
          </div>
          <p className="text-sm text-stone-700 font-serif leading-relaxed">
            {description}
          </p>
          {bibleData?.dailyVerse?.reference && (
            <div className="pt-1 flex items-center justify-between text-xs text-amber-900 font-semibold">
              <span>📜 Teksti: {bibleData.dailyVerse.reference}</span>
              <Link to="/pyhapaiva" className="hover:underline">
                Lue evankeliumi ja lukukappaleet &rarr;
              </Link>
            </div>
          )}
        </div>
      </section>
    );
  }

  // 3. HETKIRUKOUS (Liturgy of the Hours Section)
  if (sectionId === 'hours') {
    const title = getModuleTitle('hours', 'Hetkirukous');
    const nearestKey = bibleData?.nearestHourKey || 'morning';
    const currentHour = bibleData?.liturgyOfTheHours?.[nearestKey] || bibleData?.nearestHour;

    return (
      <section
        className="bg-white rounded-3xl border border-stone-200/90 shadow-xs p-5 sm:p-7 space-y-4"
        data-testid="portal-section-hours"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-lg">
              ⏰
            </span>
            <div>
              <h2 className="font-martti text-lg sm:text-xl font-bold text-stone-900">
                {title}
              </h2>
              <p className="text-xs text-stone-500">
                Kirkkokäsikirja III:n mukaiset päivän rukoushetket
              </p>
            </div>
          </div>

          <Link
            to={`/prayer-moment?hour=${nearestKey}`}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-2xs"
          >
            <span>🕊️ Rukoile nyt</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>

        {currentHour?.antiphon && (
          <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 text-xs sm:text-sm text-emerald-950 font-serif italic">
            <strong className="not-italic font-sans text-xs uppercase tracking-wider text-emerald-800 mr-1.5">
              Ajankohtainen antifoni ({currentHour.name}):
            </strong>
            &rdquo;{currentHour.antiphon}&rdquo;
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {HOURS_QUICK_LIST.map((h) => {
            const isNearest = h.key === nearestKey;
            return (
              <Link
                key={h.key}
                to={`/prayer-moment?hour=${h.key}`}
                className={`p-3 rounded-2xl border transition-all flex flex-col justify-between relative ${
                  isNearest
                    ? 'border-emerald-600 bg-emerald-50/70 shadow-2xs ring-1 ring-emerald-500/20'
                    : 'border-stone-200 bg-stone-50/50 hover:bg-white hover:border-emerald-300'
                }`}
              >
                {isNearest && (
                  <span className="absolute -top-2 right-2 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase">
                    Nyt
                  </span>
                )}
                <div className="flex items-center gap-1.5 mb-1">
                  <span>{h.icon}</span>
                  <span className="font-martti text-xs font-bold text-stone-900">{h.label}</span>
                </div>
                <span className="text-[11px] text-stone-500">{h.slot}</span>
              </Link>
            );
          })}
        </div>
      </section>
    );
  }

  // 4. ESIRUKOUKSET (Parish Prayer Intentions Section)
  if (sectionId === 'prayers') {
    const title = getModuleTitle('prayers', 'Esirukoukset');
    const pastorPrayer = settings?.show_pastor_prayer !== 'false' ? prayers?.pastor?.[0] : null;
    const bishopPrayer = settings?.show_bishop_prayer !== 'false' ? prayers?.bishop?.[0] : null;

    const highlightedList = [
      ...(prayers?.staff || []).map((p) => ({ ...p, badge: p.ministryTag || 'Työala', isStaff: true })),
      ...(prayers?.public || []).filter((p) => p.isApproved !== false).map((p) => ({ ...p, badge: 'Yhteisön rukous', isStaff: false })),
    ]
      .sort((a, b) => (b.highlightPriority || 0) - (a.highlightPriority || 0))
      .slice(0, 3);

    return (
      <section
        className="bg-white rounded-3xl border border-stone-200/90 shadow-xs p-5 sm:p-7 space-y-4"
        data-testid="portal-section-prayers"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-2xl bg-primary-100 text-primary-800 flex items-center justify-center text-lg">
              🙏
            </span>
            <div>
              <h2 className="font-martti text-lg sm:text-xl font-bold text-stone-900">
                {title}
              </h2>
              <p className="text-xs text-stone-500">
                Seurakunnan yhteiset rukousaiheet • Rukoiltu tällä viikolla {prayerCount} kertaa
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenPrayerModal && (
              <button
                type="button"
                onClick={onOpenPrayerModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary-700 hover:bg-primary-800 text-white text-xs font-bold transition-colors shadow-2xs"
              >
                <span>✍️</span>
                <span>Jätä rukouspyyntö</span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePrayed}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${
                justPrayed
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-primary-50 hover:bg-primary-100 text-primary-900 border-primary-200'
              }`}
            >
              <span>{justPrayed ? '🕊️' : '🙏'}</span>
              <span>{justPrayed ? 'Kiitos!' : `Olen rukoillut (${prayerCount})`}</span>
            </button>
            <Link
              to="/prayers"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold transition-colors"
            >
              <span>Kaikki aiheet</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>

        {/* Clergy prayer preview if present */}
        {(bishopPrayer || pastorPrayer) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {bishopPrayer && (
              <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200/80 text-xs space-y-1">
                <div className="font-bold text-purple-950 flex items-center gap-1.5">
                  <span>☩</span>
                  <span>Piispa {settings?.bishop_name || 'Matti Repo'}</span>
                </div>
                <p className="text-stone-800 font-serif italic line-clamp-2">
                  &rdquo;{bishopPrayer.content}&rdquo;
                </p>
              </div>
            )}
            {pastorPrayer && (
              <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-xs space-y-1">
                <div className="font-bold text-amber-950 flex items-center gap-1.5">
                  <span>✝️</span>
                  <span>{settings?.pastor_title || 'Kirkkoherra'} {settings?.pastor_name || ''}</span>
                </div>
                <p className="text-stone-800 font-serif italic line-clamp-2">
                  &rdquo;{pastorPrayer.content}&rdquo;
                </p>
              </div>
            )}
          </div>
        )}

        {/* Highlighted community/ministry prayers */}
        {highlightedList.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {highlightedList.map((p) => (
              <div
                key={p.id}
                className="p-3.5 rounded-2xl bg-stone-50/80 border border-stone-200/80 flex flex-col justify-between gap-2"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border border-stone-200 text-stone-700">
                      {p.highlightPriority > 0 ? `${highlightEmoji} ` : ''}{p.badge}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-800 line-clamp-3 leading-relaxed">
                    {p.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-stone-500 italic">
            Ei julkisia esirukousaiheita tälle viikolle. Jätä ensimmäinen rukouspyyntö!
          </p>
        )}
      </section>
    );
  }

  // 5. MEDITAATIOT (Christian Meditations & Silence Section)
  if (sectionId === 'meditations') {
    const title = getModuleTitle('meditations', 'Meditaatiot');
    const defaultMeds = [
      { id: 'lonnebo_beads', title: 'Pelastuksen rengas', icon: '📿', subtitle: 'Lönnebon 18 rukoushelmeä' },
      { id: 'luther_wreath', title: 'Lutherin rukousseppele', icon: '🌹', subtitle: 'Nelisäikeinen katekismusrukous' },
      { id: 'jesus_prayer', title: 'Jeesuksen rukous', icon: '🕊️', subtitle: 'Sydämen rukous & hengitysrytmi' },
      { id: 'lectio_divina', title: 'Lectio Divina', icon: '📜', subtitle: 'Rukoileva Raamatun mietiskely' },
      { id: 'examen', title: 'Ignatiaaninen Examen', icon: '🕯️', subtitle: 'Päivän kiitollinen tutkistelu' },
      { id: 'advent_children', title: 'Lasten kynttilähetki', icon: '🕯️', subtitle: 'Sytytä adventtikynttilät' },
    ];
    const displayMeds = meditations.length > 0 ? meditations.slice(0, 6) : defaultMeds;

    return (
      <section
        className="bg-white rounded-3xl border border-stone-200/90 shadow-xs p-5 sm:p-7 space-y-4"
        data-testid="portal-section-meditations"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center text-lg">
              📿
            </span>
            <div>
              <h2 className="font-martti text-lg sm:text-xl font-bold text-stone-900">
                {title}
              </h2>
              <p className="text-xs text-stone-500">
                Rukoushelmet, katekismusmeditaatio, sydämen rukous ja hiljaisuus
              </p>
            </div>
          </div>

          <Link
            to="/meditations"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors shadow-2xs"
          >
            <span>Siirry meditaatioihin</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {displayMeds.map((med) => (
            <Link
              key={med.id}
              to={`/meditations?tab=${encodeURIComponent(med.slug || med.template_key || med.id)}`}
              className="p-3.5 rounded-2xl border border-stone-200/80 bg-stone-50/50 hover:bg-teal-50/50 hover:border-teal-300 transition-all flex items-start gap-3 group"
            >
              <span className="text-2xl shrink-0">{med.icon || '📿'}</span>
              <div className="min-w-0">
                <h3 className="font-martti text-sm font-bold text-stone-900 group-hover:text-teal-900 truncate">
                  {med.title}
                </h3>
                <p className="text-xs text-stone-500 line-clamp-1">
                  {med.subtitle || med.short_description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  // 6. RAAMATTU & SANA (Bible & Word of the Day Section)
  if (sectionId === 'bible') {
    const title = getModuleTitle('bible', 'Raamattu & Sana');
    const dailyVerse = bibleData?.dailyVerse;

    return (
      <section
        className="bg-white rounded-3xl border border-stone-200/90 shadow-xs p-5 sm:p-7 space-y-4"
        data-testid="portal-section-bible"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-lg">
              📖
            </span>
            <div>
              <h2 className="font-martti text-lg sm:text-xl font-bold text-stone-900">
                {title}
              </h2>
              <p className="text-xs text-stone-500">
                Päivän sana ja viikkolektionaarin raamatunlukukappaleet
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenDailyVerseModal && (
              <button
                type="button"
                onClick={onOpenDailyVerseModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-950 text-xs font-bold transition-colors"
              >
                <span>📜</span>
                <span>Päivän sana</span>
              </button>
            )}
            <Link
              to="/bible"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold transition-colors shadow-2xs"
            >
              <span>Raamattusivu</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>

        {dailyVerse && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-50/80 to-orange-50/40 border border-amber-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                🕊️ Päivän sana
              </span>
              <span className="font-martti text-xs sm:text-sm font-bold text-amber-950">
                {dailyVerse.reference}
              </span>
            </div>
            <blockquote className="text-stone-900 font-serif text-sm sm:text-base italic leading-relaxed border-l-3 border-amber-500 pl-3">
              &rdquo;{dailyVerse.text}&rdquo;
            </blockquote>
          </div>
        )}
      </section>
    );
  }

  return null;
}
