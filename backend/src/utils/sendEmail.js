const nodemailer = require('nodemailer');

const createTransport = () =>
  nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

// Plain-text email (fee alerts, general)
const sendEmail = async (to, subject, text) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('Email not configured (EMAIL_USER / EMAIL_PASS missing) — skipping.');
      return;
    }
    await createTransport().sendMail({
      from: `"Inflorescence Advance Skills" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    });
    console.log('Email sent to', to);
  } catch (error) {
    console.error('Email Error:', error.message);
  }
};

// HTML welcome email with login credentials
const sendCredentialsEmail = async ({ to, name, role, email, password }) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('Email not configured — skipping credentials email.');
      return;
    }

    const base = process.env.FRONTEND_URL || 'http://localhost:3000';
    const loginUrl = role === 'student'
      ? `${base}/student-login`
      : role === 'teacher'
        ? `${base}/teacher-login`
        : role === 'client'
          ? `${base}/client-login`
          : `${base}/login`;

    const roleLabel = role === 'student' ? 'Student' : role === 'teacher' ? 'Teacher' : role === 'client' ? 'Client' : 'Staff';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
    .container { background: #fff; border-radius: 8px; max-width: 560px; margin: 0 auto; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #1e3a5f; color: #fff; border-radius: 6px 6px 0 0; padding: 24px 32px; margin: -32px -32px 24px; }
    .header h1 { margin: 0; font-size: 22px; }
    .header p { margin: 4px 0 0; opacity: 0.8; font-size: 13px; }
    .greeting { font-size: 16px; color: #333; margin-bottom: 16px; }
    .box { background: #f0f5ff; border: 1px solid #c7d7f5; border-radius: 6px; padding: 20px 24px; margin: 20px 0; }
    .box p { margin: 6px 0; font-size: 14px; color: #444; }
    .box strong { color: #1e3a5f; }
    .btn { display: inline-block; background: #1e3a5f; color: #fff !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 15px; font-weight: bold; margin: 20px 0; }
    .warning { background: #fff8e1; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #555; margin-top: 16px; }
    .footer { font-size: 12px; color: #999; margin-top: 24px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Inflorescence Advance Skills</h1>
      <p>ERP Portal — Login Credentials</p>
    </div>
    <p class="greeting">Dear <strong>${name}</strong>,</p>
    <p>Welcome! Your <strong>${roleLabel}</strong> account has been created on the Inflorescence ERP Portal. Here are your login credentials:</p>
    <div class="box">
      <p><strong>Portal URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
      <p><strong>Email (Username):</strong> ${email}</p>
      <p><strong>Password:</strong> <code style="background:#e8edf5;padding:2px 6px;border-radius:3px;font-size:15px;">${password}</code></p>
    </div>
    <a href="${loginUrl}" class="btn">Login to Portal →</a>
    <div class="warning">
      ⚠️ Please keep your credentials safe. Do not share your password with anyone. You can change your password after logging in.
    </div>
    <div class="footer">
      Inflorescence Advance Skills &nbsp;|&nbsp; This is an automated email — do not reply.
    </div>
  </div>
</body>
</html>`;

    await createTransport().sendMail({
      from: `"Inflorescence Advance Skills" <${process.env.EMAIL_USER}>`,
      to,
      subject: `Your ${roleLabel} Portal Access — Inflorescence Advance Skills`,
      html,
      text: `Dear ${name},\n\nYour ${roleLabel} account has been created.\n\nLogin URL: ${loginUrl}\nEmail: ${email}\nPassword: ${password}\n\nPlease keep your credentials safe.\n\n— Inflorescence Advance Skills`,
    });

    console.log(`Credentials email sent to ${to}`);
  } catch (error) {
    console.error('Credentials email error:', error.message);
  }
};

// Styled invoice email sent to client when admin clicks "Send Invoice"
const sendInvoiceEmail = async ({ to, clientName, invoice, portalUrl }) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('Email not configured — skipping invoice email.');
      return;
    }

    const base = portalUrl || process.env.FRONTEND_URL || 'http://localhost:3000';
    const loginUrl = `${base}/client-login`;

    const itemsHtml = (invoice.items || []).map(it => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${it.description}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">${it.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">Rs. ${Number(it.unit_price).toLocaleString()}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:bold;">Rs. ${Number(it.total).toLocaleString()}</td>
      </tr>`).join('');

    const balance = (invoice.total || 0) - (invoice.paid_amount || 0);

    const html = `
<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px;">
  <div style="background:#fff;border-radius:8px;max-width:600px;margin:0 auto;padding:0;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;">
    <div style="background:linear-gradient(135deg,#b45309,#92400e);padding:28px 32px;color:#fff;">
      <h1 style="margin:0;font-size:20px;">Inflorescence Advance Skills</h1>
      <p style="margin:4px 0 0;opacity:0.85;font-size:13px;">Services Invoice</p>
    </div>
    <div style="padding:28px 32px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:24px;">
        <div>
          <p style="margin:0;font-size:13px;color:#888;font-weight:bold;">BILLED TO</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:bold;color:#1a1a1a;">${clientName}</p>
        </div>
        <div style="text-align:right;">
          <p style="margin:0;font-size:20px;font-weight:900;color:#b45309;">${invoice.invoice_no}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#888;">Due: ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</p>
        </div>
      </div>
      <p style="color:#444;margin-bottom:20px;">${invoice.title}</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead>
          <tr style="background:#92400e;color:#fff;">
            <th style="padding:10px 12px;text-align:left;font-size:12px;">Description</th>
            <th style="padding:10px 12px;text-align:center;font-size:12px;">Qty</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;">Unit Price</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;">Total</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <div style="text-align:right;padding:12px 0;border-top:2px solid #f0f0f0;">
        <p style="margin:4px 0;color:#666;font-size:13px;">Subtotal: <strong>Rs. ${Number(invoice.subtotal).toLocaleString()}</strong></p>
        ${invoice.tax_pct > 0 ? `<p style="margin:4px 0;color:#666;font-size:13px;">Tax (${invoice.tax_pct}%): <strong>Rs. ${Number(invoice.tax_amount).toLocaleString()}</strong></p>` : ''}
        <p style="margin:8px 0;font-size:18px;font-weight:900;color:#1a1a1a;">Total: Rs. ${Number(invoice.total).toLocaleString()}</p>
        ${invoice.paid_amount > 0 ? `<p style="margin:4px 0;color:#059669;font-size:13px;font-weight:bold;">Paid: Rs. ${Number(invoice.paid_amount).toLocaleString()}</p>` : ''}
        ${balance > 0 ? `<p style="margin:4px 0;color:#dc2626;font-size:15px;font-weight:900;">Balance Due: Rs. ${Number(balance).toLocaleString()}</p>` : ''}
      </div>
      ${invoice.notes ? `<div style="background:#fff8e1;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:4px;font-size:13px;color:#555;margin-top:16px;">Note: ${invoice.notes}</div>` : ''}
      <div style="margin-top:28px;text-align:center;">
        <a href="${loginUrl}" style="display:inline-block;background:#b45309;color:#fff;text-decoration:none;padding:13px 32px;border-radius:8px;font-size:15px;font-weight:bold;">View in Client Portal →</a>
      </div>
    </div>
    <div style="background:#f9f9f9;padding:16px 32px;text-align:center;font-size:12px;color:#999;border-top:1px solid #f0f0f0;">
      Inflorescence Advance Skills &nbsp;|&nbsp; This is an automated email — do not reply.
    </div>
  </div>
</body></html>`;

    await createTransport().sendMail({
      from: `"Inflorescence Advance Skills" <${process.env.EMAIL_USER}>`,
      to,
      subject: `Invoice ${invoice.invoice_no} — ${invoice.title} | Inflorescence Advance Skills`,
      html,
      text: `Dear ${clientName},\n\nPlease find your invoice details below.\n\nInvoice: ${invoice.invoice_no}\nTitle: ${invoice.title}\nTotal: Rs. ${Number(invoice.total).toLocaleString()}\nBalance Due: Rs. ${Number(balance).toLocaleString()}\n\nLogin to view details: ${loginUrl}\n\n— Inflorescence Advance Skills`,
    });

    console.log(`Invoice email sent to ${to} for invoice ${invoice.invoice_no}`);
  } catch (error) {
    console.error('Invoice email error:', error.message);
  }
};

// Salary slip email — styled HTML + PDF attachment
const sendSalarySlipEmail = async ({ to, name, month, year, salary, commission, total, role, slipPdfBase64, instituteName }) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('Email not configured — skipping salary slip email.');
      return;
    }

    const institute = instituteName || 'Inflorescence Advance Skills';
    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });
    const roleLabel = role === 'teacher' ? 'Teacher' : role === 'clerk' ? 'Clerk' : role === 'office_boy' ? 'Office Staff' : 'Staff';

    const html = `
<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f1f5f9;margin:0;padding:20px;">
  <div style="max-width:580px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:28px 32px;color:#fff;">
      <h1 style="margin:0;font-size:22px;font-weight:900;">${institute}</h1>
      <p style="margin:6px 0 0;opacity:0.85;font-size:13px;">Salary Slip — ${monthName} ${year}</p>
    </div>
    <!-- Body -->
    <div style="padding:28px 32px;">
      <p style="font-size:15px;color:#334155;">Dear <strong>${name}</strong>,</p>
      <p style="color:#64748b;font-size:14px;margin-top:4px;">Your salary for <strong>${monthName} ${year}</strong> has been processed. Please find your salary slip attached to this email.</p>

      <!-- Summary box -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;margin:20px 0;">
        <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Payment Summary</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#64748b;font-size:14px;">Employee</td>
            <td style="padding:8px 0;font-weight:700;color:#1e293b;font-size:14px;text-align:right;">${name}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#64748b;font-size:14px;">Designation</td>
            <td style="padding:8px 0;font-weight:700;color:#1e293b;font-size:14px;text-align:right;">${roleLabel}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#64748b;font-size:14px;">Pay Period</td>
            <td style="padding:8px 0;font-weight:700;color:#1e293b;font-size:14px;text-align:right;">${monthName} ${year}</td>
          </tr>
          <tr><td colspan="2" style="border-top:1px solid #e2e8f0;padding-top:8px;"></td></tr>
          <tr>
            <td style="padding:6px 0;color:#64748b;font-size:14px;">Base Salary</td>
            <td style="padding:6px 0;color:#1e293b;font-size:14px;text-align:right;">Rs. ${Number(salary).toLocaleString()}</td>
          </tr>
          ${commission > 0 ? `<tr>
            <td style="padding:6px 0;color:#64748b;font-size:14px;">Commission Earned</td>
            <td style="padding:6px 0;color:#f59e0b;font-size:14px;font-weight:700;text-align:right;">Rs. ${Number(commission).toLocaleString()}</td>
          </tr>` : ''}
          <tr style="background:#eff6ff;border-radius:6px;">
            <td style="padding:10px 8px;font-size:16px;font-weight:900;color:#1e40af;">Net Pay</td>
            <td style="padding:10px 8px;font-size:18px;font-weight:900;color:#1e40af;text-align:right;">Rs. ${Number(total).toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
        <p style="margin:0;color:#166534;font-size:13px;">✅ Payment has been processed successfully. The detailed salary slip PDF is attached to this email.</p>
      </div>
      <p style="color:#94a3b8;font-size:12px;">Please keep this slip for your records. For any discrepancy, contact the accounts department.</p>
    </div>
    <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #f1f5f9;text-align:center;font-size:12px;color:#94a3b8;">
      ${institute} &nbsp;|&nbsp; This is an automated salary notification — do not reply.
    </div>
  </div>
</body></html>`;

    const attachments = [];
    if (slipPdfBase64) {
      attachments.push({
        filename: `Salary_Slip_${name.replace(/\s+/g, '_')}_${monthName}_${year}.pdf`,
        content: Buffer.from(slipPdfBase64, 'base64'),
        contentType: 'application/pdf',
      });
    }

    await createTransport().sendMail({
      from: `"${institute}" <${process.env.EMAIL_USER}>`,
      to,
      subject: `Salary Slip — ${monthName} ${year} | ${institute}`,
      html,
      text: `Dear ${name},\n\nYour salary for ${monthName} ${year} has been processed.\n\nBase Salary: Rs. ${Number(salary).toLocaleString()}\n${commission > 0 ? `Commission: Rs. ${Number(commission).toLocaleString()}\n` : ''}Net Pay: Rs. ${Number(total).toLocaleString()}\n\nPlease find your salary slip PDF attached.\n\n— ${institute}`,
      attachments,
    });

    console.log(`Salary slip email sent to ${to}`);
  } catch (error) {
    console.error('Salary slip email error:', error.message);
  }
};

module.exports = { sendEmail, sendCredentialsEmail, sendInvoiceEmail, sendSalarySlipEmail };
