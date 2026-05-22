const mongoose = require('mongoose');

const VisitorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  
  // --- TYPE SEPARATION ---
  visitor_type: { 
    type: String, 
    enum: ['student', 'client'], 
    default: 'student' 
  },

  // --- INTERESTS ---
  interest: { type: String }, // e.g., "Web Dev Course" or "E-commerce App"
  source: { type: String }, // e.g., Facebook, Friend, Walk-in
  
  // --- CLIENT SPECIFIC ---
  budget: { type: Number }, // Only for clients
  company_name: { type: String }, // Only for clients

  // --- FOLLOW UP SYSTEM ---
  status: { 
    type: String, 
    enum: ['new', 'contacted', 'meeting', 'converted', 'lost'], 
    default: 'new' 
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  follow_up_date: { type: Date },
  remarks: [{ 
    note: String, 
    date: { type: Date, default: Date.now } 
  }],

  father_name: { type: String },

  // --- ONLINE ADMISSION WORKFLOW ---
  admission_status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  rejection_reason: { type: String },
  approved_at: { type: Date },
  enrolled_student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },

  date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Visitor', VisitorSchema);