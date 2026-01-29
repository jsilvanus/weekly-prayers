import { useTranslation } from 'react-i18next';

function ExportButton({ week, year }) {
  const { t } = useTranslation();

  const handleExport = () => {
    const token = sessionStorage.getItem('token');
    const url = `/api/export/intercession?week=${week}&year=${year}`;

    // Open in new window with token
    const exportWindow = window.open('', '_blank');

    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.text())
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
    <button onClick={handleExport} className="btn-secondary">
      Tulosta esirukous
    </button>
  );
}

export default ExportButton;
