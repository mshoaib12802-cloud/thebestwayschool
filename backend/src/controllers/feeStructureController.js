const FeeHead = require('../models/FeeHead');
const FeeStructure = require('../models/FeeStructure');
const FeeInvoice = require('../models/FeeInvoice');
const Student = require('../models/Student');
const Transaction = require('../models/Transaction');

// ─── FEE HEADS ───────────────────────────────────────────────────────────────
const getFeeHeads = async (req, res) => {
  try {
    const heads = await FeeHead.find({ is_active: true }).sort({ name: 1 });
    res.json(heads);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const addFeeHead = async (req, res) => {
  try {
    const { name, description, is_recurring } = req.body;
    const head = await FeeHead.create({ name, description, is_recurring, created_by: req.user._id });
    res.status(201).json(head);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Fee head name already exists' });
    res.status(500).json({ message: 'Server error' });
  }
};

const updateFeeHead = async (req, res) => {
  try {
    const head = await FeeHead.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!head) return res.status(404).json({ message: 'Not found' });
    res.json(head);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const deleteFeeHead = async (req, res) => {
  try {
    await FeeHead.findByIdAndUpdate(req.params.id, { is_active: false });
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ message: 'Server error' }); }
};

// ─── FEE STRUCTURES ──────────────────────────────────────────────────────────
const getFeeStructures = async (req, res) => {
  try {
    const { class_id, academic_year_id } = req.query;
    const filter = {};
    if (class_id) filter.class_id = class_id;
    if (academic_year_id) filter.academic_year_id = academic_year_id;
    const structures = await FeeStructure.find(filter)
      .populate('class_id', 'name grade_level section')
      .populate('academic_year_id', 'label')
      .sort({ createdAt: -1 });
    res.json(structures);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const upsertFeeStructure = async (req, res) => {
  try {
    const { class_id, academic_year_id, items, due_day } = req.body;
    const structure = await FeeStructure.findOneAndUpdate(
      { class_id, academic_year_id },
      { items, due_day, created_by: req.user._id },
      { upsert: true, new: true }
    ).populate('class_id', 'name grade_level section').populate('academic_year_id', 'label');
    res.json(structure);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const deleteFeeStructure = async (req, res) => {
  try {
    await FeeStructure.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ message: 'Server error' }); }
};

// ─── INVOICES ────────────────────────────────────────────────────────────────
const generateInvoices = async (req, res) => {
  try {
    const { class_id, academic_year_id, month } = req.body; // month = "2026-01"
    if (!class_id || !academic_year_id || !month)
      return res.status(400).json({ message: 'class_id, academic_year_id and month are required' });

    const structure = await FeeStructure.findOne({ class_id, academic_year_id });
    if (!structure || !structure.items.length)
      return res.status(404).json({ message: 'No fee structure defined for this class/year' });

    const students = await Student.find({ school_class_id: class_id, academic_year_id, isActive: true });
    if (!students.length)
      return res.status(404).json({ message: 'No active students in this class' });

    const [year, mon] = month.split('-').map(Number);
    const dueDate = new Date(year, mon - 1, structure.due_day);
    const totalAmount = structure.items.reduce((sum, i) => sum + i.amount, 0);

    let created = 0, skipped = 0;
    for (const student of students) {
      try {
        await FeeInvoice.create({
          student_id: student._id,
          class_id,
          academic_year_id,
          month,
          items: structure.items.map(i => ({
            fee_head_id: i.fee_head_id,
            fee_head_name: i.fee_head_name || '',
            amount: i.amount,
          })),
          total_amount: totalAmount,
          paid_amount: 0,
          balance: totalAmount,
          due_date: dueDate,
          generated_by: req.user._id,
        });
        created++;
      } catch (e) {
        if (e.code === 11000) skipped++; // already exists
        else throw e;
      }
    }
    res.json({ message: `Generated ${created} invoices. ${skipped} already existed.`, created, skipped });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

const getInvoices = async (req, res) => {
  try {
    const { class_id, academic_year_id, month, status, student_id } = req.query;
    const filter = {};
    if (class_id) filter.class_id = class_id;
    if (academic_year_id) filter.academic_year_id = academic_year_id;
    if (month) filter.month = month;
    if (status) filter.status = status;
    if (student_id) filter.student_id = student_id;
    const invoices = await FeeInvoice.find(filter)
      .populate('student_id', 'full_name roll_number')
      .populate('class_id', 'name grade_level section')
      .sort({ due_date: -1, 'student_id.full_name': 1 });
    res.json(invoices);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const recordPayment = async (req, res) => {
  try {
    const { amount, payment_method, notes } = req.body;
    const invoice = await FeeInvoice.findById(req.params.id).populate('student_id', 'full_name');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (invoice.status === 'paid') return res.status(400).json({ message: 'Already fully paid' });

    const paying = Number(amount);
    const newPaid = Math.min(invoice.paid_amount + paying, invoice.total_amount);
    const newBalance = invoice.total_amount - newPaid;
    const newStatus = newBalance <= 0 ? 'paid' : 'partial';

    const tx = await Transaction.create({
      type: 'income',
      category: 'fee_collection',
      amount: paying,
      description: `Fee invoice ${invoice.month} - ${invoice.student_id?.full_name}`,
      payment_method: payment_method || 'cash',
      student_id: invoice.student_id._id || invoice.student_id,
      date: new Date(),
      recorded_by: req.user._id,
    });

    invoice.paid_amount = newPaid;
    invoice.balance = newBalance;
    invoice.status = newStatus;
    if (notes) invoice.notes = notes;
    await invoice.save();

    res.json({ invoice, transaction: tx });
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const getStudentInvoices = async (req, res) => {
  try {
    const student = await Student.findOne({ user_id: req.user._id });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    const invoices = await FeeInvoice.find({ student_id: student._id }).sort({ month: -1 });
    res.json(invoices);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const getChildInvoices = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findById(studentId);
    if (!student || String(student.parent_id) !== String(req.user._id))
      return res.status(403).json({ message: 'Access denied' });
    const invoices = await FeeInvoice.find({ student_id: studentId }).sort({ month: -1 });
    res.json(invoices);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

// Create a single invoice for one student at enrollment time
const createSingleInvoice = async (req, res) => {
  try {
    const {
      student_id, class_id, academic_year_id, month,
      items, discount_amount, total_amount, paid_amount,
      balance, status, notes, payment_method,
    } = req.body;

    if (!student_id || !month || !items?.length)
      return res.status(400).json({ message: 'student_id, month, and items are required' });

    const now = new Date();
    const [yr, mo] = month.split('-').map(Number);
    const dueDate  = new Date(yr, mo - 1, 10);

    const invoice = await FeeInvoice.create({
      student_id,
      class_id,
      academic_year_id,
      month,
      items: items.map(it => ({
        fee_head_id:   it.fee_head_id,
        fee_head_name: it.fee_head_name,
        amount:        it.amount,
        is_paid:       paid_amount >= total_amount,
        paid_amount:   paid_amount >= total_amount ? it.amount : 0,
      })),
      total_amount:    total_amount || 0,
      paid_amount:     paid_amount  || 0,
      balance:         balance      ?? (total_amount - (paid_amount || 0)),
      status:          status       || 'unpaid',
      due_date:        dueDate,
      notes:           notes || '',
      generated_by:    req.user._id,
    });

    // If some amount paid at enrollment, record a Transaction too
    if ((paid_amount || 0) > 0) {
      await Transaction.create({
        type:           'income',
        category:       'fee_collection',
        amount:         paid_amount,
        description:    `Enrollment fee — ${month}`,
        payment_method: payment_method || 'cash',
        student_id,
        date:           now,
        recorded_by:    req.user._id,
      });
    }

    res.status(201).json(invoice);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Invoice for this student/month already exists' });
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

module.exports = {
  getFeeHeads, addFeeHead, updateFeeHead, deleteFeeHead,
  getFeeStructures, upsertFeeStructure, deleteFeeStructure,
  generateInvoices, getInvoices, recordPayment,
  getStudentInvoices, getChildInvoices, createSingleInvoice,
};
