const Concession = require('../models/Concession');
const FeeInvoice = require('../models/FeeInvoice');
const FeeHead = require('../models/FeeHead');
const InstituteSettings = require('../models/InstituteSettings');

const DAY_MS = 24 * 60 * 60 * 1000;
const money = n => Math.max(0, Math.round(n * 100) / 100);

// ─── Fee heads ───────────────────────────────────────────────────────────────

// One-time heads (Admission Fee and the like) are charged once when the student
// is enrolled, so they must be kept out of the recurring monthly run.
// Falls back to "recurring" for a head that is no longer in the collection,
// which is what the structure table already assumes.
async function splitRecurring(items = []) {
  const ids = items.map(i => i.fee_head_id).filter(Boolean);
  const heads = await FeeHead.find({ _id: { $in: ids } }).select('is_recurring').lean();
  const oneTime = new Set(
    heads.filter(h => h.is_recurring === false).map(h => String(h._id))
  );
  return {
    recurring: items.filter(i => !oneTime.has(String(i.fee_head_id))),
    oneTime:   items.filter(i =>  oneTime.has(String(i.fee_head_id))),
  };
}

// ─── Concessions ─────────────────────────────────────────────────────────────

function isLive(c, when) {
  if (c.valid_from && new Date(c.valid_from) > when) return false;
  if (c.valid_to   && new Date(c.valid_to)   < when) return false;
  return true;
}

// Active concessions for a set of students, grouped by student id.
// A concession pinned to another academic year does not apply.
async function loadConcessions(studentIds, academic_year_id) {
  const all = await Concession.find({
    student_id: { $in: studentIds },
    is_active: true,
  }).sort({ createdAt: 1 }).lean();

  const byStudent = new Map();
  for (const c of all) {
    if (academic_year_id && c.academic_year_id &&
        String(c.academic_year_id) !== String(academic_year_id)) continue;
    const key = String(c.student_id);
    if (!byStudent.has(key)) byStudent.set(key, []);
    byStudent.get(key).push(c);
  }
  return byStudent;
}

// Discount a list of {fee_head_name, amount} by a student's concessions.
// Concessions stack in creation order and a percentage one is taken off the
// running amount — same maths as GET /api/concessions/calculate.
function applyConcessions(items = [], concessions = [], when = new Date()) {
  let discount = 0;
  const applied = [];

  const discounted = items.map(item => {
    let amount = Number(item.amount) || 0;

    for (const c of concessions) {
      if (!isLive(c, when)) continue;
      if (c.applicable_heads?.length && !c.applicable_heads.includes(item.fee_head_name)) continue;

      const cut = c.discount_type === 'percentage'
        ? amount * (Number(c.discount_value) || 0) / 100
        : Math.min(Number(c.discount_value) || 0, amount);
      if (cut <= 0) continue;

      amount -= cut;
      discount += cut;
      applied.push({
        label: c.label,
        fee_head_name: item.fee_head_name,
        discount_amount: money(cut),
      });
    }

    return { ...item, amount: money(amount) };
  });

  return { items: discounted, discount: money(discount), applied };
}

// ─── Late fine ───────────────────────────────────────────────────────────────

async function finePerDay() {
  const s = await InstituteSettings.findById('singleton').select('fine_per_day').lean();
  return Number(s?.fine_per_day) || 0;
}

// Fine stops accruing once the invoice is settled, so clearing a bill does not
// immediately reopen it with another day's charge.
function lateFineFor(invoice, perDay, now = new Date()) {
  if (invoice.status === 'paid') return Number(invoice.late_fine) || 0;
  if (!perDay || !invoice.due_date) return 0;

  const due = new Date(invoice.due_date); due.setHours(0, 0, 0, 0);
  const today = new Date(now);           today.setHours(0, 0, 0, 0);
  const overdueDays = Math.floor((today - due) / DAY_MS);

  return overdueDays > 0 ? money(overdueDays * perDay) : 0;
}

// Recompute fine, balance and status on a single invoice document.
// Returns true when something changed and the doc needs saving.
function refreshInvoice(invoice, perDay, now = new Date()) {
  const fine    = lateFineFor(invoice, perDay, now);
  const payable = (Number(invoice.total_amount) || 0) + fine;
  const paid    = Number(invoice.paid_amount) || 0;
  const balance = money(payable - paid);
  const status  = balance <= 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid';

  const changed = (Number(invoice.late_fine) || 0) !== fine
    || (Number(invoice.balance) || 0) !== balance
    || invoice.status !== status;

  invoice.late_fine = fine;
  invoice.balance   = balance;
  invoice.status    = status;
  return changed;
}

// There is no scheduler in this deployment, so fines are brought up to date
// on read. Sweeping the whole collection rather than just the rows being
// returned keeps the dashboard aggregations honest too. Only rows that
// actually moved are written, so repeat calls on the same day cost one find.
async function sweepLateFines() {
  const perDay = await finePerDay();
  const now = new Date();
  const today = new Date(now); today.setHours(0, 0, 0, 0);

  const overdue = perDay > 0
    ? { status: { $ne: 'paid' }, due_date: { $lt: today } }
    : { late_fine: { $gt: 0 }, status: { $ne: 'paid' } }; // setting switched off — refund it

  const invoices = await FeeInvoice.find(overdue);
  const ops = [];
  for (const inv of invoices) {
    if (!refreshInvoice(inv, perDay, now)) continue;
    ops.push({ updateOne: {
      filter: { _id: inv._id },
      update: { $set: { late_fine: inv.late_fine, balance: inv.balance, status: inv.status } },
    }});
  }
  if (ops.length) await FeeInvoice.bulkWrite(ops);
  return ops.length;
}

module.exports = {
  splitRecurring,
  loadConcessions,
  applyConcessions,
  finePerDay,
  lateFineFor,
  refreshInvoice,
  sweepLateFines,
};
