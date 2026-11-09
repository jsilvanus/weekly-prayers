function PrayerCard({ prayer, showMeta = false }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
      {prayer.isYhtymaWide && (
        <div className="mb-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-100 text-indigo-900 border border-indigo-200" title="Yhtymän laajuinen rukousaihe">
            🏛️ Yhtymän yhteinen
          </span>
        </div>
      )}
      <p className="text-gray-800 whitespace-pre-wrap">{prayer.content}</p>

      {showMeta && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          {prayer.authorName && (
            <span>{prayer.authorName}</span>
          )}
          <span>
            {new Date(prayer.createdAt).toLocaleDateString()}
          </span>
        </div>
      )}
    </div>
  );
}

export default PrayerCard;
