import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';
import { Outlet, useLocation } from 'react-router-dom';

const DashboardLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-[calc(100vh-6rem)] text-white">
      <div className="app-page flex min-h-[calc(100vh-6rem)] gap-6 lg:items-start">
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

        <main className="min-w-0 flex-1">
          <div className="mb-5 flex justify-end lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5"
              aria-label="Open organizer menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          <div className="min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
