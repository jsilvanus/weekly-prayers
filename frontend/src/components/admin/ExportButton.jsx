import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { withBasePath } from '../../services/api';

function ExportButton({ week, year }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const openExport = (highlightsOnly = false) => {
    setIsOpen(false);
    const token = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('token') : null;
    const tokenQuery = token ? `&token=${encodeURIComponent(token)}` : '';
    const url = withBasePath(
      `/api/export/intercession?week=${week}&year=${year}${highlightsOnly ? '&highlightsOnly=true' : ''}${tokenQuery}`
    );

    const exportWindow = window.open('', '_blank');

    fetch(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((html) => {
        exportWindow.document.write(html);
        exportWindow.document.close();
      })
      .catch((error) => {
        exportWindow.close();
        alert('Export failed: ' + error.message);
      });
  };

  return (
    <div className="relative inline-block text-left">
      <div className="inline-flex rounded-md shadow-sm">
        <button
          type="button"
          onClick={() => openExport(false)}
          className="btn-secondary text-xs rounded-r-none border-r-0 flex items-center gap-1.5"
        >
          <span>🖨️</span>
          <span>{t('admin.export.all', 'Tulosta kaikki')}</span>
        </button>
        <button
          type="button"
          onClick={() => openExport(true)}
          className="btn-secondary text-xs rounded-l-none bg-amber-50 text-amber-800 hover:bg-amber-100 flex items-center gap-1 border-l border-amber-200"
          title="Tulosta vain nostetut rukousaiheet"
        >
          <span>⭐</span>
          <span>{t('admin.export.highlightsOnly', 'Vain nostot')}</span>
        </button>
      </div>
    </div>
  );
}

export default ExportButton;
