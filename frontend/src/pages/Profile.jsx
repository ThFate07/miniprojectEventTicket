import React, { useEffect, useState } from 'react';
import { Edit2 } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { userStore } from '@/context/userContext';
import { isOrganizerRole, isStudentRole, normalizeRole } from '@/lib/auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const getSafeEventDate = (dateArray) => {
  if (Array.isArray(dateArray) && dateArray.length) {
    return dateArray[0];
  }

  return dateArray;
};

const EventCard = ({ event }) => (
  <div className="bg-blue-800/30 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200">
    <img src={event.banner} alt={event.title} className="w-full h-40 object-cover" />
    <div className="p-4 space-y-1">
      <h3 className="text-white text-lg font-bold">{event.title}</h3>
      <p className="text-blue-300 text-sm capitalize">{event.lifecycleState || event.status}</p>
      <p className="text-blue-200 text-xs">
        {new Date(getSafeEventDate(event.eventDateTime || event.finalDate || event.tentativeDate)).toLocaleString()}
      </p>
    </div>
  </div>
);

const Profile = () => {
  const [user, setUser] = useState(null);
  const [bookedEvents, setBookedEvents] = useState([]);
  const [inviteCode, setInviteCode] = useState('');
  const [joiningCollege, setJoiningCollege] = useState(false);
  const navigate = useNavigate();
  const updateUserStore = userStore((state) => state.setUser);

  const fetchProfile = async () => {
    const profileRes = await axios.get(`${import.meta.env.VITE_API}/user/getUserProfile`, {
      withCredentials: true,
    });
    const currentUser = profileRes.data.user;
    setUser(currentUser);
    updateUserStore(currentUser);

    if (isStudentRole(currentUser.role)) {
      const bookingRes = await axios.get(`${import.meta.env.VITE_API}/events/get-booked-events`, {
        withCredentials: true,
      });
      setBookedEvents(bookingRes.data.data || []);
    } else {
      setBookedEvents([]);
    }
  };

  useEffect(() => {
    fetchProfile().catch((error) => {
      console.error('Error fetching profile:', error);
      navigate('/login');
    });
  }, [navigate]);

  const handleJoinCollege = async (e) => {
    e.preventDefault();

    if (!inviteCode.trim()) {
      toast.error('Enter a valid invite code');
      return;
    }

    setJoiningCollege(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_API}/invite/validate`,
        { code: inviteCode.trim() },
        { withCredentials: true }
      );
      const response = await axios.post(
        `${import.meta.env.VITE_API}/invite/accept`,
        { code: inviteCode.trim() },
        { withCredentials: true }
      );
      toast.success('College joined successfully. Your event access is now active.');
      setInviteCode('');
      await fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to join college');
    } finally {
      setJoiningCollege(false);
    }
  };

  if (!user) {
    return <div className="text-white text-center mt-20">Loading profile...</div>;
  }

  const organizer = isOrganizerRole(user.role);
  const student = isStudentRole(user.role);
  const avatarUrl = `https://ui-avatars.com/api/?name=${user.username}&background=2563eb&color=fff`;
  const today = new Date();
  const normalizedRole = normalizeRole(user.role);
  const bookedCount = bookedEvents.length;

  const upcomingEvents = bookedEvents.filter((event) => new Date(getSafeEventDate(event.eventDateTime)) > today);
  const completedEvents = bookedEvents.filter((event) => new Date(getSafeEventDate(event.eventDateTime)) <= today);

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-5xl mx-auto glass rounded-2xl overflow-hidden shadow-xl">
        <div className="bg-blue-800/30 p-6 flex flex-col md:flex-row items-start gap-6">
          <div className="relative">
            <img src={avatarUrl} alt="avatar" className="w-32 h-32 rounded-full border-4 border-white/50 shadow-md" />
            <div className="absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full">
              <Edit2 className="w-4 h-4 text-white" />
            </div>
          </div>

          <div className="flex-1">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white">{user.username}</h1>
                <p className="text-blue-200">{user.email}</p>
                <p className="mt-2 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-blue-100">
                  {normalizedRole.replace('_', ' ')}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 text-sm text-blue-100">
              <p>College: {user.collegeId?.name || 'Not joined yet'}</p>
              <p>Department: {user.departmentId?.name || 'Not assigned yet'}</p>
              {organizer && (
                <p>
                  Committees: {Array.isArray(user.committeeIds) && user.committeeIds.length > 0
                    ? user.committeeIds.map((committee) => committee.name || 'Committee').join(', ')
                    : 'No committee linked yet'}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 bg-blue-900/30 divide-y md:divide-y-0 md:divide-x divide-blue-800/40 text-center">
          <div className="p-6">
            <div className="text-4xl font-bold text-white">
              {organizer ? user.eventsOrganized?.length || 0 : student ? bookedCount : 0}
            </div>
            <div className="text-blue-200 mt-1">
              {organizer ? 'Events Organized' : student ? 'Events Booked' : 'Activity'}
            </div>
          </div>

          <div className="p-6 flex items-center justify-center">
            {organizer ? (
              <button
                onClick={() => navigate('/organizer/dashboard')}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-all"
              >
                Go to Dashboard
              </button>
            ) : (
              <button
                onClick={() => navigate('/events')}
                className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg transition-all"
              >
                Browse Events
              </button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-10">
          {user.hasTenantAccess === false && (
            <section className="campus-hero-card p-5">
              <h2 className="text-xl font-semibold text-white">Join your college workspace</h2>
              <p className="mt-2 text-sm text-blue-100">
                Your account is active, but college-specific events and registration stay locked until you accept an invite.
              </p>
              <form onSubmit={handleJoinCollege} className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Input
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Enter invite code"
                  className="flex-1"
                />
                <Button type="submit" disabled={joiningCollege} className="sm:w-auto">
                  {joiningCollege ? 'Joining...' : 'Join College'}
                </Button>
              </form>
            </section>
          )}

          {organizer ? (
            <section>
              <h2 className="text-xl font-semibold text-white">Your Organized Events</h2>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(user.eventsOrganized || []).map((event) => (
                  <EventCard key={event._id} event={event} />
                ))}
              </div>
              {!(user.eventsOrganized || []).length && (
                <p className="text-blue-300 text-center mt-6">No events organized yet.</p>
              )}
            </section>
          ) : (
            <>
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">Upcoming Booked Events</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingEvents.map((event) => (
                    <EventCard key={event._id} event={event} />
                  ))}
                </div>
                {!upcomingEvents.length && (
                  <p className="text-blue-300 text-center mt-4">No upcoming events booked.</p>
                )}
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-10 mb-4">Completed Events</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedEvents.map((event) => (
                    <EventCard key={event._id} event={event} />
                  ))}
                </div>
                {!completedEvents.length && (
                  <p className="text-blue-300 text-center mt-4">No completed events found.</p>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
