/**
 * Graphical Assets and Pictograms of the Evangelical Lutheran Church of Finland
 * (Suomen evankelis-luterilaisen kirkon visuaaliset elementit ja piktogrammit)
 */

// Official EVL Circle Logo with Cross (Syksyn 2024 uudistettu ympyrälogo)
export function ChurchCircleLogo({ className = "w-9 h-9", color = "currentColor" }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Suomen evankelis-luterilainen kirkko">
      <circle cx="50" cy="50" r="46" stroke={color} strokeWidth="6" />
      {/* Central stylized Latin Cross */}
      <path
        d="M50 14 V86 M26 38 H74"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
      />
      {/* Surrounding circular arcs and rays */}
      <circle cx="50" cy="38" r="16" stroke={color} strokeWidth="3" strokeDasharray="3 3" opacity="0.6" />
    </svg>
  );
}

// Tampere Diocese Bishop Crest (Tampereen hiippakunnan piispa Matti Revon vaakuna)
export function BishopCrestLogo({ className = "w-12 h-14" }) {
  return (
    <img
      src="/tampere_piispan_vaakuna.png"
      alt="Tampereen hiippakunnan piispan vaakuna"
      className={`${className} object-contain drop-shadow-sm`}
    />
  );
}

// Local Pastor / Parish Seal Emblem (Seurakunnan ja kirkkoherran sinetti)
export function PastorSealLogo({ className = "w-11 h-11" }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Seurakunnan sinetti">
      <defs>
        <linearGradient id="pastorGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="44" stroke="url(#pastorGold)" strokeWidth="3" />
      <circle cx="50" cy="50" r="39" stroke="#c9a227" strokeWidth="1" strokeDasharray="2 3" />
      
      {/* Center Luther Rose / Cross Motif */}
      <path
        d="M50 24 V76 M34 40 H66"
        stroke="#c9a227"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="50" cy="50" r="7" fill="#c9a227" fillOpacity="0.3" stroke="#c9a227" strokeWidth="2" />
      <path
        d="M50 34 C44 42 40 50 42 58 C44 65 56 65 58 58 C60 50 56 42 50 34 Z"
        fill="#fef3c7"
        stroke="#d97706"
        strokeWidth="1.5"
      />
    </svg>
  );
}

// Local Parish Emblem (Seurakunnan oma tunnus)
export function LocalParishLogo({ className = "w-9 h-9", color = "currentColor" }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Seurakunnan logo">
      {/* Cathedral church tower silhouette with arched windows and cross */}
      <path
        d="M50 14 L50 22 M46 18 H54"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M50 22 L36 46 H64 Z"
        fill={color}
        fillOpacity="0.15"
        stroke={color}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <rect x="36" y="46" width="28" height="42" stroke={color} strokeWidth="3" />
      {/* Arched Romanesque Church Portal */}
      <path
        d="M44 88 V66 C44 60 56 60 56 66 V88"
        stroke={color}
        strokeWidth="2.5"
      />
      {/* Rose window */}
      <circle cx="50" cy="56" r="4" stroke={color} strokeWidth="2" />
    </svg>
  );
}

// EVL Pictograms (Kirkon graafisen ohjeiston mukaiset symbolit)
export const ChurchPictograms = {
  Cross: ({ className = "w-5 h-5", color = "currentColor" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M7 7h10" />
    </svg>
  ),
  Candle: ({ className = "w-5 h-5", color = "currentColor" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3c-1 2-2 3-2 5a2 2 0 0 0 4 0c0-2-1-3-2-5z" fill={color} fillOpacity="0.4" />
      <rect x="9" y="10" width="6" height="12" rx="1" />
      <path d="M6 22h12" />
    </svg>
  ),
  Dove: ({ className = "w-5 h-5", color = "currentColor" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 10c0-3.3-2.7-6-6-6a5.9 5.9 0 0 0-5 2.8L3 11l4 2 1 5 4-2 3 2c2-1 3-5 3-8z" />
    </svg>
  ),
  Bible: ({ className = "w-5 h-5", color = "currentColor" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
      <path d="M6 6h10M6 10h10M6 14h6" />
    </svg>
  ),
  PrayingHands: ({ className = "w-5 h-5", color = "currentColor" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M8 6l4-2 4 2M7 11l5-1 5 1M6 16l6-1 6 1" />
    </svg>
  )
};
