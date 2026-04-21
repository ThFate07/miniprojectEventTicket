import { Input } from '@/components/ui/input';
import axios from 'axios';
import React from 'react'
import { useState } from 'react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getEventPrimaryImage } from '@/lib/eventImages';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { formatEventSchedule } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { userStore } from '@/context/userContext';
import { canManageEvent, isOrganizerRole } from '@/lib/auth';

function EventCard({ _id, title, date, location, image, description, lifecycleState, isFinalized, visibilityScope, isManaged }) {
  return (
    <div
      className="event-card-surface min-h-[460px] overflow-hidden flex flex-col items-center relative p-4 transition-transform duration-300 hover:scale-[1.015]"
    >
      <img
        src={image}
        alt={title}
        loading="lazy"
        decoding="async"
        className="h-52 w-full rounded-[1.25rem] object-cover object-center shadow-md bg-white sm:h-56"
      />
      <div className="flex flex-col flex-1 w-full items-center gap-1 px-2 pb-2 pt-5 sm:px-4">
        <h3 className="text-xl font-semibold text-white mb-2 text-center">{title}</h3>
        <div className="flex flex-wrap items-center gap-3 text-blue-100 text-sm mb-2 justify-center">
          {isManaged && (
            <>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-sky-500 text-slate-950">
                Your committee
              </span>
              <span>•</span>
            </>
          )}
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isFinalized ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-slate-950'}`}>
            {isFinalized ? 'Confirmed' : 'Upcoming'}
          </span>
          <span>•</span>
          <span>{formatEventSchedule({ date, isFinalized, includeTime: false })}</span>
        </div>
        <span className="mb-2 rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-blue-100">
          {lifecycleState || (isFinalized ? 'registration_open' : 'tentative')}
        </span>
        <span className="mb-2 rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-blue-100/80">
          {visibilityScope || 'global'}
        </span>
        <span className="text-blue-100 text-sm mb-2 text-center">
          {location.length > 30 ? location.slice(0, 30) + '...' : location}
        </span>
        <p className="text-blue-200/70 mb-4 text-center text-sm px-4">
          {description.length > 70 ? description.slice(0, 70) + '...' : description}
        </p>
        <Link to={`/events/${_id}`}>
          <button className="w-full bg-blue-700 hover:bg-blue-800 px-4 py-2 text-white font-medium rounded-lg shadow transition-all">
            {isFinalized ? 'View & Register' : 'View Plan'}
          </button>
        </Link>
      </div>
    </div>
  );
}


const Events = () => {
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState("All");
  const [showFilters, setShowFilters] = React.useState(false);
  const categories = ["All", "Upcoming", "Confirmed"];
  const [events , setEvents] = useState([]);
  const user = userStore((state) => state.user);
  const organizer = isOrganizerRole(user?.role);

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
  const filteredEvents = events?.filter((event) => {
    const normalizedCategory = event.isFinalized ? "Confirmed" : "Upcoming";
    const matchesCategory = filter === "All" || normalizedCategory === filter;
    const matchesSearch = event.title.toLowerCase().includes(search.toLowerCase()) || event.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const managedEvents = filteredEvents.filter((event) => canManageEvent(user, event));
  const campusEvents = filteredEvents.filter((event) => !canManageEvent(user, event));
  const upcomingEvents = campusEvents.filter((event) => !event.isFinalized);
  const confirmedEvents = campusEvents.filter((event) => event.isFinalized);
  const managedUpcomingEvents = managedEvents.filter((event) => !event.isFinalized);
  const managedConfirmedEvents = managedEvents.filter((event) => event.isFinalized);

  const renderEventGrid = (list, managed = false) => (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {list.map((event) => (
        <EventCard
          key={event._id}
          _id={event._id}
          title={event.title}
          date={event.eventDateTime?.[0] || event.tentativeDate || event.finalDate}
          location={event.location}
          image={getEventPrimaryImage(event)}
          description={event.description}
          lifecycleState={event.lifecycleState}
          isFinalized={event.isFinalized}
          visibilityScope={event.visibilityScope}
          isManaged={managed}
        />
      ))}
    </div>
  );

  return (
    <div className="app-page min-h-screen">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="campus-label">{organizer ? 'Campus + Committee View' : 'Student View'}</p>
            <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">Campus Event Calendar</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/75">
              {organizer
                ? 'Browse the same campus events students see, plus the events your committee manages in one place.'
                : 'Upcoming events are still in planning. Confirmed events have finalized dates and may open registration depending on the organizer state.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            className="inline-flex items-center justify-center gap-2 self-start rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white sm:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className="section-card mb-8 p-4 sm:p-5">
          <div className={`mobile-collapse-panel grid gap-4 ${showFilters ? 'max-h-[22rem] opacity-100' : 'max-h-0 opacity-0 sm:max-h-[22rem] sm:opacity-100'} sm:grid-cols-[minmax(0,1.5fr)_minmax(0,0.8fr)]`}>
            <div className="flex flex-col">
              <label htmlFor="search" className="mb-1 text-sm font-medium text-white">Search</label>
              <Input
                id="search"
                type="text"
                placeholder="Search events..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-12 text-white border-white/40 placeholder:text-white/60"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="category" className="mb-1 text-sm font-medium text-white">Show</label>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Choose filter" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="text-center text-blue-200">No events found.</div>
        ) : (
          <div className="space-y-10">
            {organizer && managedEvents.length > 0 && (
              <section>
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="campus-label">Organizer View</p>
                    <h2 className="mt-2 text-2xl font-bold text-white">Your Committee Events</h2>
                  </div>
                  <p className="text-sm text-blue-100/70">{managedEvents.length} managed</p>
                </div>
                <div className="space-y-8">
                  {(filter === 'All' || filter === 'Upcoming') && managedUpcomingEvents.length > 0 && (
                    <section>
                      <div className="mb-4 flex items-end justify-between gap-4">
                        <div>
                          <p className="campus-label">Upcoming</p>
                          <h3 className="mt-2 text-xl font-bold text-white">Planning Committee Events</h3>
                        </div>
                        <p className="text-sm text-blue-100/70">{managedUpcomingEvents.length} visible</p>
                      </div>
                      {renderEventGrid(managedUpcomingEvents, true)}
                    </section>
                  )}
                  {(filter === 'All' || filter === 'Confirmed') && managedConfirmedEvents.length > 0 && (
                    <section>
                      <div className="mb-4 flex items-end justify-between gap-4">
                        <div>
                          <p className="campus-label">Confirmed</p>
                          <h3 className="mt-2 text-xl font-bold text-white">Finalized Committee Events</h3>
                        </div>
                        <p className="text-sm text-blue-100/70">{managedConfirmedEvents.length} visible</p>
                      </div>
                      {renderEventGrid(managedConfirmedEvents, true)}
                    </section>
                  )}
                </div>
              </section>
            )}

            {(filter === 'All' || filter === 'Upcoming') && (
              <section>
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="campus-label">Upcoming</p>
                    <h2 className="mt-2 text-2xl font-bold text-white">{organizer ? 'Planning Campus Events' : 'Planning Events'}</h2>
                  </div>
                  <p className="text-sm text-blue-100/70">{upcomingEvents.length} visible</p>
                </div>
                {upcomingEvents.length > 0 ? (
                  renderEventGrid(upcomingEvents)
                ) : (
                  <div className="section-card p-6 text-blue-200">No upcoming planning events match your search.</div>
                )}
              </section>
            )}

            {(filter === 'All' || filter === 'Confirmed') && (
              <section>
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="campus-label">Confirmed</p>
                    <h2 className="mt-2 text-2xl font-bold text-white">{organizer ? 'Finalized Campus Events' : 'Finalized Events'}</h2>
                  </div>
                  <p className="text-sm text-blue-100/70">{confirmedEvents.length} visible</p>
                </div>
                {confirmedEvents.length > 0 ? (
                  renderEventGrid(confirmedEvents)
                ) : (
                  <div className="section-card p-6 text-blue-200">No confirmed events match your search.</div>
                )}
              </section>
            )}
          </div>
        )}
      </div>
  )
}

export default Events
