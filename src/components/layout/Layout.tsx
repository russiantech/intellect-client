import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import AISidebarWidget from '@/components/shared/AISidebarWidget';
import Sidebar from './Sidebar';
import ImpersonationBanner from '@/components/shared/ImpersonationBanner';
// import ImpersonationBanner from '../shared/ImpersonationBanner';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="app-layout">
      <ImpersonationBanner />
      <Navbar onToggleSidebar={() => setSidebarOpen(p => !p)} />
      <div className="page-wrapper">
        {/* <ImpersonationBanner /> */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <main className="main-content">
            <Outlet />
          </main>
          <Footer />
        </div>
      </div>
      <AISidebarWidget />
    </div>
  );
}
