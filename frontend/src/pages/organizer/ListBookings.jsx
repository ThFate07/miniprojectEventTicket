import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, Clock, User, Ticket, DollarSign, Search, ChevronDown } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const ListBookings = () => {
  const [selectedEvent, setSelectedEvent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All'); // 'All', 'Confirmed', 'Pending'
  const [events, setEvents] = useState([]);
  const [allBookings, setAllBookings] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsRes, bookingsRes] = await Promise.allSettled([
          axios.get(`${import.meta.env.VITE_API}/events/get-my-events`, { withCredentials: true }),
          axios.get(`${import.meta.env.VITE_API}/events/get-bookings`, { withCredentials: true }),
        ]);

        if (eventsRes.status === 'fulfilled') {
          const organizerEvents = (eventsRes.value.data.events || []).map((event) => ({
            id: event._id,
            title: event.title,
          }));
          setEvents(organizerEvents);
          if (organizerEvents.length === 1) {
            setSelectedEvent(organizerEvents[0].id);
          }
        } else {
          toast.error(eventsRes.reason?.response?.data?.message || 'Failed to fetch your events');
        }

        const bookings = bookingsRes.status === 'fulfilled'
          ? bookingsRes.value.data.bookings || []
          : [];

        const bookingsByEvent = {};
        bookings.forEach(booking => {
          const eventId = booking.event_id?._id || booking.event_id;
          if (!bookingsByEvent[eventId]) bookingsByEvent[eventId] = [];
          bookingsByEvent[eventId].push({
            id: booking._id,
            userName: booking.user_id?.username || 'Unknown',
            bookingTime: booking.booking_dateTime,
            seats: booking.seats.includes(',') ? booking.seats.split(',') : [booking.seats],
            total: booking.paymentAmt,
            status: booking.ticket_redeem ? 'Checked in' : 'Confirmed',
            redeemedAt: booking.ticket_redeemedAt,
          });
        });

        setAllBookings(bookingsByEvent);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load booking data');
      }
    };

    fetchData();
  }, []);

  const bookingsForSelectedEvent = useMemo(() => {
    let filteredBookings = selectedEvent ? allBookings[selectedEvent] || [] : [];

    if (searchTerm) {
      filteredBookings = filteredBookings.filter(booking =>
        booking.userName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== 'All') {
      filteredBookings = filteredBookings.filter(booking =>
        booking.status === filterStatus
      );
    }

    return filteredBookings;
  }, [selectedEvent, searchTerm, filterStatus, allBookings]);

  return (
    <div className="min-h-screen text-white">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200/70">Organizer</p>
          <h1 className="mt-2 text-3xl font-bold text-blue-300 sm:text-4xl">Manage Bookings</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowFilters((prev) => !prev)}
          className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white md:hidden"
        >
          Filters
          <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div className="section-card mb-8 p-4 sm:p-5">
        <div className={`mobile-collapse-panel space-y-4 ${showFilters ? 'max-h-[28rem] opacity-100' : 'max-h-[5rem] opacity-100 md:max-h-[28rem]'}`}>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-center">
            <label htmlFor="event-select" className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">Select Event</label>
            <select
              id="event-select"
              className="rounded-xl border border-blue-400/20 bg-gray-800 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 md:min-w-72"
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
            >
              <option value="">-- Select an Event --</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
          </div>

          {selectedEvent && (
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_14rem]">
              <div className="relative flex items-center">
            <Search className="absolute left-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by attendee name..."
              className="w-full rounded-xl border border-blue-400/20 bg-gray-800 py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="rounded-xl border border-blue-400/20 bg-gray-800 p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Checked in">Checked in</option>
          </select>
            </div>
          )}
        </div>
      </div>

      {selectedEvent && (bookingsForSelectedEvent.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {bookingsForSelectedEvent.map((booking) => (
            <div key={booking.id} className="section-card rounded-[1.5rem] p-6">
              <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-400" /> {booking.userName}
              </h3>
              <p className="text-blue-200 text-sm mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Booking Time: {new Date(booking.bookingTime).toLocaleString()}
              </p>
              <p className="text-blue-200 text-sm mb-2 flex items-center gap-2">
                <Ticket className="w-4 h-4" /> Seats: {booking.seats.join(', ')}
              </p>
              <p className="text-blue-200 text-sm mb-2 flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Total: ₹{booking.total}
              </p>
              <p className="text-blue-200 text-sm mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Status: <span className={`font-semibold ${booking.status === 'Checked in' ? 'text-emerald-400' : 'text-green-400'}`}>{booking.status}</span>
              </p>
              {booking.redeemedAt && (
                <p className="text-blue-200 text-sm">Checked in at: {new Date(booking.redeemedAt).toLocaleString()}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-blue-300 text-lg">No bookings found for this event matching your criteria.</p>
      ))}

      {!selectedEvent && (
        <p className="text-center text-blue-300 text-lg">Please select an event to view its bookings.</p>
      )}
    </div>
  );
};

export default ListBookings;