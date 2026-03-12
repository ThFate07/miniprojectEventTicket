import jsPDF from 'jspdf';

const getPrimaryDateTime = (eventDateTime, fallbackDateTime) => {
  if (Array.isArray(eventDateTime) && eventDateTime.length > 0) {
    return eventDateTime[0];
  }

  return eventDateTime || fallbackDateTime || null;
};

const formatTicketDateTime = (value) => {
  if (!value) {
    return 'To be announced';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return 'To be announced';
  }

  return parsed.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata'
  });
};

export const getTicketFileName = (booking) => {
  return `HostMyShow_Ticket_${booking?._id || booking?.booking_id || 'booking'}.pdf`;
};

const buildTicketDocument = ({ booking, event }) => {
  if (!booking) {
    throw new Error('Ticket details are not available.');
  }

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const title = booking.event_title || event?.title || 'Event';
  const showDateTime = formatTicketDateTime(
    getPrimaryDateTime(event?.eventDateTime, booking.booking_dateTime)
  );
  const venue = event?.location || 'Venue to be announced';

  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#2563eb');
  doc.text('Host', 40, 60);
  doc.setTextColor('#1f2937');
  doc.text('MyShow', 100, 60);

  doc.setFontSize(20);
  doc.setTextColor('#111827');
  doc.text(title, 40, 100);

  doc.setFontSize(12);
  let y = 130;
  doc.text(`Date & Time: ${showDateTime}`, 40, y);
  y += 20;
  doc.text(`Venue: ${venue}`, 40, y);
  y += 20;
  doc.text(`Seats: ${booking.seats || 'Not assigned'}`, 40, y);
  y += 20;
  doc.text(`Booking ID: ${booking._id || booking.booking_id || ''}`, 40, y);
  y += 20;
  doc.text(`Amount Paid: Rs.${booking.paymentAmt ?? 0}`, 40, y);
  y += 30;

  if (booking.ticket_qr) {
    doc.text('Scan for entry:', 40, y);
    y += 10;
    doc.addImage(booking.ticket_qr, 'PNG', 40, y, 100, 100);
    y += 110;
  }

  doc.setFontSize(13);
  doc.setTextColor('#2563eb');
  doc.text('Enjoy your show! Please arrive 15 minutes early. For support, contact HostMyShow.', 40, y + 30);

  return doc;
};

export const downloadTicketPdf = ({ booking, event }) => {
  const doc = buildTicketDocument({ booking, event });
  doc.save(getTicketFileName(booking));
};

export const shareTicketPdf = async ({ booking, event }) => {
  const doc = buildTicketDocument({ booking, event });
  const pdfBlob = doc.output('blob');
  const file = new File([pdfBlob], getTicketFileName(booking), {
    type: 'application/pdf'
  });

  if (!navigator.share) {
    throw new Error('Sharing is not supported on this device.');
  }

  if (navigator.canShare && !navigator.canShare({ files: [file] })) {
    throw new Error('This device cannot share PDF files.');
  }

  await navigator.share({
    files: [file],
    title: 'Your HostMyShow Ticket',
    text: `Here is your ticket for ${booking.event_title || event?.title || 'your event'}.`
  });
};