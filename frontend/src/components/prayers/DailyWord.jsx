import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../context/SettingsContext';
import { ChurchPictograms } from '../../assets/churchIcons';

function DailyWord() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [isOpen, setIsOpen] = useState(false);

  if (settings.daily_word_enabled === 'false') {
    return null;
  }

  const title = settings.daily_word_title || 'Päivän sana';
  const verse = settings.daily_word_verse || 'Ps. 103:1–4';
  const content = settings.daily_word_content || 'Ylistä Herraa, minun sieluni, ja kaikki mitä minussa on, hänen pyhää nimeään. Ylistä Herraa, minun sieluni, äläkä unohda, mitä hyvää hän on sinulle tehnyt.';
  const reflection = settings.daily_word_reflection || 'Herra on laupias ja armahtavainen, pitkämielinen ja suuri armossaan. Hän antaa anteeksi syntisi ja parantaa sairautesi.';

  return (
    <section className="mb-6" data-testid="daily-word-section">
      <div className="bg-gradient-to-r from-amber-50/80 via-white to-amber-50/50 rounded-xl border border-amber-200/80 shadow-sm overflow-hidden transition-all">
        {/* Collapsible Header Bar */}
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="p-3.5 sm:px-5 flex items-center justify-between cursor-pointer hover:bg-amber-100/40 transition-colors select-none"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
              <ChurchPictograms.Bible className="w-5 h-5" color="#92400e" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-martti font-bold text-amber-950 text-sm sm:text-base">
                  {title}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900 border border-amber-300">
                  {verse}
                </span>
              </div>
              <p className="text-xs text-gray-600 line-clamp-1 sm:line-clamp-none">
                {isOpen ? 'Raamatunteksti ja mietiskely tälle päivälle' : `"${content.substring(0, 80)}..."`}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="text-xs font-semibold text-amber-800 hover:text-amber-950 flex items-center gap-1 shrink-0 ml-3 py-1 px-2.5 rounded-md hover:bg-amber-200/50"
            aria-expanded={isOpen}
          >
            <span>{isOpen ? 'Pienennä' : 'Lue teksti'}</span>
            <span className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
        </div>

        {/* Collapsible Content */}
        {isOpen && (
          <div className="px-5 pb-5 pt-2 border-t border-amber-200/60 bg-amber-50/30 text-gray-800">
            <blockquote className="font-serif italic text-base leading-relaxed text-gray-900 pl-4 border-l-3 border-amber-500 my-3">
              &rdquo;{content}&rdquo;
            </blockquote>

            <div className="text-right text-xs font-semibold text-amber-900 mb-3">
              — {verse}
            </div>

            {reflection && (
              <div className="bg-white/80 rounded-lg p-3 text-xs text-gray-700 border border-amber-100 leading-relaxed">
                <strong className="text-amber-900">Mietiskely:</strong> {reflection}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default DailyWord;
