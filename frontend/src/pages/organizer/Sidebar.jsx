import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarPlus, List, ScanLine, Star, Mail, Ticket, X, ShieldCheck } from 'lucide-react';
import { userStore } from '@/context/userContext';
import { ROLE_VALUES, normalizeRole } from '@/lib/auth';

const navItems = [
  { to: '/organizer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/organizer/add-event', label: 'Plan Event', icon: CalendarPlus },
  { to: '/organizer/list-shows', label: 'Event Portfolio', icon: List },
  { to: '/organizer/list-bookings', label: 'Event Bookings', icon: Ticket },
  { to: '/organizer/scan-entry', label: 'Check-In Desk', icon: ScanLine },
  { to: '/organizer/reviews', label: 'Reviews', icon: Star },
  { to: '/organizer/marketing', label: 'Outreach', icon: Mail },
];

const Sidebar = ({ mobileOpen = false, onClose = () => {} }) => {
  const user = userStore((state) => state.user);
  const role = normalizeRole(user?.role);
  const isAdmin = role === ROLE_VALUES.COLLEGE_ADMIN || role === ROLE_VALUES.PLATFORM_ADMIN;
  const panelTitle = isAdmin ? 'Admin Event Ops' : 'Committee Panel';
  const panelCopy =
    role === ROLE_VALUES.PLATFORM_ADMIN
      ? 'Platform-wide event supervision with access across every college workspace.'
      : role === ROLE_VALUES.COLLEGE_ADMIN
        ? 'College-wide event supervision across all committees in your campus.'
        : 'Draft early, finalize later, and manage visibility without duplicating events.';

  const items = isAdmin
    ? [{ to: '/admin', label: 'Admin Console', icon: ShieldCheck }, ...navItems]
    : navItems;

  return (
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
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#f4d58d]">Workspace</p>
          <h2 className="mt-2 text-2xl font-bold text-blue-300">{panelTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-blue-100/70">
            {panelCopy}
          </p>
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
        <div className="mb-4 rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-blue-100/60">Workflow</p>
          <p className="mt-2 text-lg font-semibold text-white">{isAdmin ? 'Scope → Approve → Audit' : 'Tentative → Finalized → Registration Open'}</p>
        </div>
        <ul className="space-y-2">
          {items.map(({ to, label, icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/30' : 'text-blue-100/85 hover:bg-white/6 hover:text-white'}`
                }
              >
                {React.createElement(icon, { className: 'h-5 w-5' })}
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  </>
  );
};

export default Sidebar;
