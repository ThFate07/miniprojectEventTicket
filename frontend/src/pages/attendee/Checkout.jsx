import { useEffect, useState } from 'react';
import { ArrowRight, Calendar, MapPin, ShieldCheck, Ticket } from 'lucide-react';
import axios from 'axios';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { downloadTicketPdf, shareTicketPdf } from '@/lib/ticketPdf';

const Checkout = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [event, setEvent] = useState({})

  // Get data passed from Seats page
  const {
    selectedSeats = [],
    ticketCost = 0,
    eventData = null,
    isGeneralAdmission = false
  } = location.state || {};

  const [ticketData, setTicketData] = useState(null); 
  const [showTicketOptions, setShowTicketOptions] = useState(false); // 
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const isGeneral = isGeneralAdmission || eventData?.seats?.type === 'general' || event?.seats?.type === 'general';
  const selectionLabel = isGeneral ? `${selectedSeats.length} General Admission` : selectedSeats.join(', ');
  const selectionCountLabel = isGeneral ? 'Tickets' : 'Seats';
  const handlePayment = async () => {
    setIsProcessingPayment(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API}/payment/order`, {
        amount: finalTotal
      });
      console.log(res.data);
      handlePaymentVerify(res.data.data)
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.message || 'Unable to start payment.');
      setIsProcessingPayment(false);
    }
  }
  const handlePaymentVerify = async (data) => {
    try {
      const seatCheckEndpoint = isGeneral ? 'check-seats' : 'check-seats-with-locks';
      let checkSeats = await axios.post(`${import.meta.env.VITE_API}/events/${seatCheckEndpoint}` , {
        event_id : id,
        seats : selectedSeats
      });
      console.log(checkSeats)
    } catch (error) {
      toast.error(error.response.data.message);
      setIsProcessingPayment(false);
      return;
    }
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY,
      amount: data.amount,
      currency: data.currency,
      name: "HostMyShow",
      description: "Test Mode",
      order_id: data.id,
      handler: async (response) => {
        console.log("Payment verify response : ", response)
        try {
          await axios.post(`${import.meta.env.VITE_API}/payment/verify`, {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          
          const ticket = await axios.post(`${import.meta.env.VITE_API}/events/book-ticket`, {
            event_id: id,
            booking_dateTime: new Date().toISOString(),
            seats: selectedSeats.join(','),
            payment_id: response.razorpay_payment_id,
            paymentAmt: finalTotal
          });

          if(!ticket.data.success){
            toast.error(ticket.data.message);
            return ;
          }
          

          if (ticket.data.message) {
            toast.success(ticket.data.message);
            setTicketData(ticket.data.booking); // Save ticket data
            setShowTicketOptions(true); // Show download/share buttons
          }
        } catch (error) {
          toast.error(error.response.data.message);
        } finally {
          setIsProcessingPayment(false);
        }
      },
      modal: {
        ondismiss: () => setIsProcessingPayment(false),
      },
      theme: {
        color: "#d66a4a"
      }
    };
    const rzp1 = new window.Razorpay(options);
    rzp1.open();
    setIsProcessingPayment(false);
  }
  useEffect(() => {
    if (!location.state) {
      navigate('/events', { replace: true });
      return;
    }

    const fetchEvent = async () => {
      console.log(id);
      try {
        const response = await axios.get(`${import.meta.env.VITE_API}/events/get-events/${id}`);
        console.log(response.data)
        setEvent(response.data.event);
      } catch (error) {
        console.log(error)
      }
    };

    fetchEvent();
  }, [id, location.state, navigate]);

  if (!location.state) {
    return null;
  }
  
  const seatPrice = ticketCost || 350;
  const convenienceFee = 50;
  const finalTotal = selectedSeats.length * seatPrice + convenienceFee;

  const formatDate = (date) => {
    const dateObj = new Date(date);
    const day = dateObj.getDate();
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  }
  const generatePDF = () => {
    if (!ticketData) {
      toast.error('Ticket details are not available yet.');
      return;
    }

    downloadTicketPdf({ booking: ticketData, event });
  };

  const sharePDF = async () => {
    if (!ticketData) {
      toast.error('Ticket details are not available yet.');
      return;
    }

    try {
      await shareTicketPdf({ booking: ticketData, event });
    } catch (error) {
      if (error?.name === 'AbortError') {
        return;
      }

      toast.error(error.message || 'Sharing failed.');
    }
  };
  
  return (
    <div className="app-page-narrow flex min-h-[calc(100vh-6rem)] items-center justify-center">
      <div className="section-card flex w-full max-w-2xl flex-col items-center p-4 sm:p-5 lg:p-6">
        <h2 className="mb-4 text-center text-[1.65rem] font-bold text-white sm:mb-5 sm:text-3xl">Confirm Your Booking</h2>

        {/* Event Details Section */}
        <div className="mb-4 flex w-full flex-col items-center gap-4 border-b border-blue-400/20 pb-4 md:flex-row md:items-center md:gap-5 sm:mb-5 sm:pb-5">
          <img src={event.banner} alt={event.title} className="h-32 w-24 rounded-lg border-2 border-blue-500 object-cover shadow-lg sm:h-36 sm:w-28 md:h-40 md:w-28" />
          <div className="flex-1 text-center md:text-left">
            <h3 className="mb-1.5 text-lg font-bold text-white sm:mb-2 sm:text-2xl">{event.title}</h3>
            <p className="text-blue-200 text-sm flex items-center justify-center md:justify-start gap-2 mb-1">
              <Calendar className="w-4 h-4" /> {formatDate(event.eventDateTime)}
            </p>
            <p className="text-blue-200 text-sm flex items-center justify-center md:justify-start gap-2 mb-1">
              <MapPin className="w-4 h-4" /> {event.location}
            </p>
            <p className="text-blue-300 text-xs mt-2"> Category : {event.eventType}</p>
          </div>
        </div>

        {/* Booking Summary Section */}
        <div className="mb-4 w-full sm:mb-5">
          <h4 className="mb-2.5 text-lg font-semibold text-white sm:mb-3 sm:text-xl">Booking Summary</h4>
          
          <div className="mb-3 space-y-2 sm:mb-3 sm:space-y-2.5">
            <div className="flex items-start justify-between gap-4 text-sm text-blue-200 sm:text-base">
              <span>{selectionCountLabel} ({selectedSeats.length})</span>
              <span className="flex items-center gap-2 text-right font-semibold text-white">
                <Ticket className="w-4 h-4" /> {selectionLabel}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm text-blue-200 sm:text-base">
              <span>Price per {isGeneral ? 'ticket' : 'seat'}</span>
              <span className="font-semibold text-white">₹{seatPrice}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm text-blue-200 sm:text-base">
              <span>Convenience Fee</span>
              <span className="font-semibold text-white">₹{convenienceFee}</span>
            </div>
          </div>

          <div className="flex w-full items-center justify-between border-t border-blue-400/20 pt-2.5 text-lg font-bold text-white sm:pt-3 sm:text-2xl">
            <span>Total Payable</span>
            <span className="flex items-center gap-2">
              <span className="w-5 h-5" /> ₹{finalTotal}
            </span>
          </div>
        </div>

        <div className="w-full rounded-[1.6rem] border border-white/10 bg-white/5 p-3.5 backdrop-blur sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f4d58d] sm:text-sm">Secure checkout</p>
              <p className="mt-1.5 text-sm leading-5 text-blue-100/85 sm:mt-2 sm:leading-6">
                Review looks complete. Continue once to open Razorpay and finish the booking securely.
              </p>
            </div>
            <div className="rounded-full border border-white/10 bg-black/20 px-4 py-1.5 text-sm text-white/85">
              Payable now: ₹{finalTotal}
            </div>
          </div>

          <div className="mt-3 space-y-2 sm:mt-4 sm:space-y-2.5">
            <Button
              onClick={handlePayment}
              disabled={isProcessingPayment}
              className="h-11 w-full rounded-full bg-[#fff3dd] px-6 text-sm font-semibold text-[#1c1917] shadow-[0_18px_45px_rgba(0,0,0,0.28)] transition-all duration-300 hover:bg-[#ffe2b3] disabled:cursor-not-allowed disabled:bg-[#f1dfbf] disabled:text-[#5b534a] sm:h-12 sm:text-base"
            >
              {isProcessingPayment ? 'Preparing payment...' : 'Proceed to Payment'}
              {!isProcessingPayment && <ArrowRight className="h-4 w-4" />}
            </Button>

            <div className="flex items-center justify-center gap-2 text-center text-[11px] uppercase tracking-[0.18em] text-blue-100/70 sm:text-xs">
              <ShieldCheck className="h-4 w-4 text-[#2cc4b0]" />
              Verified payment gateway and seat confirmation before charge
            </div>
          </div>
        </div>

        {showTicketOptions && (
          <div className="mt-6 grid w-full gap-3 sm:mt-8 sm:grid-cols-2">
            <button onClick={generatePDF} className="rounded-lg bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700">Download Ticket (PDF)</button>
            <button onClick={sharePDF} className="rounded-lg bg-blue-500 px-6 py-3 font-bold text-white hover:bg-blue-600">Share Ticket</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Checkout;
