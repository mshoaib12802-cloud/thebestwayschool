const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  entity_type: { type: String, enum: ['student', 'staff'], required: true },
  entity_id:   { type: mongoose.Schema.Types.ObjectId, required: true },
  title:       { type: String, required: true },
  category:    { type: String, enum: [
    'b_form', 'cnic', 'birth_certificate', 'leaving_certificate',
    'medical_report', 'vaccination', 'contract', 'experience_letter',
    'marksheet', 'photo', 'fee_receipt', 'other'
  ], default: 'other' },
  file_url:    { type: String, required: true },
  file_name:   { type: String, required: true },
  file_size:   { type: Number },
  mime_type:   { type: String },
  notes:       { type: String, default: '' },
  uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

DocumentSchema.index({ entity_type: 1, entity_id: 1 });

module.exports = mongoose.model('Document', DocumentSchema);
