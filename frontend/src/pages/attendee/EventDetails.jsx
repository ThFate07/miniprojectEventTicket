import React, { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Link, useParams } from 'react-router-dom';
import { userStore } from '@/context/userContext';
import { getEventImages, getEventPrimaryImage } from '@/lib/eventImages';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, Play, Ticket, Users } from 'lucide-react';
import { canRegisterForEvent } from '@/lib/auth';
import { formatEventDate, formatEventSchedule } from '@/lib/utils';

const EventDetails = () => {
  const [event, setEvent] = useState({});
  const [selectedImage, setSelectedImage] = useState('');
  const [open, setOpen] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState('');
  const [loadingReviews, setLoadingReviews] = useState(false);
  const { id } = useParams();
  const videoRef = useRef(null);
  const user = userStore((state) => state.user);

  const eventImages = getEventImages(event);
  const canRegister = Boolean(
    event?.isFinalized &&
    event?.lifecycleState === 'registration_open' &&
    canRegisterForEvent(user, event) &&
    Number(event?.remainingTicketsForCurrentUser ?? event?.maxTicketsPerStudent ?? 1) > 0
  );
  const primaryDate = event.eventDateTime?.[0] || event.tentativeDate || event.finalDate;
  const scheduleLabel = formatEventSchedule({ date: primaryDate, isFinalized: event.isFinalized, includeTime: event.isFinalized });

  const fetchEvent = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API}/events/get-events/${id}`);
      setEvent(response.data.event);
    } catch (error) {
      console.error('Error fetching event details', error);
      toast.error(error.response?.data?.message || 'Unable to load this event right now.');
    }
  };

  const fetchReviews = async () => {
    try {
      setLoadingReviews(true);
      const res = await axios.get(`${import.meta.env.VITE_API}/review/getreviews/${id}`);
      const positiveReviews = res.data.data.positive || [];
      const neutralReviews = res.data.data.neutral || [];
      const negativeReviews = res.data.data.negative || [];
      const mergedReviews = [...positiveReviews, ...neutralReviews, ...negativeReviews].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setReviews(mergedReviews);
    } catch (err) {
      console.error("Error fetching reviews", err);
      toast.error(err.response?.data?.message || 'Unable to load reviews right now.');
    } finally {
      setLoadingReviews(false);
    }
  };

  const submitReview = async () => {
    if (!newReview.trim()) {
      toast.error('Write a review before posting.');
      return;
    }

    try {
      await axios.post(`${import.meta.env.VITE_API}/review/addreview`, {
        event_id: id,
        review: newReview,
      });
      setNewReview('');
      toast.success('Review posted successfully.');
      fetchReviews();
    } catch (err) {
      console.error("Error submitting review", err);
      toast.error(err.response?.data?.message || 'Unable to submit your review.');
    }
  };

  const showPreviousImage = () => {
    if (eventImages.length <= 1) return;
    const currentIndex = Math.max(eventImages.indexOf(selectedImage), 0);
    const previousIndex = (currentIndex - 1 + eventImages.length) % eventImages.length;
    setSelectedImage(eventImages[previousIndex]);
  };

  const showNextImage = () => {
    if (eventImages.length <= 1) return;
    const currentIndex = Math.max(eventImages.indexOf(selectedImage), 0);
    const nextIndex = (currentIndex + 1) % eventImages.length;
    setSelectedImage(eventImages[nextIndex]);
  };

  useEffect(() => {
    fetchEvent();
    fetchReviews();
  }, []);

  useEffect(() => {
    setSelectedImage(getEventPrimaryImage(event));
  }, [event]);

  useEffect(() => {
    if (!open && videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  }, [open]);

  return (
    <div className="app-page space-y-8 py-8 sm:py-10">
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="section-card overflow-hidden p-4 sm:p-5">
          <div className="relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#0f1116]">
            <img
              src={selectedImage || event.banner}
              alt={event.title}
              className="h-[300px] w-full object-cover object-center sm:h-[380px] lg:h-[460px]"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-5 py-5">
              <p className="text-xs uppercase tracking-[0.24em] text-[#f4d58d]">
                {event.isFinalized ? 'Finalized event' : 'Upcoming plan'}
              </p>
              <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{event.title}</h1>
            </div>
          </div>

          {eventImages.length > 1 && (
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={showPreviousImage}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/6 text-white transition hover:bg-white/10"
                aria-label="Show previous event image"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="grid flex-1 grid-cols-4 gap-2 sm:grid-cols-5">
                {eventImages.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setSelectedImage(image)}
                    className={`overflow-hidden rounded-2xl border transition ${selectedImage === image ? 'border-[#f4d58d]' : 'border-white/10 hover:border-white/25'}`}
                    aria-label={`Show event image ${index + 1}`}
                  >
                    <img src={image} alt={`${event.title} ${index + 1}`} className="h-16 w-full object-cover" />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={showNextImage}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/6 text-white transition hover:bg-white/10"
                aria-label="Show next event image"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="section-card p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#f4d58d] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-950">
                {event.isFinalized ? 'Confirmed' : 'Approximate'}
              </span>
              <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs uppercase tracking-[0.22em] text-blue-100">
                {event.lifecycleState || event.status || 'tentative'}
              </span>
              {event.visibilityScope && (
                <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs uppercase tracking-[0.22em] text-blue-100">
                  {event.visibilityScope} audience
                </span>
              )}
            </div>

            <p className="text-base leading-7 text-blue-100/82">
              {event.description || 'More details will be shared by the organizing committee soon.'}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-[#f4d58d]" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-blue-100/55">Schedule</p>
                    <p className="mt-1 font-medium text-white">{scheduleLabel}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-[#2cc4b0]" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-blue-100/55">Location</p>
                    <p className="mt-1 font-medium text-white">{event.location || 'Venue to be confirmed'}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
                <div className="flex items-center gap-3">
                  <Ticket className="h-5 w-5 text-[#65c9ff]" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-blue-100/55">Access</p>
                    <p className="mt-1 font-medium text-white">
                      {Number(event.cost || 0) > 0 ? `₹${event.cost} per ticket` : 'Free registration'}
                    </p>
                    <p className="mt-1 text-sm text-blue-200/75">
                      Max {event.maxTicketsPerStudent || 1} ticket{Number(event.maxTicketsPerStudent || 1) > 1 ? 's' : ''} per student
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-[#f07c52]" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-blue-100/55">Hosted by</p>
                    <p className="mt-1 font-medium text-white">{event.committeeId?.name || event.organizerId?.username || 'Campus organizer'}</p>
                  </div>
                </div>
              </div>
            </div>

            {Array.isArray(event.eventDateTime) && event.eventDateTime.length > 1 && event.isFinalized && (
              <div className="mt-5 rounded-[1.4rem] border border-white/10 bg-[#0f141d] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-blue-100/55">All showtimes</p>
                <div className="mt-3 space-y-2">
                  {event.eventDateTime.map((date, index) => (
                    <div key={`${date}-${index}`} className="flex items-center gap-3 text-sm text-blue-100">
                      <Clock3 className="h-4 w-4 text-[#f4d58d]" />
                      <span>{formatEventDate(date, { includeTime: true, dateStyle: 'long' })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {event.trailer && (
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto">
                      <Play className="h-4 w-4" />
                      Watch trailer
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-full max-w-5xl overflow-hidden border-white/10 bg-[#090b10] p-0">
                    <div className="w-full" style={{ aspectRatio: '16/9' }}>
                      <video
                        ref={videoRef}
                        width="100%"
                        height="100%"
                        controls
                        autoPlay
                        onEnded={() => setOpen(false)}
                        className="h-full w-full bg-black"
                      >
                        <source src={event.trailer} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              <Link to={canRegister ? `/seats/${id}` : '#'} className="w-full sm:w-auto">
                <Button
                  disabled={!canRegister}
                  className="w-full sm:w-auto"
                >
                  {canRegister ? (Number(event.cost || 0) > 0 ? 'Buy tickets' : 'Register now') : 'Planning stage'}
                </Button>
              </Link>
            </div>

            {!canRegister && (
              <p className="mt-4 text-sm text-amber-300">
                {event?.isFinalized && event?.lifecycleState === 'registration_open'
                  ? 'Join your college workspace and matching audience scope to register for this event.'
                  : 'Registration opens after the event is finalized and moved to the registration stage.'}
              </p>
            )}
            {canRegister && event.remainingTicketsForCurrentUser === 0 && (
              <p className="mt-4 text-sm text-amber-300">
                You have already reached the student ticket limit for this event.
              </p>
            )}
          </div>

          <div className="section-card p-5 sm:p-6">
            <p className="campus-label">Quick read</p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-blue-100/80">
              <p>Upcoming events show an approximate date until the organizing team locks the final schedule.</p>
              <p>Once finalized, this page updates with the exact date, registration state, and booking flow.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="section-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="campus-label">Reviews</p>
              <h2 className="mt-2 text-2xl font-bold text-white">What people are saying</h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-sm text-blue-100">
              {reviews.length} posts
            </span>
          </div>

          <div className="mt-5 space-y-4">
            <Textarea
              value={newReview}
              onChange={(e) => setNewReview(e.target.value)}
              placeholder="Share a quick thought about this event..."
            />
            <div className="flex justify-end">
              <Button onClick={submitReview}>Post review</Button>
            </div>
          </div>
        </div>

        <div className="section-card p-5 sm:p-6">
          <div className="max-h-[520px] space-y-4 overflow-y-auto pr-1">
            {loadingReviews ? (
              <p className="text-blue-300">Loading reviews...</p>
            ) : reviews.length === 0 ? (
              <p className="text-blue-300">No reviews yet. Be the first to add one.</p>
            ) : (
              reviews.map((review) => (
                <div key={review._id} className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-semibold text-[#f4d58d]">{review?.user_id?.username || 'Anonymous'}</span>
                    <span className="text-xs uppercase tracking-[0.18em] text-blue-100/45">
                      {formatEventDate(review.createdAt, { includeTime: false, dateStyle: 'medium' })}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-blue-100/88">{review.review}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default EventDetails
