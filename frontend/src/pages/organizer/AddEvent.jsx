import React, { useState } from 'react';
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
import { useNavigate } from 'react-router-dom';

const eventTypes = ['Hackathon', 'Live Show'];
const totalSteps = 4;
const ticketingModes = ['assigned', 'general'];

const getTrimmedImages = (images) => images.map((image) => image.trim()).filter(Boolean);

const AddEvent = () => {
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
    ticketingMode: ticketingModes[0],
    seatMode: 'rows-cols', // or 'direct'
    rows: '',
    cols: '',
    seats: '',
    capacity: '',
    cost: '',
  });
  const navigate = useNavigate();

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

  const validateStep = (currentStep) => {
    if (currentStep === 1) {
      if (!form.title.trim()) {
        toast.error('Title is required');
        return false;
      }
      if (!form.description.trim()) {
        toast.error('Description is required');
        return false;
      }
      if (!form.location.trim()) {
        toast.error('Location is required');
        return false;
      }
      if (!form.banner.trim()) {
        toast.error('Banner image link is required');
        return false;
      }
      if (getTrimmedImages(form.images).length === 0) {
        toast.error('At least one gallery image link is required');
        return false;
      }
    }

    if (currentStep === 2) {
      if (!form.date) {
        toast.error('Event date is required');
        return false;
      }
      if (form.times.some((time) => !time)) {
        toast.error('All event timings must be filled');
        return false;
      }
      if (!form.cost || isNaN(form.cost) || Number(form.cost) < 0) {
        toast.error('Valid ticket cost is required');
        return false;
      }
      if (form.ticketingMode === 'assigned') {
        if (form.seatMode === 'rows-cols') {
          if (!form.rows || isNaN(form.rows) || Number(form.rows) < 1) {
            toast.error('Valid number of rows is required');
            return false;
          }
          if (!form.cols || isNaN(form.cols) || Number(form.cols) < 1) {
            toast.error('Valid number of columns is required');
            return false;
          }
        } else if (!form.seats || isNaN(form.seats) || Number(form.seats) < 1) {
          toast.error('Valid number of seats is required');
          return false;
        }
      } else if (!form.capacity || isNaN(form.capacity) || Number(form.capacity) < 1) {
        toast.error('Valid ticket capacity is required');
        return false;
      }
    }

    return true;
  };

  const validateAllSteps = () => validateStep(1) && validateStep(2);

  const next = () => {
    if (!validateStep(step)) {
      return;
    }
    setStep((s) => s + 1);
  };
  const back = () => setStep((s) => s - 1);
  
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateAllSteps()) {
      return;
    }

    // Combine date and times into eventDateTime array
    const eventDateTime = form.times.map(time => {
      const dateTimeString = `${form.date}T${time}:00`; // YYYY-MM-DDTHH:MM:SS
      return new Date(dateTimeString).toISOString();
    });

    let seats, seatMap;
    if (form.ticketingMode === 'general') {
      seats = {
        type: 'general',
        value: String(Number(form.capacity))
      };
      seatMap = undefined;
    } else if (form.seatMode === 'rows-cols') {
      seats = {
        type: 'RowColumns',
        value: `${form.rows}x${form.cols}`
      };
      seatMap = undefined;
    } else {
      seats = {
        type: 'direct'
      };
      seatMap = Array.from({ length: Number(form.seats) }, (_, i) => ({
        seatLabel: `S${i + 1}`,
        isBooked: false
      }));
    }

    const images = getTrimmedImages(form.images);

    const payload = {
      title: form.title,
      description: form.description,
      location: form.location,
      eventType: form.type,
      banner: form.banner,
      image: images[0],
      images,
      eventDateTime,
      seats,
      seatMap,
      cost: Number(form.cost),
      certificate: form.certificate,
    };

    try {
      const res = await axios.post(`${import.meta.env.VITE_API}/events/add-events`, payload, { withCredentials: true });
      toast.success('Event created successfully!');
      navigate('/organizer/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create event');
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl text-white">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200/70">Organizer</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Add Event</h1>
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
                    <p className="text-sm text-blue-200/70">Add all event photos here. The first image is used as the cover photo in listings.</p>
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
              <Button type="button" className="bg-blue-700 hover:bg-blue-800 text-white" onClick={next}>Next</Button>
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
            <label className="block mb-4 font-semibold text-xl mt-4">Seating Arrangement</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div
                className={`relative flex flex-col items-center p-6 rounded-xl border-2 transition-all cursor-pointer
                  ${form.ticketingMode === 'assigned'
                    ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                    : 'border-white/30 hover:border-blue-400/50 hover:bg-blue-500/5'
                  }`}
                onClick={() => handleChange({ target: { name: 'ticketingMode', value: 'assigned' } })}
              >
                <h3 className="text-lg font-semibold mb-2">Assigned Seating</h3>
                <p className="text-sm text-center text-blue-200/70">
                  For events where attendees choose exact seats.
                </p>
              </div>
              <div
                className={`relative flex flex-col items-center p-6 rounded-xl border-2 transition-all cursor-pointer
                  ${form.ticketingMode === 'general'
                    ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                    : 'border-white/30 hover:border-blue-400/50 hover:bg-blue-500/5'
                  }`}
                onClick={() => handleChange({ target: { name: 'ticketingMode', value: 'general' } })}
              >
                <h3 className="text-lg font-semibold mb-2">General Admission</h3>
                <p className="text-sm text-center text-blue-200/70">
                  For college fests, DJ nights, and open-floor events with ticket capacity only.
                </p>
              </div>
            </div>
            {form.ticketingMode === 'assigned' ? (
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div
                className={`relative flex flex-col items-center p-6 rounded-xl border-2 transition-all cursor-pointer
                  ${form.seatMode === 'rows-cols' 
                    ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20' 
                    : 'border-white/30 hover:border-blue-400/50 hover:bg-blue-500/5'
                  }`}
                onClick={() => handleChange({ target: { name: 'seatMode', value: 'rows-cols' } })}
              >
                <input
                  type="radio"
                  name="seatMode"
                  value="rows-cols"
                  checked={form.seatMode === 'rows-cols'}
                  onChange={handleChange}
                  className="hidden"
                />
                <div className="mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16m-7 6h7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Rows & Columns</h3>
                <p className="text-sm text-center text-blue-200/70">
                  Organize seats in a grid layout with specific rows and columns
                </p>
                {form.seatMode === 'rows-cols' && (
                  <div className="absolute top-2 right-2 text-blue-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>

              <div
                className={`relative flex flex-col items-center p-6 rounded-xl border-2 transition-all cursor-pointer
                  ${form.seatMode === 'direct' 
                    ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20' 
                    : 'border-white/30 hover:border-blue-400/50 hover:bg-blue-500/5'
                  }`}
                onClick={() => handleChange({ target: { name: 'seatMode', value: 'direct' } })}
              >
                <input
                  type="radio"
                  name="seatMode"
                  value="direct"
                  checked={form.seatMode === 'direct'}
                  onChange={handleChange}
                  className="hidden"
                />
                <div className="mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Direct Seats</h3>
                <p className="text-sm text-center text-blue-200/70">
                  Specify total number of seats without grid arrangement
                </p>
                {form.seatMode === 'direct' && (
                  <div className="absolute top-2 right-2 text-blue-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
            ) : null}
            {form.ticketingMode === 'assigned' ? form.seatMode === 'rows-cols' ? (
              <div className="flex flex-col gap-4 sm:flex-row">
                <Input name="rows" className="h-10 border-white/30" value={form.rows} onChange={handleChange} type="number" min="1" max="25" placeholder="Rows" required />
                <Input name="cols" className="h-10 border-white/30" value={form.cols} onChange={handleChange} type="number" min="1" max="25"placeholder="Columns" required />
              </div>
            ) : (
              <Input name="seats" className="h-10 border-white/30" value={form.seats} onChange={handleChange} type="number" min="1" max="500" placeholder="Total Seats" required />
            ) : (
              <Input name="capacity" className="h-10 border-white/30" value={form.capacity} onChange={handleChange} type="number" min="1" max="5000" placeholder="Total Tickets Available" required />
            )}
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
              <p><span className="font-semibold">Ticketing:</span> {form.ticketingMode === 'general' ? `General Admission (${form.capacity} tickets)` : form.seatMode === 'rows-cols' ? `${form.rows} rows x ${form.cols} columns` : `${form.seats} seats`}</p>
              <p><span className="font-semibold">Ticket Cost:</span> ₹{form.cost}</p>
              <p><span className="font-semibold">Certificate:</span> {form.certificate ? 'Yes' : 'No'}</p>
              <p><span className="font-semibold">Personalized Website:</span> {form.personalized ? 'Yes' : 'No'}</p>
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button type="button" variant="secondary" className="bg-gray-700 hover:bg-gray-800 text-white" onClick={back}>Back</Button>
              <Button type="submit" variant="success" className="bg-green-600 hover:bg-green-700 text-white">Submit</Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default AddEvent;