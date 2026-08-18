const mongoose = require('mongoose');

const BookSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  author: { type: String, default: '' },
  isbn: { type: String, default: '', trim: true },
  category: { type: String, default: 'General' },
  publisher: { type: String, default: '' },
  edition: { type: String, default: '' },
  total_copies: { type: Number, default: 1, min: 0 },
  available_copies: { type: Number, default: 1, min: 0 },
  shelf_location: { type: String, default: '' },
  is_active: { type: Boolean, default: true },
  added_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Book', BookSchema);
