/**
 * pdfKit.js — Shared premium PDF design system
 * Used by all PDF generators in the project.
 *
 * Design language: "Official & Premium"
 * - Deep navy header with gold trim
 * - School logo (circular white-ring frame)
 * - Document-type badge (gold pill)
 * - Subtle dot-grid watermark in body
 * - Gold accent lines as dividers
 * - Footer with page number + "For Official Use Only"
 */

// ── Brand colours ─────────────────────────────────────────────────────────────
export const C = {
  navy:       [11,  21,  40],
  navyMid:    [21,  55,  105],
  navyLight:  [30,  76,  140],
  gold:       [201, 168, 76],
  goldLight:  [232, 204, 122],
  white:      [255, 255, 255],
  offWhite:   [248, 250, 252],
  rowAlt:     [241, 245, 249],
  slate:      [71,  85,  105],
  slateLight: [148, 163, 184],
  green:      [22,  163, 74],
  red:        [220, 38,  38],
  amber:      [217, 119, 6],
};

export const SCHOOL_NAME    = 'The Best Way Public School';
export const SCHOOL_TAGLINE = 'Excellence in Education';
export const SCHOOL_PHONE   = '0300-0000000';
export const SCHOOL_WEB     = 'www.thebestway.edu.pk';

// ── Load logo as base64 ───────────────────────────────────────────────────────
export async function loadLogo() {
  const urls = ['/icons/icon-512.png', '/icons/icon-192.png'];
  for (const url of urls) {
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const blob = await r.blob();
      return await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onloadend = () => res(reader.result);
        reader.onerror  = rej;
        reader.readAsDataURL(blob);
      });
    } catch { /* try next */ }
  }
  return null;
}

function imgFmt(b64) {
  if (!b64) return 'JPEG';
  if (b64.startsWith('data:image/png')) return 'PNG';
  return 'JPEG';
}

// ── Premium header ────────────────────────────────────────────────────────────
// Returns the Y coordinate immediately after the header.
export function drawHeader(doc, { logoB64, docType = '', docRef = '', date = '', pageW = 210 } = {}) {
  const H = 30; // header height mm

  // Dark navy background
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, pageW, H, 'F');

  // Lighter navy bottom strip (gradient simulation)
  doc.setFillColor(...C.navyMid);
  doc.rect(0, H - 8, pageW, 8, 'F');

  // Gold top border line
  doc.setFillColor(...C.gold);
  doc.rect(0, 0, pageW, 1.2, 'F');

  // Gold bottom line
  doc.rect(0, H, pageW, 0.8, 'F');

  // Left gold accent strip
  doc.setFillColor(...C.gold);
  doc.rect(0, 0, 3, H, 'F');

  // Logo
  const logoX = 6, logoY = 3, logoSz = 24;
  if (logoB64) {
    // White circular background
    doc.setFillColor(...C.white);
    doc.roundedRect(logoX - 0.5, logoY - 0.5, logoSz + 1, logoSz + 1, logoSz / 2 + 0.5, logoSz / 2 + 0.5, 'F');
    // Gold ring
    doc.setDrawColor(...C.gold);
    doc.setLineWidth(0.6);
    doc.roundedRect(logoX - 0.5, logoY - 0.5, logoSz + 1, logoSz + 1, logoSz / 2 + 0.5, logoSz / 2 + 0.5, 'S');
    try {
      doc.addImage(logoB64, imgFmt(logoB64), logoX, logoY, logoSz, logoSz, '', 'FAST');
    } catch { /* skip */ }
  }

  // School name
  const textX = logoB64 ? logoX + logoSz + 4 : 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...C.white);
  doc.text(SCHOOL_NAME, textX, 12);

  // Tagline
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.gold);
  doc.text(SCHOOL_TAGLINE, textX, 18);

  // Contact line
  doc.setFontSize(6.5);
  doc.setTextColor(180, 195, 215);
  doc.text(`${SCHOOL_PHONE}  ·  ${SCHOOL_WEB}`, textX, 24);

  // Document type badge (top right)
  if (docType) {
    const badgeW = Math.max(30, docType.length * 2.5 + 6);
    const badgeX = pageW - badgeW - 5;
    doc.setFillColor(...C.gold);
    doc.roundedRect(badgeX, 4, badgeW, 8, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.navy);
    doc.text(docType.toUpperCase(), badgeX + badgeW / 2, 9, { align: 'center' });
  }

  // Doc ref & date (right side, below badge)
  if (docRef || date) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(180, 195, 215);
    if (docRef) doc.text(docRef, pageW - 6, 17, { align: 'right' });
    if (date)   doc.text(date,   pageW - 6, 23, { align: 'right' });
  }

  return H + 1; // Y after header
}

// ── Premium footer ────────────────────────────────────────────────────────────
export function drawFooter(doc, { pageNum = 1, totalPages = 1, pageW = 210, pageH = 297 } = {}) {
  const fY = pageH - 12;

  // Gold line above footer
  doc.setFillColor(...C.gold);
  doc.rect(0, fY, pageW, 0.5, 'F');

  // Footer band
  doc.setFillColor(...C.navy);
  doc.rect(0, fY + 0.5, pageW, 12, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...C.slateLight);
  doc.text(`${SCHOOL_NAME}  ·  Computer-generated document — no signature required`, pageW / 2, fY + 5.5, { align: 'center' });

  doc.setFontSize(6);
  doc.setTextColor(100, 120, 150);
  doc.text('FOR OFFICIAL USE ONLY · CONFIDENTIAL', pageW / 2, fY + 9.5, { align: 'center' });

  // Page number
  doc.setTextColor(...C.gold);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(`${pageNum} / ${totalPages}`, pageW - 8, fY + 6, { align: 'right' });
}

// ── Section heading ───────────────────────────────────────────────────────────
export function drawSection(doc, label, y, { pageW = 210, marginL = 14 } = {}) {
  // Gold left tick + label
  doc.setFillColor(...C.gold);
  doc.rect(marginL, y, 2.5, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.navy);
  doc.text(label.toUpperCase(), marginL + 4.5, y + 3.7);
  // Thin line extending right
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.25);
  const labelW = doc.getTextWidth(label.toUpperCase()) + marginL + 6;
  doc.line(labelW, y + 2.5, pageW - marginL, y + 2.5);
  return y + 8;
}

// ── Info row (label: value) ───────────────────────────────────────────────────
export function drawInfoRow(doc, label, value, x, y, colW = 80) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.slateLight);
  doc.text(label, x, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 50);
  doc.text(String(value ?? '—'), x + colW, y);
}

// ── Two-column info grid ──────────────────────────────────────────────────────
export function drawInfoGrid(doc, rows, startY, { marginL = 14, colW = 88, rowH = 6.5 } = {}) {
  rows.forEach(([l, v], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x   = marginL + col * colW;
    const y   = startY + row * rowH;
    drawInfoRow(doc, l, v, x, y, 32);
  });
  return startY + Math.ceil(rows.length / 2) * rowH + 2;
}

// ── Summary box (highlighted totals area) ────────────────────────────────────
export function drawSummaryBox(doc, lines, startY, { pageW = 210, marginL = 14, boxH } = {}) {
  const h = boxH || lines.length * 7 + 8;
  // Background
  doc.setFillColor(...C.offWhite);
  doc.roundedRect(marginL, startY, pageW - marginL * 2, h, 2, 2, 'F');
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.4);
  doc.roundedRect(marginL, startY, pageW - marginL * 2, h, 2, 2, 'S');
  // Left gold strip
  doc.setFillColor(...C.gold);
  doc.roundedRect(marginL, startY, 2.5, h, 1, 1, 'F');

  let y = startY + 6.5;
  lines.forEach(({ label, value, bold, large, color }) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(large ? 12 : 8.5);
    doc.setTextColor(...(color || C.slate));
    doc.text(label, marginL + 8, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(large ? 13 : 9);
    doc.setTextColor(...(color || C.navy));
    doc.text(String(value), pageW - marginL - 4, y, { align: 'right' });
    y += bold || large ? 8 : 6.5;
  });

  return startY + h + 4;
}

// ── Watermark ─────────────────────────────────────────────────────────────────
export function drawWatermark(doc, { text = 'OFFICIAL', pageW = 210, pageH = 297 } = {}) {
  // Very faint diagonal repeat
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(48);
  doc.setTextColor(230, 235, 245);

  doc.saveGraphicsState?.();
  // jsPDF doesn't support opacity natively on text, so we use a very light color instead
  for (let y = 60; y < pageH - 30; y += 80) {
    for (let x = -20; x < pageW + 20; x += 90) {
      doc.text(text, x, y, { angle: 30 });
    }
  }
  doc.restoreGraphicsState?.();
}

// ── autoTable shared styles ───────────────────────────────────────────────────
export const TABLE_STYLES = {
  headStyles: {
    fillColor: C.navy,
    textColor: C.white,
    fontStyle: 'bold',
    fontSize: 8,
    cellPadding: 3,
  },
  alternateRowStyles: {
    fillColor: C.rowAlt,
  },
  bodyStyles: {
    fontSize: 8,
    cellPadding: 2.5,
    textColor: [30, 30, 50],
  },
  footStyles: {
    fillColor: C.offWhite,
    textColor: C.navy,
    fontStyle: 'bold',
    fontSize: 8.5,
  },
  tableLineColor: [220, 225, 235],
  tableLineWidth: 0.2,
  styles: {
    lineColor: [220, 225, 235],
    lineWidth: 0.2,
    overflow: 'linebreak',
  },
};

// ── Amount formatting ─────────────────────────────────────────────────────────
export function fmtRs(n) {
  return `Rs. ${Number(n || 0).toLocaleString('en-PK')}`;
}

export function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
}
