import { Input } from '@/components/ui/input';
import axios from 'axios';
import React from 'react'
import { useState } from 'react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';

// Gold glowing animation with reduced shine
const goldGlowStyle = `
@keyframes glow-gold {
  0%, 100% { box-shadow: 0 0 6px #FFD70088, 0 0 10px #FFD70044; }
  50% { box-shadow: 0 0 12px #FFD700CC, 0 0 18px #FFD70066; }
}
.animate-glow-gold {
  animation: glow-gold 3s ease-in-out infinite alternate;
}

@keyframes glow-silver {
  0%, 100% { box-shadow: 0 0 6px #C0C0C088, 0 0 10px #C0C0C044; }
  50% { box-shadow: 0 0 12px #C0C0C0CC, 0 0 18px #C0C0C066; }
}
.animate-glow-silver {
  animation: glow-silver 3s ease-in-out infinite alternate;
}

@keyframes glow-blue {
  0%, 100% { box-shadow: 0 0 6px #3B82F688, 0 0 10px #3B82F644; }
  50% { box-shadow: 0 0 12px #3B82F6CC, 0 0 18px #3B82F677; }
}
.animate-glow-blue {
  animation: glow-blue 3s ease-in-out infinite alternate;
}

@keyframes glow-purple {
  0%, 100% { box-shadow: 0 0 6px #A21CAF88, 0 0 10px #A21CAF44; }
  50% { box-shadow: 0 0 12px #A21CAFCC, 0 0 18px #A21CAF66; }
}
.animate-glow-purple {
  animation: glow-purple 3s ease-in-out infinite alternate;
}
`;


const formatDate = (date) => {
  const dateObj = new Date(date);
  const day = dateObj.getDate();
  const month = dateObj.getMonth() + 1;
  const year = dateObj.getFullYear();
  return `${day}/${month}/${year}`;
}
function EventCard({ _id, title, date, category, location, image, description }) {
  return (
    <div
      className="glass rounded-xl shadow-xl min-h-[500px] overflow-hidden flex flex-col items-center relative transition-transform duration-300 hover:scale-[1.015] border-2"
    >
      <img
        src={image}
        alt={title}
        className="w-[90%] h-56 max-h-56 object-cover object-center rounded-lg mt-6 shadow-md bg-white"
      />
      <div className="p-6 flex flex-col flex-1 w-full items-center gap-1">
        <h3 className="text-xl font-semibold text-white mb-2 text-center">{title}</h3>
        <div className="flex flex-wrap items-center gap-3 text-blue-100 text-sm mb-2 justify-center">
          <span className="bg-blue-700 text-white px-2 py-0.5 rounded-full text-xs font-medium">{category}</span>
          <span>•</span>
          <span>{formatDate(date)}</span>
        </div>
        <span className="text-blue-100 text-sm mb-2 text-center">
          {location.length > 30 ? location.slice(0, 30) + '...' : location}
        </span>
        <p className="text-blue-200/70 mb-4 text-center text-sm px-4">
          {description.length > 70 ? description.slice(0, 70) + '...' : description}
        </p>
        <Link to={`/events/${_id}`}>
          <button className="w-full bg-blue-700 hover:bg-blue-800 px-4 py-2 text-white font-medium rounded-lg shadow transition-all">
            Book Now
          </button>
        </Link>
      </div>
    </div>
  );
}


const Events = () => {
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState("All");
  const categories = ["All", "Hackathon", "Live Show", "Meetup", "Webinar"];
  const [events , setEvents] = useState([]);

  const fetchEvent = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API}/events/get-events`)
        console.log(response.data);
        setEvents(response.data.events)
      } catch (error) {
        console.log(error.response.data.message)
        console.log(error)
      }
  }
  useEffect(() => {
    fetchEvent();
  },[])
  // Filter and search logic
  const now = new Date();
  const filteredEvents = events?.filter((event) => {
    const matchesCategory = filter === "All" || event.eventType === filter;
    const matchesSearch = event.title.toLowerCase().includes(search.toLowerCase()) || event.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      <style>{goldGlowStyle}</style>
      <div className="min-h-screen px-4 py-5 bg-transparent flex flex-col items-center">
        <p className='text-white text-3xl font-bold self-start px-20 py-4'>Events</p>
        <div className="w-full px-20 mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col w-1/2">
            <label htmlFor="search" className="text-white mb-1">Search</label>
            <Input
              id="search"
              type="text"
              placeholder="Search events..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-12 text-white border-white/40 placeholder:text-white/60"
            />
          </div>
          <div className="flex flex-col w-1/4">
            <label htmlFor="category" className="text-white mb-1">Category</label>
            <select
              id="category"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="px-2 h-12 text-white placeholder:text-white/60 border-1 rounded-md border-white/40"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="w-full px-20 grid gap-8 grid-cols-1 md:grid-cols-3">
          {filteredEvents.length === 0 ? (
            <div className="col-span-full text-center text-blue-200">No events found.</div>
          ) : (
            filteredEvents.map((event) => (
              <EventCard
                _id = {event._id}
                title={event.title}
                date={event.eventDateTime[0]}
                category={event.eventType}
                location={event.location}
                image={event.image}
                description={event.description}
              />
            ))
          )}
        </div>
      </div>
    </>
  )
}

export default Events
