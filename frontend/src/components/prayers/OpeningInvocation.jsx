import { useTranslation } from 'react-i18next';

function OpeningInvocation() {
  const { t } = useTranslation();

  return (
    <div className="text-center my-8 py-5 px-6 bg-gradient-to-r from-primary-50/40 via-primary-50 to-primary-50/40 rounded-2xl border border-primary-100/80 shadow-sm">
      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-700 text-sm font-serif mb-2">
        ✝
      </div>
      <p className="font-serif text-lg md:text-xl text-primary-900 italic tracking-wide">
        &rdquo;{t('prayers.invocation')}&rdquo;
      </p>
    </div>
  );
}

export default OpeningInvocation;
