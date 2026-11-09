import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HomePage from './components/prayers/HomePage';
import AdminPanel from './components/admin/AdminPanel';
import BiblePage from './components/bible/BiblePage';

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <div className="min-h-screen flex flex-col font-aptos">
          <Header />
          <main className="flex-grow container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/bible" element={<BiblePage />} />
              <Route path="/raamattu" element={<BiblePage />} />
              <Route path="/admin/*" element={<AdminPanel />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
