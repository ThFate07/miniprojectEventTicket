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
    timeZone: 'Asia/Kolkata',
  });
};

export const getTicketFileName = (booking) => {
  return `BookMyEvent_Ticket_${booking?._id || booking?.booking_id || 'booking'}.pdf`;
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
  const bookingId = booking._id || booking.booking_id || '';
  const amountPaid = Number(booking.paymentAmt || 0).toLocaleString('en-IN');

  doc.setFillColor(249, 250, 251);
  doc.rect(0, 0, 595.28, 841.89, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(37, 99, 235);
  doc.text('HostMyShow', 40, 58);

  doc.setFontSize(22);
  doc.setTextColor(17, 24, 39);
  doc.text('Event Ticket', 40, 94);

  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(1);
  doc.line(40, 110, 555, 110);

  let y = 145;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(title, 40, y);

  y += 34;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(55, 65, 81);
  doc.text(`Date & Time: ${showDateTime}`, 40, y);

  y += 20;
  doc.text(`Venue: ${venue}`, 40, y);

  y += 20;
  doc.text(`Seat / Pass: ${booking.seats || 'Not assigned'}`, 40, y);

  y += 20;
  doc.text(`Booking ID: ${bookingId}`, 40, y);

  y += 20;
  doc.text(`Amount Paid: Rs. ${amountPaid}`, 40, y);

  y += 36;
  if (booking.ticket_qr) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text('Scan this QR at entry', 40, y);
    y += 12;
    doc.addImage(booking.ticket_qr, 'PNG', 40, y, 120, 120);
    y += 140;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(75, 85, 99);
  doc.text('Please arrive 15 minutes early and keep this ticket ready for verification.', 40, y);

  return doc;
};

export const downloadTicketPdf = async ({ booking, event }) => {
  const doc = buildTicketDocument({ booking, event });
  doc.save(getTicketFileName(booking));
};

export const shareTicketPdf = async ({ booking, event }) => {
  const doc = buildTicketDocument({ booking, event });
  const pdfBlob = doc.output('blob');
  const file = new File([pdfBlob], getTicketFileName(booking), {
    type: 'application/pdf',
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
    text: `Here is your ticket for ${booking.event_title || event?.title || 'your event'}.`,
  });
};
