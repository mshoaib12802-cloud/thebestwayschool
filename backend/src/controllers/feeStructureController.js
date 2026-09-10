const FeeHead = require('../models/FeeHead');
const FeeStructure = require('../models/FeeStructure');
const FeeInvoice = require('../models/FeeInvoice');
const Student = require('../models/Student');
const Transaction = require('../models/Transaction');
const {
  splitRecurring, loadConcessions, applyConcessions,
  finePerDay, refreshInvoice, sweepLateFines,
  collectArrears, closeRolledForward,
} = require('../utils/feeAdjustments');

// Active students that appear to share a parent with the given student —
// matched by phone number, the same technique the parent portal uses to
// link siblings under one login.
const findSiblingStudents = async (student) => {
  const phones = [student.father_phone, student.mother_phone, student.guardian_phone]
    .filter(p => p && p.replace(/[^0-9]/g, '').length >= 7);
  if (!phones.length) return [];

  const regexes = phones.map(p => {
    const tail = p.replace(/[^0-9]/g, '').slice(-8);
    return new RegExp(tail.split('').join('[^0-9]?'));
  });

  return Student.find({
    _id: { $ne: student._id },
    isActive: true,
    $or: regexes.flatMap(re => [
      { father_phone: re }, { mother_phone: re }, { guardian_phone: re },
    ]),
  });
};

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

    // One-time heads (Admission Fee etc.) belong to enrolment, not to the
    // monthly run — billing them here would charge them every month.
    const { recurring } = await splitRecurring(structure.items);
    if (!recurring.length)
      return res.status(400).json({
        message: 'This structure only has one-time fee heads. Those are charged at enrolment, not monthly.',
      });

    const [year, mon] = month.split('-').map(Number);
    const dueDate = new Date(year, mon - 1, structure.due_day);
    const baseItems = recurring.map(i => ({
      fee_head_id: i.fee_head_id,
      fee_head_name: i.fee_head_name || '',
      amount: i.amount,
    }));

    const concessionsByStudent = await loadConcessions(students.map(s => s._id), academic_year_id);

    // Bring every invoice's late fine up to date first, so arrears folded in
    // below reflect the real amount currently owed, not a stale balance.
    await sweepLateFines();

    let created = 0, skipped = 0, discounted = 0, arrearsRolled = 0;
    const handledIds = new Set(students.map(s => String(s._id)));
    for (const student of students) {
      try {
        const { items, discount, applied } = applyConcessions(
          baseItems, concessionsByStudent.get(String(student._id)) || []
        );
        if (discount > 0) discounted++;

        const { amount: arrears, sourceIds } = await collectArrears(student._id);
        const finalItems = arrears > 0
          ? [...items, { fee_head_name: 'Previous Balance (Arrears)', amount: arrears }]
          : items;
        const totalAmount = finalItems.reduce((sum, i) => sum + i.amount, 0);

        const invoice = await FeeInvoice.create({
          student_id: student._id,
          class_id,
          academic_year_id,
          month,
          items: finalItems,
          total_amount: totalAmount,
          discount_amount: discount,
          concessions: applied,
          paid_amount: 0,
          balance: totalAmount,
          due_date: dueDate,
          generated_by: req.user._id,
          arrears_from: sourceIds,
        });
        created++;
        if (sourceIds.length) {
          await closeRolledForward(sourceIds, invoice._id);
          arrearsRolled += sourceIds.length;
        }
      } catch (e) {
        if (e.code === 11000) skipped++; // already exists
        else throw e;
      }
    }

    // A sibling (same parent, matched by phone) may be enrolled in a
    // different class — generate their invoice too, using their own class's
    // fee structure, so both vouchers are ready and connected together.
    let siblingsCreated = 0;
    for (const student of students) {
      const siblings = await findSiblingStudents(student);
      for (const sib of siblings) {
        const sibId = String(sib._id);
        if (handledIds.has(sibId)) continue;
        handledIds.add(sibId);
        if (!sib.school_class_id || !sib.academic_year_id) continue;

        const exists = await FeeInvoice.exists({ student_id: sib._id, month, academic_year_id: sib.academic_year_id });
        if (exists) continue;

        const sibStructure = await FeeStructure.findOne({ class_id: sib.school_class_id, academic_year_id: sib.academic_year_id });
        if (!sibStructure || !sibStructure.items.length) continue;
        const { recurring: sibRecurring } = await splitRecurring(sibStructure.items);
        if (!sibRecurring.length) continue;

        const sibBaseItems = sibRecurring.map(i => ({
          fee_head_id: i.fee_head_id,
          fee_head_name: i.fee_head_name || '',
          amount: i.amount,
        }));
        const sibConcessions = (await loadConcessions([sib._id], sib.academic_year_id)).get(String(sib._id)) || [];
        const { items: sibItems, discount: sibDiscount, applied: sibApplied } = applyConcessions(sibBaseItems, sibConcessions);
        const sibDueDate = new Date(year, mon - 1, sibStructure.due_day);

        const { amount: sibArrears, sourceIds: sibSourceIds } = await collectArrears(sib._id);
        const sibFinalItems = sibArrears > 0
          ? [...sibItems, { fee_head_name: 'Previous Balance (Arrears)', amount: sibArrears }]
          : sibItems;
        const sibTotal = sibFinalItems.reduce((sum, i) => sum + i.amount, 0);

        try {
          const sibInvoice = await FeeInvoice.create({
            student_id: sib._id,
            class_id: sib.school_class_id,
            academic_year_id: sib.academic_year_id,
            month,
            items: sibFinalItems,
            total_amount: sibTotal,
            discount_amount: sibDiscount,
            concessions: sibApplied,
            paid_amount: 0,
            balance: sibTotal,
            due_date: sibDueDate,
            generated_by: req.user._id,
            arrears_from: sibSourceIds,
          });
          siblingsCreated++;
          if (sibDiscount > 0) discounted++;
          if (sibSourceIds.length) {
            await closeRolledForward(sibSourceIds, sibInvoice._id);
            arrearsRolled += sibSourceIds.length;
          }
        } catch (e) {
          if (e.code !== 11000) throw e; // already exists — fine, skip
        }
      }
    }

    const note = discounted ? ` ${discounted} had a concession applied.` : '';
    const sibNote = siblingsCreated ? ` ${siblingsCreated} sibling invoice(s) auto-created.` : '';
    const arrearsNote = arrearsRolled ? ` ${arrearsRolled} prior unpaid invoice(s) rolled forward as arrears.` : '';
    res.json({
      message: `Generated ${created} invoices. ${skipped} already existed.${note}${sibNote}${arrearsNote}`,
      created, skipped, discounted, siblingsCreated, arrearsRolled,
    });
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
    await sweepLateFines();
    const invoices = await FeeInvoice.find(filter)
      .populate('student_id', 'full_name roll_number father_name')
      .populate('class_id', 'name grade_level section')
      .sort({ due_date: -1, 'student_id.full_name': 1 });
    res.json(invoices);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

// Other invoices, same month, belonging to a sibling of this invoice's student
// (matched the same way the parent portal links siblings — by phone number),
// so their fee vouchers can be printed together for one parent.
const getInvoiceSiblings = async (req, res) => {
  try {
    const invoice = await FeeInvoice.findById(req.params.id)
      .populate('student_id', 'father_phone mother_phone guardian_phone');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const siblings = await findSiblingStudents(invoice.student_id);
    if (!siblings.length) return res.json([]);

    const invoices = await FeeInvoice.find({
      student_id: { $in: siblings.map(s => s._id) },
      month: invoice.month,
    })
      .populate('student_id', 'full_name roll_number father_name')
      .populate('class_id', 'name grade_level section')
      .sort({ 'student_id.full_name': 1 });

    res.json(invoices);
  } catch (err) { res.status(500).json({ message: err.message || 'Server error' }); }
};

const recordPayment = async (req, res) => {
  try {
    const { amount, payment_method, notes } = req.body;
    const invoice = await FeeInvoice.findById(req.params.id).populate('student_id', 'full_name');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (invoice.status === 'rolled_forward')
      return res.status(400).json({ message: 'This invoice was rolled forward into a later invoice — collect payment there instead.' });

    // Settle any fine accrued since this invoice was last read before taking money.
    refreshInvoice(invoice, await finePerDay());
    if (invoice.status === 'paid') return res.status(400).json({ message: 'Already fully paid' });

    const paying = Number(amount);
    const payable = invoice.total_amount + (invoice.late_fine || 0);
    const newPaid = Math.min(invoice.paid_amount + paying, payable);
    const newBalance = payable - newPaid;
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
    await sweepLateFines();
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
    await sweepLateFines();
    const invoices = await FeeInvoice.find({ student_id: studentId }).sort({ month: -1 });
    res.json(invoices);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

// Create a single invoice for one student at enrollment time
const createSingleInvoice = async (req, res) => {
  try {
    const {
      student_id, class_id, academic_year_id, month,
      items, discount_amount, paid_amount,
      notes, payment_method,
    } = req.body;

    if (!student_id || !month || !items?.length)
      return res.status(400).json({ message: 'student_id, month, and items are required' });

    const now = new Date();
    const [yr, mo] = month.split('-').map(Number);
    const dueDate  = new Date(yr, mo - 1, 10);

    // Totals are recomputed here rather than trusted from the client, so a
    // concession the enrolling clerk could not see still gets applied.
    const concessions = (await loadConcessions([student_id], academic_year_id)).get(String(student_id)) || [];
    const { items: pricedItems, discount: concessionDiscount, applied } = applyConcessions(
      items.map(it => ({
        fee_head_id:   it.fee_head_id,
        fee_head_name: it.fee_head_name,
        amount:        Number(it.amount) || 0,
      })),
      concessions
    );

    const manualDiscount = Math.max(0, Number(discount_amount) || 0);
    const gross    = pricedItems.reduce((sum, i) => sum + i.amount, 0);
    const total    = Math.max(0, gross - manualDiscount);
    const paid     = Math.min(Math.max(0, Number(paid_amount) || 0), total);
    const settled  = paid >= total;

    const invoice = await FeeInvoice.create({
      student_id,
      class_id,
      academic_year_id,
      month,
      items: pricedItems.map(it => ({
        ...it,
        is_paid:     settled,
        paid_amount: settled ? it.amount : 0,
      })),
      total_amount:    total,
      discount_amount: concessionDiscount + manualDiscount,
      concessions:     applied,
      paid_amount:     paid,
      balance:         total - paid,
      status:          settled ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
      due_date:        dueDate,
      notes:           notes || '',
      generated_by:    req.user._id,
    });

    // If some amount paid at enrollment, record a Transaction too
    if (paid > 0) {
      await Transaction.create({
        type:           'income',
        category:       'fee_collection',
        amount:         paid,
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
  generateInvoices, getInvoices, getInvoiceSiblings, recordPayment,
  getStudentInvoices, getChildInvoices, createSingleInvoice,
};
