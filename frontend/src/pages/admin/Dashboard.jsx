import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Building2,
  CalendarDays,
  ClipboardCopy,
  GraduationCap,
  Mail,
  ShieldCheck,
  Ticket,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { userStore } from '@/context/userContext';
import { ROLE_VALUES, normalizeRole } from '@/lib/auth';

const roleOptions = [
  { value: ROLE_VALUES.STUDENT, label: 'Student' },
  { value: ROLE_VALUES.ORGANIZER, label: 'Organizer' },
  { value: ROLE_VALUES.COLLEGE_ADMIN, label: 'College Admin' },
];

const lifecycleLabels = {
  draft: 'Draft',
  tentative: 'Tentative',
  finalized: 'Finalized',
  registration_open: 'Registration Open',
  registration_closed: 'Registration Closed',
};

const formatRole = (role) =>
  String(role || 'student')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const StatCard = ({ icon, label, value, tone }) => (
  <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5 shadow-xl">
    <div className="mb-4 flex items-center justify-between">
      <p className="text-sm uppercase tracking-[0.2em] text-blue-100/60">{label}</p>
      {React.createElement(icon, { className: `h-6 w-6 ${tone}` })}
    </div>
    <p className="text-3xl font-bold text-white">{value}</p>
  </div>
);

const Dashboard = () => {
  const user = userStore((state) => state.user);
  const role = normalizeRole(user?.role);
  const isPlatformAdmin = role === ROLE_VALUES.PLATFORM_ADMIN;
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboard, setDashboard] = useState(null);
  const [directory, setDirectory] = useState({ colleges: [], departments: [], committees: [] });
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState({
    collegeId: '',
    departmentId: '',
    role: ROLE_VALUES.STUDENT,
    email: '',
    expiry: '',
  });
  const [createdCode, setCreatedCode] = useState('');

  const selectedDepartments = useMemo(
    () =>
      directory.departments.filter((department) => {
        if (!invite.collegeId) return true;
        const collegeId = department.collegeId?._id || department.collegeId;
        return String(collegeId) === String(invite.collegeId);
      }),
    [directory.departments, invite.collegeId]
  );

  const fetchAdminData = async () => {
    try {
      const [dashboardRes, directoryRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API}/admin/dashboard`, { withCredentials: true }),
        axios.get(`${import.meta.env.VITE_API}/admin/directory`, { withCredentials: true }),
      ]);

      setDashboard(dashboardRes.data);
      setDirectory(directoryRes.data);

      const firstCollege = directoryRes.data.colleges?.[0]?._id || '';
      const firstDepartment = directoryRes.data.departments?.[0]?._id || '';
      setInvite((current) => ({
        ...current,
        collegeId: current.collegeId || firstCollege,
        departmentId: current.departmentId || firstDepartment,
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load admin console');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const createInvite = async (event) => {
    event.preventDefault();
    setCreatedCode('');

    try {
      const payload = {
        collegeId: invite.collegeId,
        departmentId: invite.departmentId,
        role: invite.role,
        expiry: invite.expiry,
        email: invite.email.trim() || undefined,
      };

      const endpoint = payload.email ? '/invite/email' : '/invite/create';
      const res = await axios.post(`${import.meta.env.VITE_API}${endpoint}`, payload, { withCredentials: true });
      setCreatedCode(res.data.invite?.code || '');
      toast.success(payload.email ? 'Invite email sent' : 'Invite code created');
      fetchAdminData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to create invite');
    }
  };

  const copyInvite = async () => {
    if (!createdCode) return;
    await navigator.clipboard.writeText(createdCode);
    toast.success('Invite code copied');
  };

  const counts = dashboard?.counts || {};
  const tabs = [
    { id: 'overview', label: isPlatformAdmin ? 'Platform Control' : 'College Control' },
    { id: 'invites', label: 'Invite Powers' },
    { id: 'events', label: 'Event Oversight' },
    { id: 'people', label: 'People' },
  ];

  if (loading) {
    return <div className="app-page text-blue-100">Loading admin console...</div>;
  }

  return (
    <div className="app-page text-white">
      <section className="mb-8 overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(244,213,141,0.2),transparent_34%),linear-gradient(135deg,rgba(12,21,34,0.96),rgba(23,23,23,0.92))] p-6 shadow-2xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f4d58d]">
              {isPlatformAdmin ? 'Platform Admin' : 'College Admin'}
            </p>
            <h1 className="mt-3 text-4xl font-bold text-white">
              {isPlatformAdmin ? 'Platform Command Center' : 'College Admin Console'}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100/78">
              {isPlatformAdmin
                ? 'Audit every college, inspect platform-wide event activity, and create invites for any campus workspace.'
                : 'Manage your college workspace, create role-based invites, and supervise every committee event in your college.'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-blue-100">
            <p className="text-xs uppercase tracking-[0.2em] text-blue-100/55">Current Scope</p>
            <p className="mt-2 text-lg font-semibold text-white">{dashboard?.scope?.label || 'Admin scope'}</p>
          </div>
        </div>
      </section>

      <div className="mb-8 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab.id ? 'bg-[#f4d58d] text-[#171717]' : 'border border-white/10 bg-white/5 text-blue-100 hover:bg-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Building2} label="Colleges" value={counts.colleges || 0} tone="text-[#f4d58d]" />
            <StatCard icon={Users} label="Users" value={counts.users || 0} tone="text-sky-300" />
            <StatCard icon={CalendarDays} label="Events" value={counts.events || 0} tone="text-emerald-300" />
            <StatCard icon={Ticket} label="Bookings" value={counts.bookings || 0} tone="text-rose-300" />
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-blue-100/60">Admin Powers</p>
              <div className="mt-4 space-y-3 text-sm text-blue-100/80">
                <p>{isPlatformAdmin ? 'Can view and invite across every college.' : 'Can view and invite inside assigned college.'}</p>
                <p>Can manage events in scope, including lifecycle, visibility, bookings, check-in, and marketing.</p>
                <p>Can issue student, organizer, or college-admin invites.</p>
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5 lg:col-span-2">
              <p className="text-sm uppercase tracking-[0.2em] text-blue-100/60">Role Distribution</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Object.entries(counts.usersByRole || {}).map(([entryRole, count]) => (
                  <div key={entryRole} className="rounded-2xl bg-black/25 p-4">
                    <p className="text-sm text-blue-100/70">{formatRole(entryRole)}</p>
                    <p className="mt-2 text-2xl font-bold text-white">{count}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'invites' && (
        <form onSubmit={createInvite} className="grid gap-5 rounded-[1.5rem] border border-white/10 bg-white/6 p-6 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f4d58d]">Invite Management</p>
            <h2 className="mt-2 text-2xl font-bold">Create scoped access</h2>
            <p className="mt-3 text-sm leading-6 text-blue-100/75">
              Generate an invite code, or add an email to send a one-use invitation. Organizers invited here gain event workspace access.
            </p>
            {createdCode && (
              <button
                type="button"
                onClick={copyInvite}
                className="mt-5 flex items-center gap-3 rounded-2xl border border-[#f4d58d]/40 bg-[#f4d58d]/10 px-4 py-3 text-left text-[#f4d58d]"
              >
                <ClipboardCopy className="h-5 w-5" />
                <span className="font-mono text-lg font-bold tracking-[0.2em]">{createdCode}</span>
              </button>
            )}
          </div>

          <div className="grid gap-4">
            <Select value={invite.collegeId} onValueChange={(value) => setInvite((current) => ({ ...current, collegeId: value, departmentId: '' }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select college" />
              </SelectTrigger>
              <SelectContent>
                {directory.colleges.map((college) => (
                  <SelectItem key={college._id} value={college._id}>{college.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={invite.departmentId} onValueChange={(value) => setInvite((current) => ({ ...current, departmentId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {selectedDepartments.map((department) => (
                  <SelectItem key={department._id} value={department._id}>{department.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={invite.role} onValueChange={(value) => setInvite((current) => ({ ...current, role: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="email" placeholder="Optional email for direct invite" value={invite.email} onChange={(event) => setInvite((current) => ({ ...current, email: event.target.value }))} />
            <Input type="datetime-local" value={invite.expiry} onChange={(event) => setInvite((current) => ({ ...current, expiry: event.target.value }))} required />
            <Button type="submit" className="rounded-full bg-[#f4d58d] text-[#171717] hover:bg-[#ffe4a8]">
              <Mail className="h-4 w-4" />
              Create Invite
            </Button>
          </div>
        </form>
      )}

      {activeTab === 'events' && (
        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5">
            <p className="text-sm uppercase tracking-[0.2em] text-blue-100/60">Lifecycle Control</p>
            <div className="mt-4 space-y-3">
              {Object.entries(counts.eventsByLifecycle || {}).map(([state, count]) => (
                <div key={state} className="flex items-center justify-between rounded-2xl bg-black/25 px-4 py-3">
                  <span className="text-blue-100/80">{lifecycleLabels[state] || state}</span>
                  <span className="font-bold text-white">{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5">
            <p className="text-sm uppercase tracking-[0.2em] text-blue-100/60">Recent Managed Events</p>
            <div className="mt-4 space-y-3">
              {(dashboard?.recentEvents || []).map((event) => (
                <div key={event._id} className="rounded-2xl bg-black/25 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-semibold text-white">{event.title}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-[#f4d58d]">{event.visibilityScope}</p>
                  </div>
                  <p className="mt-2 text-sm text-blue-100/70">
                    {event.collegeId?.name || 'Platform'} · {event.committeeId?.name || 'No committee'} · {lifecycleLabels[event.lifecycleState] || event.lifecycleState}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'people' && (
        <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-blue-100/60">Recent Users</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(dashboard?.recentUsers || []).map((member) => (
              <div key={member._id} className="rounded-2xl bg-black/25 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f4d58d] text-[#171717]">
                    {member.role === ROLE_VALUES.STUDENT ? <GraduationCap className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{member.fullName || member.username}</p>
                    <p className="text-sm text-blue-100/65">{member.email}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#f4d58d]">{formatRole(member.role)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
