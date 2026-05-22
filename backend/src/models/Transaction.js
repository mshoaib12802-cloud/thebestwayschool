const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['income', 'expense'], 
    required: true 
  },
  category: { 
    type: String, 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  description: { 
    type: String 
  },
  payment_method: { 
    type: String, 
    default: 'cash' 
  },
  date: { 
    type: Date, 
    default: Date.now 
  },
  
  // --- YEH MISSING THAY, INKI WAJA SE STATUS UPDATE NHI HO RAHA THA ---
  student_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Student',
    default: null 
  },
  staff_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', // Staff "User" model mein hotay hain
    default: null 
  },
  
  recorded_by: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', TransactionSchema);