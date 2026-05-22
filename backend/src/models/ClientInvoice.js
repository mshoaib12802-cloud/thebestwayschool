const mongoose = require('mongoose');

const InvoiceItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity:    { type: Number, default: 1 },
  unit_price:  { type: Number, required: true },
  total:       { type: Number, required: true },
}, { _id: false });

const ClientInvoiceSchema = new mongoose.Schema({
  client_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  project_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceProject', default: null },
  invoice_no:  { type: String, unique: true },
  title:       { type: String, required: true },
  items:       [InvoiceItemSchema],
  subtotal:    { type: Number, default: 0 },
  tax_pct:     { type: Number, default: 0 },
  tax_amount:  { type: Number, default: 0 },
  total:       { type: Number, default: 0 },
  paid_amount: { type: Number, default: 0 },
  status:      { type: String, enum: ['draft', 'sent', 'partial', 'paid', 'overdue'], default: 'draft' },
  issue_date:  { type: Date, default: Date.now },
  due_date:    { type: Date },
  notes:       { type: String, default: '' },
  created_by:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

ClientInvoiceSchema.index({ client_id: 1, createdAt: -1 });

module.exports = mongoose.model('ClientInvoice', ClientInvoiceSchema);
