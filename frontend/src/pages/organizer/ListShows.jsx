import React, { useEffect, useState } from 'react';
import { Calendar, MapPin, Clock, Eye, Edit, Trash2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const ListShows = () => {
  const [shows, setShows] = useState([]);
  const navigate = useNavigate();

  // Fetch shows from backend
  useEffect(() => {
    const fetchShows = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API}/events/get-my-events`, { withCredentials: true });
        setShows(res.data.events || []);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to fetch shows');
      }
    };
    fetchShows();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'upcoming':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  // View handler
  const handleView = (id) => {
    navigate(`/organizer/show/${id}`); // You can create a ShowDetails page for this route
  };

  // Edit handler
  const handleEdit = (id) => {
    navigate(`/organizer/edit-event/${id}`); // You can create an EditEvent page for this route
  };

  // Delete handler
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API}/events/delete-my-event/${id}`, { withCredentials: true });
      toast.success('Event deleted!');
      setShows(shows.filter(show => show._id !== id));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete event');
    }
  };

  return (
    <div className="min-h-screen text-white">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200/70">Organizer</p>
          <h1 className="mt-2 text-3xl font-bold text-blue-300 sm:text-4xl">Your Shows</h1>
        </div>
        <p className="max-w-xl text-sm leading-6 text-blue-100/80">
          Review performance, open event details, or jump into edits without the action buttons collapsing off-screen.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {shows.map((show) => (
          <div key={show._id} className="section-card overflow-hidden rounded-[1.5rem]">
            <img src={show.banner} alt={show.title} className="w-full h-48 object-cover" />
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-2">{show.title}</h3>
              <p className="text-blue-200 text-sm flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4" /> {show.eventDateTime && show.eventDateTime.length > 0
                  ? new Date(show.eventDateTime[0]).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                  : 'N/A'}
              </p>
              <p className="text-blue-300 text-xs flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4" /> {show.location}
              </p>

              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-blue-200">Status:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(show.status)}`}>
                  {show.status?.charAt(0).toUpperCase() + show.status?.slice(1)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm mb-4">
                <span className="text-blue-200">Bookings:</span>
                <span className="font-semibold text-white">{show.totalBookings}</span>
              </div>
              <div className="flex justify-between items-center text-sm mb-4">
                <span className="text-blue-200">Revenue:</span>
                <span className="font-semibold text-white">₹{show.totalRevenue}</span>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <button onClick={() => handleView(show._id)} className="flex items-center justify-center gap-2 rounded-lg border border-blue-600 py-2 font-bold text-blue-400 transition-colors hover:bg-blue-900/20">
                  <Eye className="w-4 h-4" /> View
                </button>
                <button onClick={() => handleEdit(show._id)} className="flex items-center justify-center gap-2 rounded-lg border border-yellow-600 py-2 font-bold text-yellow-400 transition-colors hover:bg-yellow-900/20">
                  <Edit className="w-4 h-4" /> Edit
                </button>
                <button onClick={() => handleDelete(show._id)} className="flex items-center justify-center gap-2 rounded-lg border border-red-600 py-2 font-bold text-red-400 transition-colors hover:bg-red-900/20">
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ListShows;