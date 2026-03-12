import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Download, Share2 } from 'lucide-react';
import { downloadTicketPdf, shareTicketPdf } from '@/lib/ticketPdf';
import { getEventPrimaryImage } from '@/lib/eventImages';

const BookingCard = ({ booking }) => {
  const event = booking.event_id;
  const eventImage = getEventPrimaryImage(event);

  if (!event) return null;

  const handleDownload = () => {
    try {
      downloadTicketPdf({ booking, event });
    } catch (error) {
      toast.error(error.message || 'Unable to download ticket.');
    }
  };

  const handleShare = async () => {
    try {
      await shareTicketPdf({ booking, event });
    } catch (error) {
      if (error?.name === 'AbortError') {
        return;
      }

      toast.error(error.message || 'Unable to share ticket.');
    }
  };

  return (
    <div className="glass rounded-xl shadow-lg overflow-hidden flex flex-col items-center relative">
      {eventImage && (
        <img
          src={eventImage}
          alt={event.title}
          className="w-3/4 h-56 max-h-56 object-cover object-center rounded-lg mt-6 shadow-lg border-1 bg-white"
        />
      )}

      <div className="p-6 flex flex-col flex-1 w-full items-center">
        <h3 className="text-xl font-bold text-white mb-2 text-center">{event.title}</h3>

        <div className="flex flex-wrap items-center gap-2 text-blue-200 text-sm mb-2 justify-center">
          {event.eventType && (
            <span className="bg-blue-700 text-white px-2 py-0.5 rounded-full text-xs font-semibold">
              {event.eventType}
            </span>
          )}
          <span>
            {new Date(event.eventDateTime[0]).toLocaleString('en-IN', {
              dateStyle: 'medium',
              timeStyle: 'short',
              timeZone: 'Asia/Kolkata'
            })}
          </span>
          <span>•</span>
          <span>{event.location}</span>
        </div>

        <div className="text-sm text-blue-100 mb-1">Seats: {booking.seats}</div>
        <div className="text-sm text-blue-100 mb-1">Paid: ₹{booking.paymentAmt}</div>

        <div className="text-sm font-semibold px-2 py-1 rounded text-yellow-300">
          Status: {booking.event_status}
        </div>

        <div className="mt-5 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={handleDownload}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/8 px-4 py-3 font-semibold text-white shadow-[0_10px_30px_rgba(15,23,42,0.2)] backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300/45 hover:bg-emerald-500/18"
          >
            <Download className="h-4 w-4" />
            Download Ticket
          </button>
          <button
            onClick={handleShare}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/8 px-4 py-3 font-semibold text-white shadow-[0_10px_30px_rgba(15,23,42,0.2)] backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-300/45 hover:bg-sky-500/18"
          >
            <Share2 className="h-4 w-4" />
            Share Ticket
          </button>
        </div>

        <Link to={`/events/${event._id}`}>
          <button className="mt-4 w-full rounded-xl border border-blue-300/25 bg-blue-600/80 px-4 py-3 text-white font-semibold shadow-lg shadow-blue-950/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-600">
            View Event
          </button>
        </Link>
      </div>
    </div>
  );
};

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API}/events/get-my-bookings`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      setBookings(res.data.bookings);
    } catch (error) {
      console.log("Failed to fetch bookings", error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  return (
    <div className="app-page min-h-screen">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200/70">Attendee</p>
        <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">My Bookings</h1>
      </div>
      {loading ? (
        <p className="text-blue-200 text-center mt-10">Loading bookings...</p>
      ) : bookings.length === 0 ? (
        <p className="text-blue-200 text-center mt-10">You haven't booked any events yet.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {bookings.map((booking) => (
            <BookingCard key={booking._id} booking={booking} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBookings;
