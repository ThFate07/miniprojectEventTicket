import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  location: String,
  eventType: {
    type: String,
    required: true
  },
  banner: {
    type: String, 
    required: true
  },
  image: {
  type: String,
  required: false
  },
  images: [{
    type: String,
    trim: true,
  }],
  eventDateTime: [{
    type:Date,
    required: true
  }],
  seats: {
    type: {
      type: String,
      enum: ['RowColumns', 'direct', 'general'],
      required: true
    },
    value: String
  },
  seatMap: [
  {
    seatLabel: String,        
    isBooked: { type: Boolean, default: false }
  }
],
  cost: {
    type: Number,
    default: 0
  },
  maxTicketsPerStudent: {
    type: Number,
    default: 1,
    min: 1
  },
  certificate: {
    type: Boolean
  },
  special: {
    type: String,
  },
  totalRevenue: {
    type: Number,
    default: 0
  },
  totalBookings: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['upcoming', 'active', 'completed'],
    default: 'upcoming'
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  collegeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College',
    default: null,
    index: true
  },
  departmentIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  }],
  committeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Committee',
    default: null,
    index: true
  },
  tentativeDate: {
    type: Date,
    default: null
  },
  finalDate: {
    type: Date,
    default: null
  },
  isFinalized: {
    type: Boolean,
    default: false
  },
  visibilityScope: {
    type: String,
    enum: ['department', 'college', 'global'],
    default: 'department',
    index: true
  },
  lifecycleState: {
    type: String,
    enum: ['draft', 'tentative', 'finalized', 'registration_open', 'registration_closed'],
    default: 'tentative'
  },
  users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

export const Event = mongoose.model('Event', eventSchema);
 
