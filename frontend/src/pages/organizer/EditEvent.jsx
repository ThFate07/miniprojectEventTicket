import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useParams, useNavigate } from 'react-router-dom';
import { getEventImages } from '@/lib/eventImages';

const eventTypes = ['Hackathon', 'Live Show'];
const totalSteps = 4;

const getTrimmedImages = (images) => images.map((image) => image.trim()).filter(Boolean);

const EditEvent = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    type: eventTypes[0],
    times: [''],
    date: '',
    banner: '',
    images: [''],
    certificate: false,
    personalized: false,
    cost: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API}/events/get-my-events/${id}`, { withCredentials: true });
        const eventData = res.data.event;
        if (eventData) {
          const eventDate = eventData.eventDateTime.length > 0 ? new Date(eventData.eventDateTime[0]).toISOString().split('T')[0] : '';
          const formattedTimes = eventData.eventDateTime.map(dt => new Date(dt).toTimeString().slice(0, 5));
          setForm({
            title: eventData.title,
            description: eventData.description,
            location: eventData.location,
            type: eventData.eventType,
            times: formattedTimes.length > 0 ? formattedTimes : [''],
            date: eventDate,
            banner: eventData.banner,
            images: getEventImages(eventData).length > 0 ? getEventImages(eventData) : [''],
            certificate: eventData.certificate || false,
            personalized: eventData.special === 'personalized',
            cost: eventData.cost,
          });
        }
        setLoading(false);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load event for editing');
        setLoading(false);
        navigate('/organizer/list-shows'); // Redirect if event not found or error
      }
    };
    fetchEvent();
  }, [id, navigate]);

  // Handlers
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSelectType = (value) => {
    setForm((prev) => ({ ...prev, type: value }));
  };

  const handleImageChange = (idx, value) => {
    setForm((prev) => {
      const images = [...prev.images];
      images[idx] = value;
      return { ...prev, images };
    });
  };

  const addImageField = () => {
    setForm((prev) => ({ ...prev, images: [...prev.images, ''] }));
  };

  const removeImageField = (idx) => {
    setForm((prev) => {
      if (prev.images.length === 1) {
        return { ...prev, images: [''] };
      }

      return {
        ...prev,
        images: prev.images.filter((_, imageIndex) => imageIndex !== idx),
      };
    });
  };

  const handleTimeChange = (idx, value) => {
    setForm((prev) => {
      const times = [...prev.times];
      times[idx] = value;
      return { ...prev, times };
    });
  };

  const addTime = () => setForm((prev) => ({ ...prev, times: [...prev.times, ''] }));
  const removeTime = (idx) => setForm((prev) => ({ ...prev, times: prev.times.filter((_, i) => i !== idx) }));

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => s - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation (similar to AddEvent.jsx)
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!form.description.trim()) {
      toast.error('Description is required');
      return;
    }
    if (!form.location.trim()) {
      toast.error('Location is required');
      return;
    }
    if (!form.banner.trim()) {
      toast.error('Banner image link is required');
      return;
    }
    const images = getTrimmedImages(form.images);

    if (images.length === 0) {
      toast.error('At least one gallery image link is required');
      return;
    }
    if (!form.cost || isNaN(form.cost) || Number(form.cost) < 0) {
      toast.error('Valid ticket cost is required');
      return;
    }
    if (!form.date) {
      toast.error('Event date is required');
      return;
    }
    if (form.times.some(time => !time)) {
      toast.error('All event timings must be filled');
      return;
    }
    

    // Combine date and times into eventDateTime array
    const eventDateTime = form.times.map(time => {
      const dateTimeString = `${form.date}T${time}:00`; // YYYY-MM-DDTHH:MM:SS
      return new Date(dateTimeString).toISOString();
    });


    const payload = {
      title: form.title,
      description: form.description,
      location: form.location,
      eventType: form.type,
      banner: form.banner,
      image: images[0],
      images,
      eventDateTime,
      cost: Number(form.cost),
      certificate: form.certificate,
      special: form.personalized ? 'personalized' : undefined,
    };

    try {
      const res = await axios.post(`${import.meta.env.VITE_API}/events/update-my-event/${id}`, payload, { withCredentials: true });
      toast.success('Event updated successfully!');
      navigate('/organizer/list-shows');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update event');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white text-xl">
        Loading event for editing...
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl text-white">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200/70">Organizer</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Edit Event</h1>
      </div>
      {/* Improved Progress Bar with Step Indicators */}
      <div className="mb-8">
        {/* Step Indicators */}
        <div className="overflow-x-auto pb-2">
          <div className="mb-4 flex min-w-[42rem] items-center justify-between">
          {[
            { label: 'Basic Info', step: 1 },
            { label: 'Schedule & Seats', step: 2 },
            { label: 'Options', step: 3 },
            { label: 'Review', step: 4 },
          ].map(({ label, step: s }, idx, arr) => (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center flex-1 min-w-0">
                <div
                  className={`w-8 h-8 flex items-center justify-center rounded-full border-2 transition-all duration-300
                    ${step === s ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : step > s ? 'bg-blue-400 border-blue-400 text-white' : 'bg-gray-800 border-blue-900 text-blue-300'}`}
                  aria-current={step === s ? 'step' : undefined}
                >
                  {step > s ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    s
                  )}
                </div>
                <span className={`mt-2 text-xs font-semibold text-center truncate ${step === s ? 'text-blue-300' : 'text-blue-200/60'}`}>{label}</span>
              </div>
              {idx < arr.length - 1 && (
                <div className={`flex-1 h-1 mx-1 ${step > s ? 'bg-blue-400' : 'bg-blue-900'} transition-all duration-300 rounded-full`} />
              )}
            </React.Fragment>
          ))}
          </div>
        </div>
        {/* Progress Bar */}
        <div className="text-blue-300 text-sm mt-2 text-right">Step {step} of {totalSteps}</div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-8 w-full">
        {/* Step 1: Basic Info + Banner */} 
        {step === 1 && (
          <div className="section-card flex w-full flex-col space-y-4 rounded-2xl px-4 py-6 sm:px-6 lg:px-10">
            <div>
              <label className="block mb-1 font-semibold text-xl">Title</label>
              <Input className="h-10 border-white/30" placeholder="e.g Github Hackathon" name="title" value={form.title} onChange={handleChange} required />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-xl">Description</label>
              <Textarea className="h-10 border-white/30" placeholder="e.g Problem Statement will be provided to team..." name="description" value={form.description} onChange={handleChange} required />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-xl">Location</label>
              <Input className="h-10 border-white/30" placeholder="e.g Nashik" name="location" value={form.location} onChange={handleChange} required />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-xl">Type of Event</label>
              <Select value={form.type} onValueChange={handleSelectType}>
                <SelectTrigger className="h-10 border-white/30">
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block mb-1 font-semibold text-xl">Banner Image Link</label>
              <Input className="h-10 border-white/30" placeholder="e.g https://..." name="banner" value={form.banner} onChange={handleChange} required />
            </div>
            <div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <label className="font-semibold text-xl">Gallery Image Links</label>
                    <p className="text-sm text-blue-200/70">Update all event photos here. The first image stays the default cover in listings.</p>
                  </div>
                  <Button type="button" variant="secondary" className="self-start bg-blue-700 px-4 hover:bg-blue-800 text-white" onClick={addImageField}>Add Image</Button>
                </div>
                <div className="space-y-3">
                  {form.images.map((image, idx) => (
                    <div key={idx} className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-blue-100">{idx === 0 ? 'Cover image' : `Gallery image ${idx + 1}`}</span>
                        {form.images.length > 1 && (
                          <Button type="button" variant="ghost" onClick={() => removeImageField(idx)} className="h-8 px-3 text-red-300 hover:bg-red-500/10 hover:text-red-200">
                            Remove
                          </Button>
                        )}
                      </div>
                      <Input
                        className="h-10 border-white/20"
                        placeholder="e.g https://..."
                        value={image}
                        onChange={(e) => handleImageChange(idx, e.target.value)}
                        required={idx === 0}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button className="bg-blue-700 hover:bg-blue-800 text-white" onClick={next}>Next</Button>
            </div>
          </div>
        )}
        {/* Step 2: Schedule, Seating, Cost */}
        {step === 2 && (
          <div className="section-card flex w-full flex-col space-y-4 rounded-2xl px-4 py-6 sm:px-6 lg:px-10">
            <label className="block mb-1 font-semibold text-xl">Event Date</label>
            <Input type="date" className="h-10 border-white/30" name="date" value={form.date} onChange={handleChange} required />
            <label className="block mb-1 font-semibold text-xl">Event Timings</label>
            {form.times.map((time, idx) => (
              <div key={idx} className="mb-2 flex flex-col gap-2 sm:flex-row">
                <Input type="time" className="h-10 border-white/30" value={time} onChange={e => handleTimeChange(idx, e.target.value)} required />
                {form.times.length > 1 && (
                  <Button type="button" variant="destructive" onClick={() => removeTime(idx)} className="px-2">Remove</Button>
                )}
              </div>
            ))}
            <Button type="button" variant="secondary" className="bg-blue-700 hover:bg-blue-800 text-white" onClick={addTime}>Add Time</Button>

            {/* --- MODIFICATION START: Hiding Seating Arrangement --- */}
            {/* <label className="block mb-1 font-semibold text-xl mt-4">Seating Arrangement</label>
            <div className="flex gap-4 mb-2">
              <label className="flex items-center gap-2">
                <Input type="radio" name="seatMode" value="rows-cols" checked={form.seatMode === 'rows-cols'} disabled /> Rows & Columns
              </label>
              <label className="flex items-center gap-2">
                <Input type="radio" name="seatMode" value="direct" checked={form.seatMode === 'direct'} disabled /> Direct Seat Count
              </label>
            </div>
            {form.seatMode === 'rows-cols' ? (
              <div className="flex gap-4">
                <Input name="rows" className="h-10 border-white/30" value={form.rows} type="number" min="1" placeholder="Rows" readOnly />
                <Input name="cols" className="h-10 border-white/30" value={form.cols} type="number" min="1" placeholder="Columns" readOnly />
              </div>
            ) : (
              <Input name="seats" className="h-10 border-white/30" value={form.seats} type="number" min="1" placeholder="Total Seats" readOnly />
            )}
            */}
            {/* --- MODIFICATION END --- */}

            <label className="block mb-1 font-semibold text-xl mt-4">Cost of Ticket (₹)</label>
            <Input className="h-10 border-white/30" placeholder="e.g 500" name="cost" value={form.cost} onChange={handleChange} type="number" min="0" required />
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button type="button" variant="secondary" className="bg-gray-700 hover:bg-gray-800 text-white" onClick={back}>Back</Button>
              <Button type="button" className="bg-blue-700 hover:bg-blue-800 text-white" onClick={next}>Next</Button>
            </div>
          </div>
        )}
        {/* Step 3: Options */}
        {step === 3 && (
          <div className="section-card flex w-full flex-col space-y-4 rounded-2xl px-4 py-6 sm:px-6 lg:px-10">
            <div className="flex items-center gap-2">
              <Checkbox id="certificate" name="certificate" checked={form.certificate} onCheckedChange={val => handleChange({ target: { name: 'certificate', type: 'checkbox', checked: val } })} />
              <label htmlFor="certificate" className="text-lg">Give certificate for participants</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="personalized" name="personalized" checked={form.personalized} onCheckedChange={val => handleChange({ target: { name: 'personalized', type: 'checkbox', checked: val } })} />
              <label htmlFor="personalized" className="text-lg">Need a personalized website</label>
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button type="button" variant="secondary" className="bg-gray-700 hover:bg-gray-800 text-white" onClick={back}>Back</Button>
              <Button type="button" className="bg-blue-700 hover:bg-blue-800 text-white" onClick={next}>Next</Button>
            </div>
          </div>
        )}
        {/* Step 4: Summary & Submit */}
        {step === 4 && (
          <div className="section-card flex w-full flex-col space-y-4 rounded-2xl px-4 py-6 sm:px-6 lg:px-10">
            <h2 className="text-2xl font-bold mb-4">Review & Submit</h2>
            <div className="rounded-xl border border-blue-400 bg-gray-900 p-4 text-sm leading-7 sm:text-base">
              <p><span className="font-semibold">Title:</span> {form.title}</p>
              <p><span className="font-semibold">Description:</span> {form.description}</p>
              <p><span className="font-semibold">Location:</span> {form.location}</p>
              <p><span className="font-semibold">Type:</span> {form.type}</p>
              <p><span className="font-semibold">Banner:</span> {form.banner}</p>
              <p><span className="font-semibold">Gallery Images:</span> {getTrimmedImages(form.images).join(', ')}</p>
              <p><span className="font-semibold">Timings:</span> {form.times.join(', ')}</p>
              
              {/* --- MODIFICATION START: Hiding Seating Info --- */}
              {/* <p><span className="font-semibold">Seating:</span> {form.seatMode === 'rows-cols' ? `${form.rows} rows x ${form.cols} columns` : `${form.seats} seats`}</p> */}
              {/* --- MODIFICATION END --- */}

              <p><span className="font-semibold">Ticket Cost:</span> ₹{form.cost}</p>
              <p><span className="font-semibold">Certificate:</span> {form.certificate ? 'Yes' : 'No'}</p>
              <p><span className="font-semibold">Personalized Website:</span> {form.personalized ? 'Yes' : 'No'}</p>
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button type="button" variant="secondary" className="bg-gray-700 hover:bg-gray-800 text-white" onClick={back}>Back</Button>
              <Button type="submit" variant="success" className="bg-green-600 hover:bg-green-700 text-white">Update Event</Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default EditEvent;