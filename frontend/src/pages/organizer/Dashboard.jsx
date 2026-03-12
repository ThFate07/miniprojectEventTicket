import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';
import { Outlet, useLocation } from 'react-router-dom';

const routeTitles = {
  '/organizer/dashboard': 'Dashboard Overview',
  '/organizer/add-event': 'Add Event',
  '/organizer/list-shows': 'Your Shows',
  '/organizer/list-bookings': 'Manage Bookings',
  '/organizer/scan-entry': 'Scan Entry',
  '/organizer/reviews': 'Event Reviews',
  '/organizer/marketing': 'Email Marketing',
};

const DashboardLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const pageTitle = useMemo(() => {
    const matched = Object.entries(routeTitles).find(([path]) => location.pathname.startsWith(path));
    return matched?.[1] || 'Organizer Workspace';
  }, [location.pathname]);

  return (
    <div className="min-h-[calc(100vh-6rem)] text-white">
      <div className="app-page flex min-h-[calc(100vh-6rem)] gap-6 lg:items-start">
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

        <main className="min-w-0 flex-1">
          <div className="section-card mb-5 flex items-center justify-between gap-4 px-4 py-4 sm:px-5 lg:hidden">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200/70">Organizer</p>
              <h1 className="mt-1 text-xl font-bold text-white">{pageTitle}</h1>
            </div>
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
