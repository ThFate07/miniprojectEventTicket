import React from 'react'
import { Dialog, DialogTrigger, DialogContent, DialogClose } from '@/components/ui/dialog';
import { useState } from 'react';
import { useRef } from 'react';
import { useEffect } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import { userStore } from '@/context/userContext';
import { getEventImages, getEventPrimaryImage } from '@/lib/eventImages';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const EventDetails = () => {
  // Example event/movie data
  const [event , setEvent] = useState({});
  const [selectedImage, setSelectedImage] = useState('');
  const {id} = useParams();
  const fetchEvent = async () => {
    console.log(id);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API}/events/get-events/${id}`);
      console.log(response.data)
      setEvent(response.data.event);
    } catch (error) {
      console.log(error)
    }
  }

  const [open, setOpen] = useState(false);
  const videoRef = useRef(null);

  const [reviews, setReviews] = useState([]);
const [newReview, setNewReview] = useState('');
const [loadingReviews, setLoadingReviews] = useState(false);

// Replace this with real user ID (from auth)
const user = userStore((state) => state.user);
console.log(user)
const eventImages = getEventImages(event);

const showPreviousImage = () => {
  if (eventImages.length <= 1) {
    return;
  }

  const currentIndex = Math.max(eventImages.indexOf(selectedImage), 0);
  const previousIndex = (currentIndex - 1 + eventImages.length) % eventImages.length;
  setSelectedImage(eventImages[previousIndex]);
};

const showNextImage = () => {
  if (eventImages.length <= 1) {
    return;
  }

  const currentIndex = Math.max(eventImages.indexOf(selectedImage), 0);
  const nextIndex = (currentIndex + 1) % eventImages.length;
  setSelectedImage(eventImages[nextIndex]);
};

// Fetch reviews
const fetchReviews = async () => {
  try {
    setLoadingReviews(true);
    const res = await axios.get(`${import.meta.env.VITE_API}/review/getreviews/${id}`);
    const positiveReviews = res.data.data.positive || [];
    const neutralReviews = res.data.data.neutral || [];
    const negativeReviews = res.data.data.negative || [];
    setReviews(positiveReviews || neutralReviews || negativeReviews);
  } catch (err) {
    console.error("Error fetching reviews", err);
  } finally {
    setLoadingReviews(false);
  }
};

// Submit review
const submitReview = async () => {
  if (!newReview.trim()) return;

  try {
    await axios.post(`${import.meta.env.VITE_API}/review/addreview`, {
      user_id: user.id,
      event_id: id,
      review: newReview,
    });
    setNewReview('');
    fetchReviews(); // refresh list
  } catch (err) {
    console.error("Error submitting review", err);
  }
};


  // Reset video when dialog closes
  useEffect(()=> {
    fetchEvent();
    fetchReviews();
  },[])

  useEffect(() => {
    setSelectedImage(getEventPrimaryImage(event));
  }, [event]);

  useEffect(() => {
    if (!open && videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  }, [open]);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Banner background */}
      <div
        className="absolute inset-0 z-0 bg-black/90"
        style={{
          backgroundImage: `url(${event.banner})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(4px) brightness(1)',
        }}
      />
      <div className="absolute inset-0 bg-black/70 z-10" />
      {/* Main content */}
      <div className="app-page relative z-20 my-8 flex w-full max-w-6xl flex-col gap-8 py-8 md:my-10 md:flex-row md:items-start lg:gap-10 lg:py-12">
        {/* Poster */}
        <div className="w-full md:w-1/2 flex-shrink-0 space-y-4">
          <div className="relative overflow-hidden rounded-2xl border-2 border-amber-500/40 bg-black/20 shadow-4xl">
            <img
              src={selectedImage || event.banner}
              alt={event.title}
              className="w-full max-h-[32rem] object-cover object-center transition-all duration-300"
            />
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-blue-100/80">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={showPreviousImage}
                disabled={eventImages.length <= 1}
                className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/30 px-4 py-2 text-white transition hover:bg-black/45 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Show previous event image"
              >
                <ChevronLeft className="h-5 w-5" />
                <span>Prev</span>
              </button>
              <span className="text-center text-xs uppercase tracking-[0.3em] text-blue-200/70">
                {eventImages.length > 0 ? `${Math.max(eventImages.indexOf(selectedImage), 0) + 1} / ${eventImages.length}` : '0 / 0'}
              </span>
              <button
                type="button"
                onClick={showNextImage}
                disabled={eventImages.length <= 1}
                className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/30 px-4 py-2 text-white transition hover:bg-black/45 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Show next event image"
              >
                <span>Next</span>
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            {eventImages.length > 0 && (
              <div className="flex items-center justify-center gap-2">
                {eventImages.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setSelectedImage(image)}
                    aria-label={`Show event image ${index + 1}`}
                    className={`h-2.5 w-8 rounded-full transition-all ${selectedImage === image ? 'bg-white' : 'bg-white/25 hover:bg-white/55'}`}
                  />
                ))}
              </div>
            )}
            <div className="text-center text-blue-200/75">
              {eventImages.length > 1 ? 'Use Prev and Next to browse all event images.' : 'Only one event image is available for this event.'}
            </div>
          </div>
        </div>
        {/* Details */}
        <div className="flex-1 flex flex-col items-center text-center md:items-start md:text-left">
          <span className="uppercase text-blue-400 font-semibold tracking-widest mb-2">{event.status}</span>
          <h1 className="text-3xl font-bold text-white mb-2 sm:text-4xl md:text-5xl">{event.title}</h1>
          <p className="text-blue-100 mb-6 max-w-2xl">{event.description}</p>
          {eventImages.length > 1 && (
            <p className="text-sm text-blue-200/80 mb-4">{eventImages.length} event photos available</p>
          )}
          <div className="text-blue-200 font-medium mb-8">
          {event.eventDateTime && event.eventDateTime.map((date, index)  => (
            <span key={index}>
                {new Date(date).toLocaleString("en-IN", {
                dateStyle: "long",
                timeStyle: "short",
                timeZone: "Asia/Kolkata",
                })}
                {index < event.eventDateTime.length - 1 && <>, </>}
            </span>
            ))}
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-center md:justify-start">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <button className="w-full rounded-lg bg-blue-900 px-6 py-3 font-semibold text-white shadow transition-colors hover:bg-blue-800 sm:w-auto">Watch Trailer</button>
              </DialogTrigger>
              <DialogContent className="bg-black max-w-4xl w-full flex flex-col items-center p-0 overflow-hidden">
                <div className="w-full" style={{ aspectRatio: '16/7' }}>
                  <video
                    ref={videoRef}
                    width="100%"
                    height="100%"
                    controls
                    autoPlay
                    onEnded={() => setOpen(false)}
                    className="w-full h-full rounded-t-lg bg-black"
                  >
                    <source src={event.trailer} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              </DialogContent>
            </Dialog>
            <Link to={`/seats/${id}`} className="w-full sm:w-auto"><button className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow transition-colors hover:bg-blue-700">Buy Tickets</button></Link>
            <button className="flex w-full items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 py-3 font-semibold text-white shadow transition-colors hover:bg-white/20 sm:w-auto"><span className="text-xl">♡</span></button>
          </div>
        </div>
      </div>
      {/* Reviews Section */}
      <div className="app-page relative z-20 w-full max-w-4xl py-4 sm:py-8">
        <h2 className="text-2xl font-bold text-white mb-4">Reviews</h2>

        {/* Add New Review */}
        <div className="bg-white/5 p-4 rounded-lg border border-white/10 mb-6">
          <textarea
            value={newReview}
            onChange={(e) => setNewReview(e.target.value)}
            placeholder="Add a public comment..."
            className="w-full p-3 bg-black/30 text-white rounded-lg border border-white/20 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            rows={3}
          />
          <div className="mt-2 flex justify-end">
            <button
              onClick={submitReview}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg shadow transition-all"
            >
              Post
            </button>
          </div>
          <div className="space-y-4 max-h-[300px] mt-4 overflow-y-auto pr-2">
          {loadingReviews ? (
            <p className="text-blue-300">Loading reviews...</p>
          ) : reviews.length === 0 ? (
            <p className="text-blue-300">No reviews yet. Be the first to add one!</p>
          ) : (
            reviews.map((review, index) => (
              <div key={index} className="bg-white/5 p-3 rounded-lg border border-white/10">
                <span className="text-lg text-blue-400 mt-1 block">{user.username}</span>
                <p className="text-blue-100 text-sm mt-1">{review.review}</p>
              </div>
            ))
          )}
        </div>
        </div>

        {/* Review List */}
        
      </div>

    </div>
  )
}

export default EventDetails
