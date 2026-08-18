const CanteenItem   = require('../models/CanteenItem');
const CanteenCharge = require('../models/CanteenCharge');
const Student       = require('../models/Student');
const FeeInvoice    = require('../models/FeeInvoice');
const SchoolClass   = require('../models/SchoolClass');

// ─── MENU ITEMS ──────────────────────────────────────────────────────────────

const getMenuItems = async (req, res) => {
  try {
    const items = await CanteenItem.find().sort({ category: 1, name: 1 });
    res.json(items);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const addMenuItem = async (req, res) => {
  try {
    const item = await CanteenItem.create({ ...req.body, created_by: req.user._id });
    res.status(201).json(item);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const updateMenuItem = async (req, res) => {
  try {
    const item = await CanteenItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const deleteMenuItem = async (req, res) => {
  try {
    await CanteenItem.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ─── MONTHLY CHARGES ─────────────────────────────────────────────────────────

// GET /canteen/charges?class_id=X&month=2026-06
const getClassCharges = async (req, res) => {
  try {
    const { class_id, month } = req.query;
    if (!class_id || !month) return res.status(400).json({ message: 'class_id and month are required' });

    const students = await Student.find({ school_class_id: class_id, isActive: true })
      .select('full_name roll_number photo school_class_id section')
      .sort({ full_name: 1 });

    const charges = await CanteenCharge.find({
      student_id: { $in: students.map(s => s._id) },
      month,
    });

    const chargeMap = {};
    for (const c of charges) chargeMap[c.student_id.toString()] = c;

    const result = students.map(s => ({
      student_id:  s._id,
      full_name:   s.full_name,
      roll_number: s.roll_number,
      section:     s.section,
      photo:       s.photo,
      charge:      chargeMap[s._id.toString()] || null,
      amount:      chargeMap[s._id.toString()]?.amount || 0,
      status:      chargeMap[s._id.toString()]?.status || 'pending',
      notes:       chargeMap[s._id.toString()]?.notes || '',
    }));

    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /canteen/charges/bulk  — save charges for multiple students at once
const bulkSaveCharges = async (req, res) => {
  try {
    const { month, academic_year_id, charges } = req.body;
    // charges = [{ student_id, class_id, amount, notes }]
    if (!month || !charges?.length) return res.status(400).json({ message: 'month and charges are required' });

    const results = [];
    for (const c of charges) {
      if (c.amount === undefined || c.amount === null) continue;
      const doc = await CanteenCharge.findOneAndUpdate(
        { student_id: c.student_id, month },
        {
          class_id: c.class_id,
          academic_year_id,
          amount: parseFloat(c.amount) || 0,
          notes: c.notes || '',
          set_by: req.user._id,
        },
        { upsert: true, new: true }
      );
      results.push(doc);
    }

    res.json({ message: `Saved ${results.length} canteen charges`, results });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /canteen/charges/:id/daily-log  — add a daily log entry
const addDailyLog = async (req, res) => {
  try {
    const charge = await CanteenCharge.findById(req.params.id);
    if (!charge) return res.status(404).json({ message: 'Charge record not found' });

    const { date, description, amount, items } = req.body;
    charge.daily_log.push({ date, description, amount, items: items || [] });

    // Recalculate total from daily log
    charge.amount = charge.daily_log.reduce((sum, d) => sum + (d.amount || 0), 0);
    await charge.save();
    res.json(charge);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const removeDailyLog = async (req, res) => {
  try {
    const charge = await CanteenCharge.findById(req.params.id);
    if (!charge) return res.status(404).json({ message: 'Charge record not found' });
    charge.daily_log = charge.daily_log.filter(d => d._id.toString() !== req.params.logId);
    charge.amount = charge.daily_log.reduce((sum, d) => sum + (d.amount || 0), 0);
    await charge.save();
    res.json(charge);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /canteen/push-to-invoices  — inject canteen line into existing fee invoices
const pushToInvoices = async (req, res) => {
  try {
    const { month, class_id } = req.body;
    if (!month) return res.status(400).json({ message: 'month is required' });

    const filter = { month, amount: { $gt: 0 } };
    if (class_id) filter.class_id = class_id;

    const charges = await CanteenCharge.find(filter);
    let pushed = 0, skipped = 0, noInvoice = 0;

    for (const charge of charges) {
      const invoice = await FeeInvoice.findOne({ student_id: charge.student_id, month });
      if (!invoice) { noInvoice++; continue; }

      const existingIdx = invoice.items.findIndex(i => i.fee_head_name === 'Canteen');
      if (existingIdx >= 0) {
        // Update existing canteen line
        const diff = charge.amount - invoice.items[existingIdx].amount;
        invoice.items[existingIdx].amount = charge.amount;
        invoice.total_amount += diff;
        invoice.balance      += diff;
      } else {
        // Add new canteen line
        invoice.items.push({ fee_head_name: 'Canteen', amount: charge.amount, is_paid: false, paid_amount: 0 });
        invoice.total_amount += charge.amount;
        invoice.balance      += charge.amount;
      }

      // Recalculate status
      if (invoice.paid_amount <= 0) invoice.status = 'unpaid';
      else if (invoice.paid_amount >= invoice.total_amount) invoice.status = 'paid';
      else invoice.status = 'partial';

      await invoice.save();
      await CanteenCharge.findByIdAndUpdate(charge._id, {
        status: 'invoiced',
        fee_invoice_id: invoice._id,
      });
      pushed++;
    }

    res.json({ message: `Pushed to ${pushed} invoices. ${noInvoice} had no invoice yet. ${skipped} skipped.`, pushed, noInvoice });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /canteen/report?month=2026-06
const getMonthlyReport = async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: 'month is required' });

    const charges = await CanteenCharge.find({ month })
      .populate('student_id', 'full_name roll_number section')
      .populate('class_id', 'name grade_level section')
      .sort({ 'class_id.name': 1 });

    // Group by class
    const classMap = {};
    for (const c of charges) {
      const key = c.class_id ? c.class_id._id.toString() : 'unknown';
      if (!classMap[key]) {
        classMap[key] = {
          class_id:   c.class_id?._id,
          class_name: c.class_id?.name || 'Unknown',
          students:   [],
          total:      0,
          paid:       0,
          pending:    0,
        };
      }
      classMap[key].students.push(c);
      classMap[key].total += c.amount;
      if (c.status === 'paid')     classMap[key].paid    += c.amount;
      else                          classMap[key].pending += c.amount;
    }

    const grandTotal   = charges.reduce((s, c) => s + c.amount, 0);
    const grandInvoiced = charges.filter(c => c.status !== 'pending').length;

    res.json({
      month,
      classes: Object.values(classMap),
      summary: {
        total_students: charges.length,
        total_amount:   grandTotal,
        invoiced:       grandInvoiced,
        pending:        charges.length - grandInvoiced,
      },
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ─── PORTAL FUNCTIONS ────────────────────────────────────────────────────────

const getMyCanteen = async (req, res) => {
  try {
    const charges = await CanteenCharge.find({ student_id: req.user.student_id })
      .sort({ month: -1 })
      .limit(12);
    res.json(charges);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getChildCanteen = async (req, res) => {
  try {
    const charges = await CanteenCharge.find({ student_id: req.params.studentId })
      .sort({ month: -1 })
      .limit(12);
    res.json(charges);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = {
  getMenuItems, addMenuItem, updateMenuItem, deleteMenuItem,
  getClassCharges, bulkSaveCharges, addDailyLog, removeDailyLog,
  pushToInvoices, getMonthlyReport,
  getMyCanteen, getChildCanteen,
};
