import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { TenantProvider } from './context/TenantContext';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HomePage from './components/prayers/HomePage';
import PrayerMomentPage from './components/prayers/PrayerMomentPage';
import DevotionPage from './components/prayers/DevotionPage';
import MeditationPage from './components/prayers/MeditationPage';
import AdminPanel from './components/admin/AdminPanel';
import BiblePage from './components/bible/BiblePage';
import { withBasePath } from './services/api';

function IntercessionRedirect() {
  useEffect(() => {
    const token = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('token') : null;
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    window.location.replace(withBasePath(`/api/export/intercession${query}`));
  }, []);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-gray-500 text-sm">Avataan esirukouslistaa...</div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <TenantProvider>
          <div className="min-h-screen flex flex-col font-aptos">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/prayers" element={<HomePage />} />
                <Route path="/esirukoukset" element={<HomePage />} />
                <Route path="/bible" element={<BiblePage />} />
                <Route path="/raamattu" element={<BiblePage />} />
                <Route path="/prayer-moment" element={<PrayerMomentPage />} />
                <Route path="/hetkirukous" element={<PrayerMomentPage />} />
                <Route path="/hartaus" element={<DevotionPage />} />
                <Route path="/devotion" element={<DevotionPage />} />
                <Route path="/meditations" element={<MeditationPage />} />
                <Route path="/meditaatiot" element={<MeditationPage />} />
                <Route path="/hiljaisuus" element={<MeditationPage />} />
                <Route path="/esirukouslista" element={<IntercessionRedirect />} />
                <Route path="/esirukous" element={<IntercessionRedirect />} />
                <Route path="/intercession" element={<IntercessionRedirect />} />
                <Route path="/admin/*" element={<AdminPanel />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </TenantProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
