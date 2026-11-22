import { useEffect, useRef } from 'react';
import abcjs from 'abcjs';

/**
 * Reusable NotationViewer Component
 * Renders musical sheet notation via abcjs when notation_abc is present (takes precedence),
 * or an image when notation_image_url is present.
 */
export default function NotationViewer({
  notation_abc,
  notation_image_url,
  abc,
  imageUrl,
  title,
  className = '',
}) {
  const containerRef = useRef(null);
  const activeAbc = notation_abc || abc;
  const activeImageUrl = notation_image_url || imageUrl;

  useEffect(() => {
    if (activeAbc && containerRef.current) {
      try {
        containerRef.current.innerHTML = '';
        abcjs.renderAbc(containerRef.current, activeAbc.trim(), {
          responsive: 'resize',
          scale: 0.95,
          add_classes: true,
          paddingtop: 10,
          paddingbottom: 10,
          paddingleft: 10,
          paddingright: 10,
        });
      } catch (err) {
        console.warn('Could not render ABC notation:', err);
      }
    }
  }, [activeAbc]);

  if (!activeAbc && !activeImageUrl) {
    return null;
  }

  return (
    <div
      className={`bg-white rounded-xl border border-stone-200 p-3 sm:p-4 shadow-2xs my-2 overflow-x-auto ${className}`}
      data-testid="notation-viewer"
    >
      {title && (
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
          <span>🎵</span>
          <span>{title}</span>
        </div>
      )}

      {activeAbc ? (
        <div ref={containerRef} className="w-full flex justify-center abcjs-container text-stone-900" />
      ) : activeImageUrl ? (
        <div className="flex justify-center">
          <img
            src={activeImageUrl}
            alt={title || 'Sävelmänuotit'}
            className="max-w-full h-auto rounded-lg"
          />
        </div>
      ) : null}
    </div>
  );
}
