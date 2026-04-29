import React, { useEffect, useState } from 'react';
import { CalendarPlus, DollarSign, Ticket, Users } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { userStore } from '@/context/userContext';
import { ROLE_VALUES, normalizeRole } from '@/lib/auth';

const DashboardHome = () => {
  const [stats, setStats] = useState({});
  const [events, setEvents] = useState([]);
  const navigate = useNavigate();
  const user = userStore((state) => state.user);
  const role = normalizeRole(user?.role);
  const isPlatformAdmin = role === ROLE_VALUES.PLATFORM_ADMIN;
  const isCollegeAdmin = role === ROLE_VALUES.COLLEGE_ADMIN;
  const isAdmin = isPlatformAdmin || isCollegeAdmin;
  const eyebrow = isPlatformAdmin ? 'Platform Event Ops' : isCollegeAdmin ? 'College Event Ops' : 'Organizer';
  const title = isPlatformAdmin ? 'All-Platform Event Workspace' : isCollegeAdmin ? 'College Event Workspace' : 'Dashboard Overview';
  const description = isPlatformAdmin
    ? 'Supervise every college event, inspect bookings, and step into any event that needs platform-level support.'
    : isCollegeAdmin
      ? 'Manage all committee events in your college, from early planning through final check-in.'
      : 'Plan events, monitor committee performance, and jump into bookings, reviews, or check-in from one workspace.';

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, eventsRes] = await Promise.allSettled([
          axios.get(`${import.meta.env.VITE_API}/events/getOrganizerSummary`, { withCredentials: true }),
          axios.get(`${import.meta.env.VITE_API}/events/get-my-events`, { withCredentials: true }),
        ]);

        if (statsRes.status === 'fulfilled') {
          setStats(statsRes.value.data.counts || {});
        } else {
          toast.error(statsRes.reason?.response?.data?.message || 'Failed to fetch organizer stats');
        }

        if (eventsRes.status === 'fulfilled') {
          setEvents(eventsRes.value.data.events || []);
        } else {
          toast.error(eventsRes.reason?.response?.data?.message || 'Failed to fetch your events');
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load organizer dashboard');
      }
    };

    fetchDashboardData();
  }, []);
  return (
    <>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200/70">{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-bold text-blue-300 sm:text-4xl">{title}</h1>
        </div>
        <p className="max-w-xl text-sm leading-6 text-blue-100/80">
          {description}
        </p>
      </div>

      {isAdmin && (
        <div className="mb-8 rounded-[1.5rem] border border-[#f4d58d]/25 bg-[#f4d58d]/10 p-5 text-[#f4d58d]">
          <p className="text-sm font-semibold uppercase tracking-[0.2em]">Expanded Admin Powers</p>
          <p className="mt-2 text-sm leading-6">
            {isPlatformAdmin
              ? 'You can edit, audit, scan, and review events across every college. Use the Admin Console for invites and platform-wide people controls.'
              : 'You can edit, audit, scan, and review every event in your college, even when it was created by another committee.'}
          </p>
        </div>
      )}

      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="section-card flex flex-col items-center justify-center rounded-[1.5rem] p-6 text-center">
          <Ticket className="mb-3 h-10 w-10 text-blue-400" />
          <p className="text-3xl font-bold text-white">{stats.totalBookings || 0}</p>
          <p className="text-blue-200">Total Bookings</p>
        </div>
        <div className="section-card flex flex-col items-center justify-center rounded-[1.5rem] p-6 text-center">
          <DollarSign className="mb-3 h-10 w-10 text-green-400" />
          <p className="text-3xl font-bold text-white">₹{Number(stats.totalRevenue || 0).toLocaleString()}</p>
          <p className="text-blue-200">Total Revenue</p>
        </div>
        <div className="section-card flex flex-col items-center justify-center rounded-[1.5rem] p-6 text-center">
          <CalendarPlus className="mb-3 h-10 w-10 text-purple-400" />
          <p className="text-3xl font-bold text-white">{stats.activeShows || 0}</p>
            <p className="text-blue-200">{isAdmin ? 'Scoped Active Shows' : 'Active Shows'}</p>
        </div>
        <div className="section-card flex flex-col items-center justify-center rounded-[1.5rem] p-6 text-center">
          <Users className="mb-3 h-10 w-10 text-yellow-400" />
          <p className="text-3xl font-bold text-white">{stats.totalUsers || 0}</p>
            <p className="text-blue-200">{isPlatformAdmin ? 'Platform Students' : isCollegeAdmin ? 'College Students' : 'Total Users'}</p>
        </div>
      </div>

      <section className="mb-10">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200/70">{isAdmin ? 'Managed Scope' : 'Committee Events'}</p>
            <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">{isAdmin ? 'Events You Can Govern' : 'Your Events'}</h2>
          </div>
          <Link to="/organizer/list-shows" className="text-sm font-medium text-blue-300 hover:text-blue-200">
            Open full portfolio
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <div key={event._id} className="section-card overflow-hidden rounded-[1.5rem]">
              <img src={event.banner} alt={event.title} className="h-48 w-full object-cover" />
              <div className="p-6">
                <h3 className="mb-2 text-xl font-bold text-white">{event.title}</h3>
                <p className="mb-1 text-sm text-blue-200">
                  {event.eventDateTime && event.eventDateTime.length > 0
                    ? `${new Date(event.eventDateTime[0]).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • ${new Date(event.eventDateTime[0]).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`
                    : 'Date not available'}
                </p>
                <p className="mb-4 text-xs text-blue-300">{event.location || 'Location not available'}</p>
                <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-blue-100/80">
                  <span>{event.visibilityScope || 'global'}</span>
                  <span>{event.lifecycleState || 'tentative'}</span>
                </div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-blue-200">Bookings:</span>
                  <span className="font-semibold text-white">{event.totalBookings || 0}</span>
                </div>
                <div className="mb-5 flex items-center justify-between text-sm">
                  <span className="text-blue-200">Revenue:</span>
                  <span className="font-semibold text-white">₹{Number(event.totalRevenue || 0).toLocaleString()}</span>
                </div>
                <div className="mb-5 flex items-center justify-between text-sm">
                  <span className="text-blue-200">Ticket Cost:</span>
                  <span className="font-semibold text-white">{Number(event.cost || 0) === 0 ? 'Free' : `₹${Number(event.cost || 0).toLocaleString()}`}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={() => navigate(`/organizer/show/${event._id}`)}
                    className="rounded-xl border border-blue-500/30 px-4 py-2 text-sm font-semibold text-blue-200 transition-colors hover:bg-blue-500/10"
                  >
                    View details
                  </button>
                  <button
                    onClick={() => navigate(`/organizer/edit-event/${event._id}`)}
                    className="rounded-xl border border-amber-500/30 px-4 py-2 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/10"
                  >
                    Edit event
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {events.length === 0 && (
          <div className="section-card rounded-[1.5rem] p-6 text-blue-200">
            {isAdmin ? 'No events exist in your current admin scope yet.' : 'No managed events yet. Start by planning your first event.'}
          </div>
        )}
      </section>
    </>
  );
};

export default DashboardHome;
