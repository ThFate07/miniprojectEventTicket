import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarPlus, List, Ticket, ScanLine, Star, Mail, X } from 'lucide-react';

const navItems = [
  { to: '/organizer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/organizer/add-event', label: 'Add Event', icon: CalendarPlus },
  { to: '/organizer/list-shows', label: 'List Shows', icon: List },
  { to: '/organizer/list-bookings', label: 'List Bookings', icon: Ticket },
  { to: '/organizer/scan-entry', label: 'Scan Entry', icon: ScanLine },
  { to: '/organizer/reviews', label: 'Reviews', icon: Star },
  { to: '/organizer/marketing', label: 'Marketing', icon: Mail },
];

const Sidebar = ({ mobileOpen = false, onClose = () => {} }) => (
  <>
    <div
      className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      onClick={onClose}
      aria-hidden="true"
    />

    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-[84vw] max-w-[19rem] flex-col border-r border-white/10 bg-[#0e1318]/96 p-5 text-white shadow-2xl transition-transform duration-300 lg:sticky lg:top-[5.5rem] lg:z-10 lg:h-[calc(100vh-7rem)] lg:w-72 lg:max-w-none lg:translate-x-0 lg:rounded-[1.8rem] lg:border lg:bg-white/5 lg:shadow-xl ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="mb-6 flex items-center justify-between gap-4 lg:mb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-blue-200/70">Workspace</p>
          <h2 className="mt-2 text-2xl font-bold text-blue-300">Organizer Panel</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 lg:hidden"
          aria-label="Close organizer menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto">
        <ul className="space-y-2">
          {navItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/30' : 'text-blue-100/85 hover:bg-white/6 hover:text-white'}`
                }
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  </>
);

export default Sidebar;