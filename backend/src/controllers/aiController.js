const { GoogleGenerativeAI } = require('@google/generative-ai');
const Student      = require('../models/Student');
const FeeInvoice   = require('../models/FeeInvoice');
const SchoolClass  = require('../models/SchoolClass');
const Transaction  = require('../models/Transaction');
const Attendance   = require('../models/Attendance');
const ReportCard   = require('../models/ReportCard');
const MarksEntry   = require('../models/MarksEntry');
const Announcement = require('../models/Announcement');
const User         = require('../models/User');
const Leave        = require('../models/Leave');
const Fine         = require('../models/Fine');

// ── Tool Implementations (actual MongoDB queries) ──────────────────────────

const tools = {

  async get_fee_overview() {
    const [unpaid, partial, paid] = await Promise.all([
      FeeInvoice.countDocuments({ status: 'unpaid' }),
      FeeInvoice.countDocuments({ status: 'partial' }),
      FeeInvoice.countDocuments({ status: 'paid' }),
    ]);
    const agg = await FeeInvoice.aggregate([
      { $group: { _id: null, invoiced: { $sum: '$total_amount' }, collected: { $sum: '$paid_amount' } } },
    ]);
    const { invoiced = 0, collected = 0 } = agg[0] || {};
    return {
      total_invoiced: invoiced,
      total_collected: collected,
      total_pending: invoiced - collected,
      collection_rate: invoiced > 0 ? `${Math.round(collected / invoiced * 100)}%` : '0%',
      paid_invoices: paid,
      partial_invoices: partial,
      unpaid_invoices: unpaid,
    };
  },

  async get_class_fee_status({ class_name } = {}) {
    const filter = class_name ? { name: { $regex: class_name, $options: 'i' } } : {};
    const classes = await SchoolClass.find(filter).lean();
    const result = [];
    for (const cls of classes) {
      const agg = await FeeInvoice.aggregate([
        { $match: { class_id: cls._id } },
        { $group: { _id: '$status', count: { $sum: 1 }, invoiced: { $sum: '$total_amount' }, paid: { $sum: '$paid_amount' } } },
      ]);
      let paid = 0, unpaid = 0, partial = 0, totalInvoiced = 0, totalCollected = 0;
      agg.forEach(r => {
        if (r._id === 'paid')    { paid    = r.count; }
        if (r._id === 'unpaid')  { unpaid  = r.count; }
        if (r._id === 'partial') { partial = r.count; }
        totalInvoiced  += r.invoiced;
        totalCollected += r.paid;
      });
      const students = await Student.countDocuments({ school_class_id: cls._id, isActive: true });
      result.push({
        class: `${cls.name}${cls.section ? ' ' + cls.section : ''}`,
        total_students: students,
        paid_invoices: paid,
        partial_invoices: partial,
        unpaid_invoices: unpaid,
        total_invoiced: totalInvoiced,
        total_collected: totalCollected,
        total_pending: totalInvoiced - totalCollected,
        collection_rate: totalInvoiced > 0 ? `${Math.round(totalCollected / totalInvoiced * 100)}%` : '0%',
        fully_cleared: unpaid === 0 && partial === 0,
      });
    }
    return result.sort((a, b) => b.total_invoiced - a.total_invoiced);
  },

  async get_fee_defaulters({ limit = 20 } = {}) {
    const invoices = await FeeInvoice.find({ status: { $in: ['unpaid', 'partial'] } })
      .populate('student_id', 'full_name roll_number')
      .populate('class_id', 'name section')
      .sort({ balance: -1 })
      .limit(limit)
      .lean();
    return invoices.map(inv => ({
      student: inv.student_id?.full_name || 'Unknown',
      roll_number: inv.student_id?.roll_number || '—',
      class: inv.class_id ? `${inv.class_id.name} ${inv.class_id.section || ''}`.trim() : '—',
      month: inv.month,
      total_amount: inv.total_amount,
      paid_amount: inv.paid_amount,
      balance_due: inv.balance,
      status: inv.status,
    }));
  },

  async get_attendance_today() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999);
    const [present, absent, late, total] = await Promise.all([
      Attendance.countDocuments({ date: { $gte: today, $lte: todayEnd }, status: 'present' }),
      Attendance.countDocuments({ date: { $gte: today, $lte: todayEnd }, status: 'absent' }),
      Attendance.countDocuments({ date: { $gte: today, $lte: todayEnd }, status: 'late' }),
      Attendance.countDocuments({ date: { $gte: today, $lte: todayEnd } }),
    ]);
    const students_present = await Attendance.countDocuments({ date: { $gte: today, $lte: todayEnd }, status: { $in: ['present', 'late'] }, person_type: 'Student' });
    const students_absent  = await Attendance.countDocuments({ date: { $gte: today, $lte: todayEnd }, status: 'absent', person_type: 'Student' });
    return {
      date: today.toDateString(),
      total_marked: total,
      present, absent, late,
      students_present,
      students_absent,
      overall_rate: total > 0 ? `${Math.round((present + late) / total * 100)}%` : '0%',
    };
  },

  async get_class_attendance({ class_name, date } = {}) {
    const d = date ? new Date(date) : new Date();
    d.setHours(0, 0, 0, 0);
    const dEnd = new Date(d); dEnd.setHours(23, 59, 59, 999);
    const filter = class_name ? { name: { $regex: class_name, $options: 'i' } } : {};
    const classes = await SchoolClass.find(filter).lean();
    const result = [];
    for (const cls of classes) {
      const students = await Student.find({ school_class_id: cls._id, isActive: true }).select('_id').lean();
      const ids = students.map(s => s._id);
      const [present, absent, late, total] = await Promise.all([
        Attendance.countDocuments({ person_id: { $in: ids }, date: { $gte: d, $lte: dEnd }, status: 'present' }),
        Attendance.countDocuments({ person_id: { $in: ids }, date: { $gte: d, $lte: dEnd }, status: 'absent' }),
        Attendance.countDocuments({ person_id: { $in: ids }, date: { $gte: d, $lte: dEnd }, status: 'late' }),
        Attendance.countDocuments({ person_id: { $in: ids }, date: { $gte: d, $lte: dEnd } }),
      ]);
      result.push({
        class: `${cls.name}${cls.section ? ' ' + cls.section : ''}`,
        total_students: students.length,
        marked: total,
        present, absent, late,
        not_marked: students.length - total,
        rate: total > 0 ? `${Math.round((present + late) / total * 100)}%` : 'Not marked yet',
      });
    }
    return result.filter(r => r.total_students > 0);
  },

  async get_enrollment_stats() {
    const classes = await SchoolClass.find().lean();
    const result = [];
    for (const cls of classes) {
      const [total, male, female] = await Promise.all([
        Student.countDocuments({ school_class_id: cls._id, isActive: true }),
        Student.countDocuments({ school_class_id: cls._id, isActive: true, gender: 'male' }),
        Student.countDocuments({ school_class_id: cls._id, isActive: true, gender: 'female' }),
      ]);
      if (total > 0) result.push({ class: `${cls.name}${cls.section ? ' ' + cls.section : ''}`, total, male, female });
    }
    const totalStudents = await Student.countDocuments({ isActive: true });
    const totalStaff    = await User.countDocuments({ role: { $in: ['teacher', 'admin', 'clerk', 'accountant'] } });
    return { total_students: totalStudents, total_staff: totalStaff, classes: result.sort((a, b) => b.total - a.total) };
  },

  async get_financial_summary({ months = 3 } = {}) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
    const [incAgg, expAgg] = await Promise.all([
      Transaction.aggregate([
        { $match: { type: 'income', date: { $gte: start } } },
        { $group: { _id: { $substr: ['$date', 0, 7] }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Transaction.aggregate([
        { $match: { type: 'expense', date: { $gte: start } } },
        { $group: { _id: { $substr: ['$date', 0, 7] }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);
    const totalIncome  = incAgg.reduce((s, r) => s + r.total, 0);
    const totalExpense = expAgg.reduce((s, r) => s + r.total, 0);
    return {
      period: `Last ${months} months`,
      total_income:  totalIncome,
      total_expense: totalExpense,
      net_profit:    totalIncome - totalExpense,
      monthly_income:  incAgg.map(r => ({ month: r._id, amount: r.total })),
      monthly_expense: expAgg.map(r => ({ month: r._id, amount: r.total })),
    };
  },

  async get_exam_results({ class_name } = {}) {
    const filter = class_name
      ? { name: { $regex: class_name, $options: 'i' } }
      : {};
    const classes = await SchoolClass.find(filter).lean();
    const result = [];
    for (const cls of classes) {
      const agg = await ReportCard.aggregate([
        { $match: { class_id: cls._id } },
        { $group: { _id: '$grade', count: { $sum: 1 }, avg: { $avg: '$percentage' } } },
      ]);
      const passCount = agg.filter(g => g._id !== 'F').reduce((s, g) => s + g.count, 0);
      const totalCount = agg.reduce((s, g) => s + g.count, 0);
      const avgPct = agg.reduce((s, g) => s + g.avg * g.count, 0) / (totalCount || 1);
      result.push({
        class: `${cls.name}${cls.section ? ' ' + cls.section : ''}`,
        total_cards: totalCount,
        pass_count: passCount,
        fail_count: totalCount - passCount,
        pass_rate: totalCount > 0 ? `${Math.round(passCount / totalCount * 100)}%` : '0%',
        average_percentage: Math.round(avgPct * 10) / 10,
        grade_breakdown: agg.map(g => ({ grade: g._id, count: g.count })),
      });
    }
    return result;
  },

  async get_student_info({ name, roll_number } = {}) {
    const filter = { isActive: true };
    if (name)        filter.full_name   = { $regex: name, $options: 'i' };
    if (roll_number) filter.roll_number = { $regex: roll_number, $options: 'i' };
    const students = await Student.find(filter)
      .populate('school_class_id', 'name section')
      .populate('academic_year_id', 'label')
      .limit(10).lean();
    return students.map(s => ({
      name: s.full_name,
      roll_number: s.roll_number,
      class: s.school_class_id ? `${s.school_class_id.name} ${s.school_class_id.section || ''}`.trim() : '—',
      academic_year: s.academic_year_id?.label || '—',
      father_name: s.father_name,
      phone: s.father_phone || s.phone,
      admission_date: s.admission_date ? new Date(s.admission_date).toDateString() : '—',
      gender: s.gender,
    }));
  },

  async get_pending_leaves() {
    const pending = await Leave.find({ status: 'pending' })
      .populate('user_id', 'name role')
      .sort({ createdAt: -1 })
      .limit(20).lean();
    return {
      count: pending.length,
      leaves: pending.map(l => ({
        person: l.user_id?.name || 'Unknown',
        role:   l.user_id?.role || '—',
        from:   l.start_date ? new Date(l.start_date).toDateString() : '—',
        to:     l.end_date   ? new Date(l.end_date).toDateString()   : '—',
        reason: l.reason,
        type:   l.leave_type,
      })),
    };
  },

  async get_recent_announcements({ limit = 5 } = {}) {
    const items = await Announcement.find()
      .sort({ createdAt: -1 }).limit(limit)
      .populate('created_by', 'name').lean();
    return items.map(a => ({
      title:   a.title,
      target:  a.target_roles?.join(', ') || 'All',
      date:    new Date(a.createdAt).toDateString(),
      author:  a.created_by?.name || 'Admin',
    }));
  },

  async get_fee_collection_this_month() {
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const agg = await FeeInvoice.aggregate([
      { $match: { month: monthStr } },
      { $group: { _id: '$status', count: { $sum: 1 }, invoiced: { $sum: '$total_amount' }, collected: { $sum: '$paid_amount' } } },
    ]);
    let result = { month: monthStr, paid: 0, partial: 0, unpaid: 0, total_invoiced: 0, total_collected: 0 };
    agg.forEach(r => {
      result[r._id]          = r.count;
      result.total_invoiced  += r.invoiced;
      result.total_collected += r.collected;
    });
    result.total_pending     = result.total_invoiced - result.total_collected;
    result.collection_rate   = result.total_invoiced > 0
      ? `${Math.round(result.total_collected / result.total_invoiced * 100)}%`
      : '0%';
    return result;
  },
};

// ── Tool Definitions for Gemini ────────────────────────────────────────────

const toolDeclarations = [
  {
    name: 'get_fee_overview',
    description: 'Get overall fee collection summary: total invoiced, collected, pending, collection rate, and invoice status counts across the entire school.',
    parameters: { type: 'OBJECT', properties: {}, required: [] },
  },
  {
    name: 'get_class_fee_status',
    description: 'Get fee collection status broken down by each class. Shows which classes have cleared fees and which have pending amounts. Can filter by class name.',
    parameters: {
      type: 'OBJECT',
      properties: {
        class_name: { type: 'STRING', description: 'Filter by class name (e.g. "Class 5", "7"). Leave empty for all classes.' },
      },
      required: [],
    },
  },
  {
    name: 'get_fee_defaulters',
    description: 'Get list of students with unpaid or partial fee invoices — the fee defaulters.',
    parameters: {
      type: 'OBJECT',
      properties: {
        limit: { type: 'NUMBER', description: 'Max number of defaulters to return (default 20).' },
      },
      required: [],
    },
  },
  {
    name: 'get_attendance_today',
    description: "Get today's attendance summary for the whole school: present, absent, late counts.",
    parameters: { type: 'OBJECT', properties: {}, required: [] },
  },
  {
    name: 'get_class_attendance',
    description: 'Get attendance breakdown by class for a specific date (default today). Can filter by class name.',
    parameters: {
      type: 'OBJECT',
      properties: {
        class_name: { type: 'STRING', description: 'Filter by class name. Leave empty for all classes.' },
        date:       { type: 'STRING', description: 'Date in YYYY-MM-DD format. Leave empty for today.' },
      },
      required: [],
    },
  },
  {
    name: 'get_enrollment_stats',
    description: 'Get student enrollment numbers: total students, staff count, and breakdown by class including gender split.',
    parameters: { type: 'OBJECT', properties: {}, required: [] },
  },
  {
    name: 'get_financial_summary',
    description: 'Get income and expense financial summary for the last N months.',
    parameters: {
      type: 'OBJECT',
      properties: {
        months: { type: 'NUMBER', description: 'Number of past months to include (default 3, max 12).' },
      },
      required: [],
    },
  },
  {
    name: 'get_exam_results',
    description: 'Get exam/report card results and academic performance by class.',
    parameters: {
      type: 'OBJECT',
      properties: {
        class_name: { type: 'STRING', description: 'Filter by class name. Leave empty for all classes.' },
      },
      required: [],
    },
  },
  {
    name: 'get_student_info',
    description: 'Search for a specific student by name or roll number.',
    parameters: {
      type: 'OBJECT',
      properties: {
        name:        { type: 'STRING', description: 'Student name (partial match).' },
        roll_number: { type: 'STRING', description: 'Student roll number.' },
      },
      required: [],
    },
  },
  {
    name: 'get_pending_leaves',
    description: 'Get list of pending leave applications from staff or teachers waiting for approval.',
    parameters: { type: 'OBJECT', properties: {}, required: [] },
  },
  {
    name: 'get_recent_announcements',
    description: 'Get recently posted announcements.',
    parameters: {
      type: 'OBJECT',
      properties: {
        limit: { type: 'NUMBER', description: 'Number of announcements to return (default 5).' },
      },
      required: [],
    },
  },
  {
    name: 'get_fee_collection_this_month',
    description: "Get this month's fee collection specifically: how much invoiced, collected, and pending.",
    parameters: { type: 'OBJECT', properties: {}, required: [] },
  },
];

// ── Main Chat Handler ──────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an intelligent AI assistant for "The Best Way Public School" administration system.
You have access to the school's live database through tools. Always use tools to fetch real data before answering.
Be concise but complete. Format numbers with commas. Use PKR for currency amounts.
When showing lists, use bullet points. When comparing classes, present data clearly.
Always be helpful, professional, and accurate. If data is empty or zero, say so clearly.
Today's date is ${new Date().toDateString()}.`;

const chat = async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({
        message: 'GEMINI_API_KEY not configured. Add it to backend/.env and rebuild.',
      });
    }

    const { message, history = [] } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: 'message required' });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-lite',
      systemInstruction: SYSTEM_PROMPT,
      tools: [{ functionDeclarations: toolDeclarations }],
    });

    // Build conversation history for context — keep last 4 turns to save tokens
    const formattedHistory = history.slice(-4).map(h => ({
      role:  h.role,
      parts: [{ text: h.text }],
    }));

    const chatSession = model.startChat({ history: formattedHistory });

    let response = await chatSession.sendMessage(message);
    let candidate = response.response;

    // Function calling loop — max 3 iterations to conserve free-tier quota
    let iterations = 0;
    while (candidate.functionCalls()?.length && iterations < 3) {
      iterations++;
      const calls = candidate.functionCalls();
      const results = [];

      for (const call of calls) {
        const fn = tools[call.name];
        let output;
        if (fn) {
          try {
            output = await fn(call.args || {});
          } catch (err) {
            output = { error: err.message };
          }
        } else {
          output = { error: `Unknown tool: ${call.name}` };
        }
        results.push({
          functionResponse: {
            name:     call.name,
            response: { result: output },
          },
        });
      }

      response  = await chatSession.sendMessage(results);
      candidate = response.response;
    }

    const text = candidate.text();
    res.json({ reply: text });
  } catch (err) {
    console.error('AI chat error:', err.message);
    if (err.message?.includes('API_KEY_INVALID') || err.message?.includes('API key not valid')) {
      return res.status(400).json({ message: 'Invalid Gemini API key. Check GEMINI_API_KEY in backend/.env' });
    }
    // Only treat actual HTTP 429 as quota error
    if (err.message?.includes('[429') || err.message?.includes('Too Many Requests')) {
      return res.status(429).json({ message: 'Gemini quota exceeded. Please wait a minute and try again.' });
    }
    // Pass the real Google error through so we can see what's actually wrong
    res.status(500).json({ message: err.message || 'AI service error' });
  }
};

module.exports = { chat };
