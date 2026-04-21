import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  event_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  organizer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  booking_dateTime: {
    type: Date,
    required: true
  },
  seats: {
    type: String,
    required: true
  },
  ticket_redeem: {
    type: Boolean,
    default: false
  },
  ticket_redeemedAt: {
    type: Date,
    default: null
  },
  ticket_qr : {
    type : String,
    required : true
  },
  event_status: {
    type: String,
    enum: ['upcoming', 'active', 'completed'],
    default: 'upcoming'
  },
  collegeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College',
    default: null
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  },
  committeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Committee',
    default: null
  },
  payment_id: {
    type: String,
    default: 'FREE'
  },
  paymentAmt: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

export const Booking = mongoose.model('Booking', bookingSchema);
