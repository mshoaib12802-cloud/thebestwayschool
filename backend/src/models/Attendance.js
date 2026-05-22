const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  // Yeh ID Student ki bhi ho skti ha aur Staff ki bhi
  person_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true,
    refPath: 'person_type' // Nechy waly field se decide hoga k yeh ID kis table ki ha
  },
  person_type: { 
    type: String, 
    required: true, 
    enum: ['Student', 'User'] // 'User' matlab Staff/Admin
  },
  
  date: { type: Date, default: Date.now }, // Sirf Date (Time hatany k liye logic controller ma hogi)
  
  status: { 
    type: String, 
    enum: ['present', 'absent', 'late', 'leave', 'half_day'],
    default: 'absent'
  },
  
  check_in_time: { type: Date },  // Jab QR Code scan hoga
  check_out_time: { type: Date }, // Jab chutti hogi
  
  late_minutes: { type: Number, default: 0 } // Salary deduction logic k liye
}, { timestamps: true });

// Ek banday ki aik din main aik hi attendance ho skti ha (Duplicate rokny k liye)
AttendanceSchema.index({ person_id: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);