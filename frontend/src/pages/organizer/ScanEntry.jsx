import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Camera, ImageUp, RefreshCw, ShieldCheck, Ticket, TriangleAlert } from 'lucide-react';

const formatDateTime = (value) => {
  if (!value) {
    return 'Not available';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return 'Not available';
  }

  return parsed.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });
};

const ScanEntry = () => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [cameraStatus, setCameraStatus] = useState('Starting camera...');
  const [cameraError, setCameraError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [lastError, setLastError] = useState('');
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const qrScannerRef = useRef(null);
  const scanCooldownRef = useRef(false);
  const selectedEventRef = useRef('');

  useEffect(() => {
    selectedEventRef.current = selectedEvent;
  }, [selectedEvent]);

  const loadQrScanner = async () => {
    if (qrScannerRef.current) {
      return qrScannerRef.current;
    }

    const [{ default: QrScanner }, workerModule] = await Promise.all([
      import('qr-scanner'),
      import('qr-scanner/qr-scanner-worker.min.js?url'),
    ]);

    QrScanner.WORKER_PATH = workerModule.default;
    qrScannerRef.current = QrScanner;

    return QrScanner;
  };

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API}/events/get-my-events`, {
          withCredentials: true,
        });
        const organizerEvents = response.data.events || [];

        setEvents(organizerEvents);

        if (organizerEvents.length === 1) {
          setSelectedEvent(organizerEvents[0]._id);
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load organizer events');
      }
    };

    fetchEvents();
  }, []);

  const verifyTicket = async (rawQrData) => {
    if (scanCooldownRef.current) {
      return;
    }

    scanCooldownRef.current = true;
    setIsVerifying(true);
    setLastError('');

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API}/events/validate-ticket-entry`,
        {
          qrData: rawQrData,
          eventId: selectedEventRef.current || undefined,
        },
        { withCredentials: true }
      );

      setLastScan(response.data.booking);
      setCameraStatus('Ticket validated. Ready for the next attendee.');
      toast.success(response.data.message || 'Ticket checked in successfully');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to validate ticket';
      const booking = error.response?.data?.booking || null;

      setLastScan(booking);
      setLastError(message);
      setCameraStatus('Scan failed. Check the message and try again.');
      toast.error(message);
    } finally {
      setIsVerifying(false);
      window.setTimeout(() => {
        scanCooldownRef.current = false;
      }, 1800);
    }
  };

  useEffect(() => {
    if (!videoRef.current) {
      return undefined;
    }

    let disposed = false;
    let scanner;

    const startScanner = async () => {
      try {
        const QrScanner = await loadQrScanner();

        if (disposed || !videoRef.current) {
          return;
        }

        scanner = new QrScanner(
          videoRef.current,
          (result) => {
            const rawValue = typeof result === 'string' ? result : result.data;
            verifyTicket(rawValue);
          },
          {
            preferredCamera: 'environment',
            highlightScanRegion: true,
            highlightCodeOutline: true,
            returnDetailedScanResult: true,
            maxScansPerSecond: 5,
          }
        );

        scannerRef.current = scanner;
        await scanner.start();

        if (disposed) {
          return;
        }

        setCameraError('');
        setCameraStatus('Point the camera at an attendee ticket QR code.');
      } catch (error) {
        if (disposed) {
          return;
        }

        setCameraError(error.message || 'Unable to access the camera');
        setCameraStatus('Camera unavailable. You can still scan from an uploaded image.');
      }
    };

    startScanner();

    return () => {
      disposed = true;
      if (scanner) {
        scanner.stop();
        scanner.destroy();
      }
      scannerRef.current = null;
    };
  }, []);

  const handleScanFromImage = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setLastError('');
    setIsVerifying(true);

    try {
      const QrScanner = await loadQrScanner();
      const result = await QrScanner.scanImage(file, {
        returnDetailedScanResult: true,
      });
      const rawValue = typeof result === 'string' ? result : result.data;

      await verifyTicket(rawValue);
    } catch (error) {
      const message = error.message || 'No QR code was detected in the uploaded image';

      setLastScan(null);
      setLastError(message);
      toast.error(message);
    } finally {
      setIsVerifying(false);
      event.target.value = '';
    }
  };

  const handleRestartCamera = async () => {
    if (!scannerRef.current) {
      return;
    }

    try {
      await scannerRef.current.start();
      setCameraError('');
      setCameraStatus('Camera restarted. Ready to scan.');
    } catch (error) {
      const message = error.message || 'Unable to restart the camera';

      setCameraError(message);
      setCameraStatus('Camera restart failed. Use image upload as fallback.');
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen text-white">
      <div className="mb-8 flex flex-col gap-3">
        <div className="flex items-center gap-3 text-blue-300">
          <ShieldCheck className="h-7 w-7" />
          <h1 className="text-4xl font-bold">Scan Entry</h1>
        </div>
        <p className="max-w-3xl text-sm text-blue-100/90">
          Each ticket QR contains a signed booking payload. The organizer scanner verifies the signature on the backend,
          confirms the booking belongs to your event, and marks the ticket as redeemed so it cannot be reused.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <section className="section-card rounded-3xl p-4 shadow-xl sm:p-6">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <label htmlFor="event-select" className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">
                Event Scope
              </label>
              <select
                id="event-select"
                className="w-full rounded-xl border border-blue-400/20 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-blue-400 lg:min-w-80"
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
              >
                <option value="">All my events</option>
                {events.map((eventItem) => (
                  <option key={eventItem._id} value={eventItem._id}>
                    {eventItem.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleRestartCamera}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/20 sm:w-auto"
            >
              <RefreshCw className="h-4 w-4" /> Restart Camera
            </button>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-blue-400/20 bg-slate-950/60">
            <video ref={videoRef} className="h-[280px] w-full object-cover sm:h-[360px] lg:h-[420px]" muted playsInline />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-40 w-40 rounded-[2rem] border-2 border-dashed border-emerald-300/75 shadow-[0_0_40px_rgba(52,211,153,0.18)] sm:h-48 sm:w-48 lg:h-56 lg:w-56" />
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-blue-400/20 bg-slate-950/60 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">
                <Camera className="h-4 w-4" /> Camera Status
              </div>
              <p className="text-sm text-white/90">{cameraStatus}</p>
              {cameraError && <p className="mt-2 text-sm text-amber-300">{cameraError}</p>}
            </div>

            <label className="rounded-2xl border border-blue-400/20 bg-slate-950/60 p-4 transition hover:border-blue-300/40">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">
                <ImageUp className="h-4 w-4" /> Image Fallback
              </div>
              <p className="mb-3 text-sm text-white/90">Upload a screenshot or photo of the attendee ticket QR.</p>
              <input type="file" accept="image/*" onChange={handleScanFromImage} className="block w-full text-sm text-white/80 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-500/15 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-100 hover:file:bg-blue-500/25" />
            </label>
          </div>
        </section>

        <section className="space-y-4">
          <div className="section-card rounded-3xl p-6 shadow-xl">
            <div className="mb-3 flex items-center gap-2 text-lg font-semibold text-blue-200">
              <Ticket className="h-5 w-5" /> Last Check-in Result
            </div>

            {isVerifying ? (
              <p className="text-sm text-blue-100">Validating ticket and redeeming entry...</p>
            ) : lastScan ? (
              <div className="space-y-3 text-sm text-white/90">
                <div>
                  <span className="text-blue-200">Attendee:</span> {lastScan.attendeeName}
                </div>
                {lastScan.attendeeEmail && (
                  <div>
                    <span className="text-blue-200">Email:</span> {lastScan.attendeeEmail}
                  </div>
                )}
                <div>
                  <span className="text-blue-200">Event:</span> {lastScan.eventTitle}
                </div>
                <div>
                  <span className="text-blue-200">Seats:</span> {lastScan.seats}
                </div>
                <div>
                  <span className="text-blue-200">Paid:</span> Rs.{lastScan.paymentAmt}
                </div>
                <div>
                  <span className="text-blue-200">Redeemed At:</span> {formatDateTime(lastScan.redeemedAt)}
                </div>
              </div>
            ) : (
              <p className="text-sm text-blue-100">No ticket has been scanned yet in this session.</p>
            )}
          </div>

          <div className={`section-card rounded-3xl border p-6 shadow-xl ${lastError ? 'border-amber-400/30' : 'border-emerald-400/20'}`}>
            <div className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
              {lastError ? <TriangleAlert className="h-5 w-5 text-amber-300" /> : <ShieldCheck className="h-5 w-5 text-emerald-300" />}
              Entry Guardrail
            </div>
            <p className="text-sm text-white/85">
              {lastError || 'Only signed tickets created by this backend are accepted. Reused or tampered QR codes are rejected.'}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ScanEntry;