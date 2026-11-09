import { useState } from 'react';
import { useTranslation } from 'react-i18next';

function DateRangeCalendar({ startDate, endDate, onChange }) {
  const { t, i18n } = useTranslation();

  // Initial display month based on startDate or today
  const initialDate = startDate ? new Date(startDate) : new Date();
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth()); // 0-indexed

  // Format Date to YYYY-MM-DD
  const formatDateStr = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = formatDateStr(new Date());

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Day of week labels based on locale
  const dayHeaders = ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su'];
  if (i18n.language === 'en') {
    dayHeaders.splice(0, 7, 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su');
  } else if (i18n.language === 'sv') {
    dayHeaders.splice(0, 7, 'Må', 'Ti', 'On', 'To', 'Fr', 'Lö', 'Sö');
  }

  // Calculate calendar days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  // getDay() gives 0 for Sunday. Convert so Monday is 0, Sunday is 6
  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const days = [];
  // Empty slots for previous month days
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(currentYear, currentMonth, d));
  }

  const handleDayClick = (dateObj) => {
    const dateStr = formatDateStr(dateObj);

    if (!startDate || (startDate && endDate)) {
      // Start a new selection
      onChange(dateStr, dateStr);
    } else if (startDate && !endDate) {
      if (dateStr < startDate) {
        onChange(dateStr, startDate);
      } else {
        onChange(startDate, dateStr);
      }
    }
  };

  // Presets
  const applyPreset = (daysCount) => {
    const now = new Date();
    const start = formatDateStr(now);
    const end = new Date(now.getTime() + (daysCount - 1) * 24 * 60 * 60 * 1000);
    onChange(start, formatDateStr(end));
  };

  const monthNames = [
    'Tammikuu', 'Helmikuu', 'Maaliskuu', 'Huhtikuu', 'Toukokuu', 'Kesäkuu',
    'Heinäkuu', 'Elokuu', 'Syyskuu', 'Lokakuu', 'Marraskuu', 'Joulukuu'
  ];
  if (i18n.language === 'en') {
    monthNames.splice(0, 12, 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December');
  } else if (i18n.language === 'sv') {
    monthNames.splice(0, 12, 'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni', 'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December');
  }

  // Calculate total days in selected range
  let durationDays = 0;
  if (startDate && endDate) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    durationDays = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 my-3">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-primary-700">
            {t('prayers.submit.timelineTitle')}
          </span>
          <p className="text-xs text-gray-500">
            {t('prayers.submit.timelineDesc')}
          </p>
        </div>

        {/* Quick presets */}
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => applyPreset(7)}
            className="px-2 py-1 text-xs font-medium rounded bg-white hover:bg-primary-50 text-gray-700 border border-gray-200"
          >
            1 vko
          </button>
          <button
            type="button"
            onClick={() => applyPreset(14)}
            className="px-2 py-1 text-xs font-medium rounded bg-white hover:bg-primary-50 text-gray-700 border border-gray-200"
          >
            2 vko
          </button>
          <button
            type="button"
            onClick={() => applyPreset(30)}
            className="px-2 py-1 text-xs font-medium rounded bg-white hover:bg-primary-50 text-gray-700 border border-gray-200"
          >
            1 kk
          </button>
        </div>
      </div>

      {/* Calendar Header with navigation */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1 rounded hover:bg-gray-100 text-gray-600 font-bold"
            title="Edellinen kuukausi"
          >
            ‹
          </button>
          <div className="text-sm font-semibold text-gray-800">
            {monthNames[currentMonth]} {currentYear}
          </div>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1 rounded hover:bg-gray-100 text-gray-600 font-bold"
            title="Seuraava kuukausi"
          >
            ›
          </button>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-400 mb-1">
          {dayHeaders.map((dh, idx) => (
            <div key={idx} className="py-1">
              {dh}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {days.map((d, idx) => {
            if (!d) {
              return <div key={`empty-${idx}`} className="h-8" />;
            }

            const dStr = formatDateStr(d);
            const isToday = dStr === todayStr;
            const isStart = dStr === startDate;
            const isEnd = dStr === endDate;
            const isInRange = startDate && endDate && dStr >= startDate && dStr <= endDate;

            let cellClass = 'h-8 text-xs flex items-center justify-center rounded-md cursor-pointer transition-all';

            if (isStart || isEnd) {
              cellClass += ' bg-primary-600 text-white font-bold shadow-sm';
            } else if (isInRange) {
              cellClass += ' bg-primary-100 text-primary-900 font-medium';
            } else if (isToday) {
              cellClass += ' border border-primary-400 text-primary-700 font-semibold';
            } else {
              cellClass += ' text-gray-700 hover:bg-gray-100';
            }

            return (
              <button
                type="button"
                key={dStr}
                onClick={() => handleDayClick(d)}
                className={cellClass}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected range summary */}
      <div className="mt-3 flex items-center justify-between text-xs text-gray-600 bg-white px-3 py-2 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-primary-500"></span>
          <span>
            <strong>Aikaväli:</strong> {startDate} &rarr; {endDate}
          </span>
        </div>
        {durationDays > 0 && (
          <span className="bg-primary-50 text-primary-700 font-medium px-2 py-0.5 rounded-full border border-primary-200">
            {durationDays} päivää näkyvillä
          </span>
        )}
      </div>
    </div>
  );
}

export default DateRangeCalendar;
