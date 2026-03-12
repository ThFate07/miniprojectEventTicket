import React from 'react';
import { Ticket, DollarSign, CalendarPlus, Users } from 'lucide-react';
import axios from 'axios';
import { useState } from 'react';
import { useEffect } from 'react';

const DashboardHome = () => {

  const [stats, setstats] = useState({})
  const [events, setevents] = useState([]);
  const fetchStats = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API}/events/getOrganizerSummary`);
      setstats(res.data.counts || dummy )
    } catch (error) {
      console.log(error.res.data.message)
    }
  }
  const fetchEvents = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API}/events/get-my-events`);
      setevents(res.data.events)
      console.log(res.data.events)
    } catch (error) {
      console.log(error.res.data.message)
    }
  }
  useEffect(() => {
    fetchStats();
    fetchEvents();
  },[])


  return (
    <>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200/70">Organizer</p>
          <h1 className="mt-2 text-3xl font-bold text-blue-300 sm:text-4xl">Dashboard Overview</h1>
        </div>
        <p className="max-w-xl text-sm leading-6 text-blue-100/80">
          Track current momentum across bookings, revenue, and recent events from one mobile-safe dashboard.
        </p>
      </div>

      {/* Stats Section */}
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="section-card flex flex-col items-center justify-center rounded-[1.5rem] p-6 text-center">
          <Ticket className="w-10 h-10 text-blue-400 mb-3" />
          <p className="text-3xl font-bold text-white">{stats.totalBookings}</p>
          <p className="text-blue-200">Total Bookings</p>
        </div>
        <div className="section-card flex flex-col items-center justify-center rounded-[1.5rem] p-6 text-center">
          <DollarSign className="w-10 h-10 text-green-400 mb-3" />
          <p className="text-3xl font-bold text-white">₹{stats.totalRevenue}</p>
          <p className="text-blue-200">Total Revenue</p>
        </div>
        <div className="section-card flex flex-col items-center justify-center rounded-[1.5rem] p-6 text-center">
          <CalendarPlus className="w-10 h-10 text-purple-400 mb-3" />
          <p className="text-3xl font-bold text-white">{stats.activeShows}</p>
          <p className="text-blue-200">Active Shows</p>
        </div>
        <div className="section-card flex flex-col items-center justify-center rounded-[1.5rem] p-6 text-center">
          <Users className="w-10 h-10 text-yellow-400 mb-3" />
          <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
          <p className="text-blue-200">Total Users</p>
        </div>
      </div>

      {/* Events Section */}
      <h2 className="mb-6 text-2xl font-bold text-blue-300 sm:text-3xl">Your Events</h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {events.map((event) => (
          <div key={event.id} className="section-card overflow-hidden rounded-[1.5rem]">
            <img src={event.banner} alt={event.title} className="w-full h-48 object-cover" />
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-2">{event.title}</h3>
              <p className="text-blue-200 text-sm mb-1">
                {event.eventDateTime && event.eventDateTime.length > 0
                  ? `${new Date(event.eventDateTime[0]).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • ${new Date(event.eventDateTime[0]).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`
                  : 'N/A'}
              </p>
              <p className="text-blue-300 text-xs mb-4">{event.location}</p>
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-blue-200">Bookings:</span>
                <span className="font-semibold text-white">{event.totalBookings}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-blue-200">Revenue:</span>
                <span className="font-semibold text-white">₹{event.totalRevenue.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default DashboardHome; 