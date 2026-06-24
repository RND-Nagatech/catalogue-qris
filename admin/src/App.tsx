import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import StoresPage from './pages/StoresPage';
import SyncImagesPage from './pages/SyncImagesPage';
import CatalogSyncPage from './pages/CatalogSyncPage';
import SettingsPage from './pages/SettingsPage';
import WhatsAppPage from './pages/WhatsAppPage';
import ImageIndexPage from './pages/ImageIndexPage';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/stores" element={<StoresPage />} />
          <Route path="/sync-images" element={<SyncImagesPage />} />
          <Route path="/catalog-sync" element={<CatalogSyncPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/whatsapp" element={<WhatsAppPage />} />
          <Route path="/image-index" element={<ImageIndexPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
