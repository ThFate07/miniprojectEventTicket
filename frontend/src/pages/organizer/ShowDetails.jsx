import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Calendar, MapPin, DollarSign, Users, Info } from 'lucide-react';
import { getEventImages, getEventPrimaryImage } from '@/lib/eventImages';

const ShowDetails = () => {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [selectedImage, setSelectedImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const eventImages = getEventImages(event);

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API}/events/get-my-events/${id}`, { withCredentials: true });
        setEvent(res.data.event);
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch event details');
        toast.error(err.response?.data?.message || 'Failed to fetch event details');
        setLoading(false);
      }
    };
    fetchEventDetails();
  }, [id]);

  useEffect(() => {
    setSelectedImage(getEventPrimaryImage(event));
  }, [event]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white text-xl">
        Loading event details...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-400 text-xl">
        Error: {error}
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center text-yellow-400 text-xl">
        Event not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white">
      <div className="mx-auto max-w-4xl section-card overflow-hidden rounded-[1.75rem] p-4 shadow-xl sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-3xl font-bold text-blue-300 sm:text-4xl">{event.title}</h1>
          <Link to={`/organizer/edit-event/${event._id}`}>
            <button className="w-full rounded-lg bg-yellow-600 px-4 py-2 font-bold text-white transition-colors hover:bg-yellow-700 sm:w-auto">
              Edit Event
            </button>
          </Link>
        </div>

        <img src={event.banner} alt={event.title} className="w-full h-64 md:h-80 max-h-[20rem] object-cover rounded-lg mb-6 shadow-md" />
        {selectedImage && (
          <div className="mb-6 space-y-4">
            <img src={selectedImage} alt={`${event.title} gallery`} className="w-full max-h-[32rem] object-cover rounded-lg shadow-md" />
            {eventImages.length > 1 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {eventImages.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setSelectedImage(image)}
                    className={`overflow-hidden rounded-lg border transition-all ${selectedImage === image ? 'border-blue-400 shadow-md shadow-blue-500/20' : 'border-white/10 hover:border-blue-300/50'}`}
                  >
                    <img src={image} alt={`${event.title} ${index + 1}`} className="h-24 w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="text-blue-200 text-lg mb-4">{event.description}</p>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex items-center gap-3 text-base sm:text-lg">
            <Calendar className="w-6 h-6 text-blue-400" />
            <span>
              {event.eventDateTime && event.eventDateTime.length > 0
                ? new Date(event.eventDateTime[0]).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                : 'N/A'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-base sm:text-lg">
            <MapPin className="w-6 h-6 text-blue-400" />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center gap-3 text-base sm:text-lg">
            <Info className="w-6 h-6 text-blue-400" />
            <span>Type: {event.eventType}</span>
          </div>
          <div className="flex items-center gap-3 text-base sm:text-lg">
            <DollarSign className="w-6 h-6 text-green-400" />
            <span>Cost: ₹{event.cost}</span>
          </div>
          <div className="flex items-center gap-3 text-base sm:text-lg">
            <Users className="w-6 h-6 text-purple-400" />
            <span>Bookings: {event.totalBookings || 0}</span>
          </div>
          <div className="flex items-center gap-3 text-base sm:text-lg">
            <DollarSign className="w-6 h-6 text-green-400" />
            <span>Revenue: ₹{event.totalRevenue || 0}</span>
          </div>
          {event.certificate && (
            <div className="flex items-center gap-3 text-base sm:text-lg">
              <Info className="w-6 h-6 text-blue-400" />
              <span>Certificate Provided</span>
            </div>
          )}
        </div>

        <h2 className="text-2xl font-bold text-blue-300 mt-8 mb-4">Ticketing Information</h2>
        {event.seats?.type === 'general' ? (
          <p className="text-lg text-blue-200">General Admission Capacity: {event.seatMap?.length || event.seats?.value || 'N/A'}</p>
        ) : event.seats?.type === 'RowColumns' ? (
          <p className="text-lg text-blue-200">Seat Layout: {event.seats?.value || 'Rows x Columns'}</p>
        ) : (
          <p className="text-lg text-blue-200">Total Seats: {event.seatMap?.length || event.seats?.value || 'N/A'}</p>
        )}
        <p className="text-lg text-blue-200">Status: <span className="font-semibold">{event.status?.charAt(0).toUpperCase() + event.status?.slice(1)}</span></p>

        <div className="mt-8 text-center">
          <Link to="/organizer/list-shows">
            <button className="w-full rounded-lg bg-gray-600 px-6 py-2 font-bold text-white transition-colors hover:bg-gray-700 sm:w-auto">
              Back to Shows
            </button>
          </Link>
        </div>

      </div>
    </div>
  );
};

export default ShowDetails; 