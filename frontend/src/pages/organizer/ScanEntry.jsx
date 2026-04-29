import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Camera, ImageUp, RefreshCw, ShieldCheck, Ticket, TriangleAlert } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const normalizeDecodedQrData = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const getScannerErrorMessage = (error, phase = 'scan') => {
  const rawMessage = typeof error === 'string' ? error : error?.message || '';
  const normalizedMessage = rawMessage.trim();
  const lowerMessage = normalizedMessage.toLowerCase();

  if (!normalizedMessage) {
    return phase === 'camera'
      ? 'Unable to access the camera. Check browser permission and try again.'
      : 'We could not read a QR code from that image. Try a sharper screenshot or crop closer to the QR.';
  }

  if (lowerMessage.includes('no qr code found')) {
    return phase === 'camera'
      ? 'No QR code is visible yet. Hold the ticket steady, reduce glare, and keep the code inside the scan box.'
      : 'No QR code was detected in the uploaded image. Try a clearer screenshot or crop closer to the QR.';
  }

  if (lowerMessage.includes('camera not found')) {
    return 'No camera was found on this device. You can still scan from an uploaded image.';
  }

  if (lowerMessage.includes('permission') || lowerMessage.includes('denied') || lowerMessage.includes('notallowederror')) {
    return 'Camera permission was denied. Allow camera access in the browser and try again.';
  }

  if (lowerMessage.includes('could not be decoded')) {
    return 'The QR was detected but its contents could not be decoded. Try the original ticket image or a clearer screenshot.';
  }

  return normalizedMessage;
};

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
  const [acceptedScan, setAcceptedScan] = useState(null);
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const qrScannerRef = useRef(null);
  const decodeLoopRef = useRef(null);
  const acceptedScanTimeoutRef = useRef(null);
  const scanCooldownRef = useRef(false);
  const isVerifyingRef = useRef(false);
  const isDecodingRef = useRef(false);
  const selectedEventRef = useRef('');
  const lastHandledQrRef = useRef({ value: '', until: 0 });

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

  const showAcceptedScan = (booking) => {
    if (acceptedScanTimeoutRef.current) {
      window.clearTimeout(acceptedScanTimeoutRef.current);
    }

    setAcceptedScan(booking);
    acceptedScanTimeoutRef.current = window.setTimeout(() => {
      setAcceptedScan(null);
    }, 3200);
  };

  const decodeQrFromImageSource = async (QrScanner, source, { returnDetailedResult = false } = {}) => {
    const scanAttempts = [
      {
        returnDetailedScanResult: true,
        alsoTryWithoutScanRegion: true,
      },
      {
        returnDetailedScanResult: true,
        scanRegion: null,
        alsoTryWithoutScanRegion: true,
      },
    ];

    let lastError = null;

    for (const options of scanAttempts) {
      try {
        const result = await QrScanner.scanImage(source, options);
        if (returnDetailedResult) {
          return typeof result === 'string' ? { data: result } : result;
        }

        return typeof result === 'string' ? result : result.data;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('No QR code found');
  };

  const tryDecodeCurrentVideoFrame = async (QrScanner) => {
    if (!videoRef.current || scanCooldownRef.current || isVerifyingRef.current || isDecodingRef.current) {
      return;
    }

    const video = videoRef.current;

    if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      return;
    }

    isDecodingRef.current = true;

    try {
      const result = await decodeQrFromImageSource(QrScanner, video, { returnDetailedResult: true });
      const decodedValue = typeof result === 'string' ? result : result?.data;

      if (decodedValue) {
        setCameraStatus('QR detected. Validating ticket...');
        await verifyTicket(decodedValue);
      }
    } catch (error) {
      const message = getScannerErrorMessage(error, 'camera');

      if (!message.startsWith('No QR code is visible yet')) {
        setCameraStatus(message);
      }
    } finally {
      isDecodingRef.current = false;
    }
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
    const normalizedQrData = normalizeDecodedQrData(rawQrData);
    const now = Date.now();
    let acceptedCooldownMs = 1800;

    if (!normalizedQrData) {
      const message = 'The scanned QR was empty. Try again with the ticket centered and fully visible.';
      setLastError(message);
      setCameraStatus('Scan failed. No QR payload was read.');
      toast.error(message);
      return;
    }

    if (
      scanCooldownRef.current ||
      isVerifyingRef.current ||
      (lastHandledQrRef.current.value === normalizedQrData && lastHandledQrRef.current.until > now)
    ) {
      return;
    }

    scanCooldownRef.current = true;
    isVerifyingRef.current = true;
    setIsVerifying(true);
    setLastError('');

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API}/events/validate-ticket-entry`,
        {
          qrData: normalizedQrData,
          eventId: selectedEventRef.current || undefined,
        },
        { withCredentials: true }
      );

      setLastScan(response.data.booking);
      setLastError('');
      showAcceptedScan(response.data.booking);
      setCameraStatus('Ticket validated. Ready for the next attendee.');
      lastHandledQrRef.current = {
        value: normalizedQrData,
        until: Date.now() + 6000,
      };
      acceptedCooldownMs = 3200;
      toast.success(response.data.message || 'Ticket checked in successfully');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to validate ticket';
      const booking = error.response?.data?.booking || null;

      setLastScan(booking);
      setLastError(message);
      setCameraStatus('Scan failed. Check the message and try again.');
      toast.error(message);
    } finally {
      isVerifyingRef.current = false;
      setIsVerifying(false);
      window.setTimeout(() => {
        scanCooldownRef.current = false;
      }, acceptedCooldownMs);
    }
  };

  useEffect(() => {
    if (!videoRef.current) {
      return undefined;
    }

    let disposed = false;
    let scanner;
    let qrScannerInstance;

    const runDecodeFallback = async () => {
      if (!qrScannerInstance) {
        return;
      }

      await tryDecodeCurrentVideoFrame(qrScannerInstance);
    };

    const startScanner = async () => {
      try {
        const QrScanner = await loadQrScanner();
        qrScannerInstance = QrScanner;

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
            onDecodeError: (error) => {
              const message = getScannerErrorMessage(error, 'camera');

              if (message.startsWith('No QR code is visible yet')) {
                return;
              }

              setCameraStatus(message);
            },
            calculateScanRegion: (video) => {
              const edge = Math.round(Math.min(video.videoWidth, video.videoHeight) * 0.82);
              const x = Math.max(0, Math.round((video.videoWidth - edge) / 2));
              const y = Math.max(0, Math.round((video.videoHeight - edge) / 2));

              return {
                x,
                y,
                width: edge,
                height: edge,
                downScaledWidth: 900,
                downScaledHeight: 900,
              };
            },
            preferredCamera: 'environment',
            highlightScanRegion: false,
            highlightCodeOutline: true,
            returnDetailedScanResult: true,
            maxScansPerSecond: 5,
          }
        );

        scannerRef.current = scanner;
        scanner.setInversionMode('both');
        await scanner.start();

        decodeLoopRef.current = window.setInterval(() => {
          runDecodeFallback();
        }, 900);

        if (disposed) {
          return;
        }

        setCameraError('');
        setCameraStatus('Point the camera at an attendee ticket QR code.');
      } catch (error) {
        if (disposed) {
          return;
        }

        const message = getScannerErrorMessage(error, 'camera');

        setCameraError(message);
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
      if (decodeLoopRef.current) {
        window.clearInterval(decodeLoopRef.current);
        decodeLoopRef.current = null;
      }
      if (acceptedScanTimeoutRef.current) {
        window.clearTimeout(acceptedScanTimeoutRef.current);
        acceptedScanTimeoutRef.current = null;
      }
      setAcceptedScan(null);
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
      const rawValue = await decodeQrFromImageSource(QrScanner, file);

      await verifyTicket(rawValue);
    } catch (error) {
      const message = getScannerErrorMessage(error, 'image');

      setLastScan(null);
      setLastError(message);
      setCameraStatus('Image scan failed. Review the error and try another screenshot.');
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
      const message = getScannerErrorMessage(error, 'camera');

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
              <Select value={selectedEvent || '__all__'} onValueChange={(value) => setSelectedEvent(value === '__all__' ? '' : value)}>
                <SelectTrigger id="event-select" className="lg:min-w-80">
                  <SelectValue placeholder="All my events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All my events</SelectItem>
                  {events.map((eventItem) => (
                    <SelectItem key={eventItem._id} value={eventItem._id}>
                      {eventItem.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              onClick={handleRestartCamera}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <RefreshCw className="h-4 w-4" /> Restart Camera
            </Button>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-blue-400/20 bg-slate-950/60">
            <video ref={videoRef} className="h-[280px] w-full object-cover sm:h-[360px] lg:h-[420px]" muted playsInline />
            {acceptedScan && (
              <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-3xl border border-emerald-300/40 bg-slate-950/88 p-4 shadow-[0_12px_40px_rgba(16,185,129,0.22)] backdrop-blur-sm sm:inset-x-6 sm:bottom-6 sm:p-5">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">
                  <ShieldCheck className="h-4 w-4" /> Entry Accepted
                </div>
                <div className="grid gap-2 text-sm text-white/90 sm:grid-cols-2">
                  <div>
                    <span className="text-emerald-200">Attendee:</span> {acceptedScan.attendeeName}
                  </div>
                  {acceptedScan.attendeeEmail && (
                    <div>
                      <span className="text-emerald-200">Email:</span> {acceptedScan.attendeeEmail}
                    </div>
                  )}
                  <div>
                    <span className="text-emerald-200">Event:</span> {acceptedScan.eventTitle}
                  </div>
                  <div>
                    <span className="text-emerald-200">Seats:</span> {acceptedScan.seats}
                  </div>
                </div>
              </div>
            )}
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
              {lastError || 'Only current signed tickets can be checked in here. Reused, tampered, wrong-event, outdated-format, or unmatched tickets are rejected with a specific reason.'}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ScanEntry;
