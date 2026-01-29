function PrayerCard({ prayer, showMeta = false }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
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
