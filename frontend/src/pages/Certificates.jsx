import { useState } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import { FileText, Search, Download, Printer, X, Award, Star, Shield } from 'lucide-react';
import { loadLogo, C, fmtDate } from '../utils/pdfKit';
import localLogo from '../assets/logo2.jpeg';

const SCHOOL_NAME    = 'The Best Way Public School';
const SCHOOL_TAGLINE = 'Excellence in Education';
const SCHOOL_ADDRESS = 'Lahore, Pakistan';
const SCHOOL_PHONE   = '0300-0000000';
const SCHOOL_EMAIL   = 'info@thebestway.edu.pk';

const CERT_TYPES = [
  { id:'transfer',  label:'Transfer Certificate',  short:'TC', icon:FileText, color:'#1e3a8a', accent:'#3b82f6', desc:'Issued when a student leaves to join another institution' },
  { id:'character', label:'Character Certificate', short:'CC', icon:Shield,   color:'#14532d', accent:'#16a34a', desc:'Certifies the character and conduct of the student' },
  { id:'bonafide',  label:'Bonafide Certificate',  short:'BC', icon:Award,    color:'#7c2d12', accent:'#ea580c', desc:'Proves the student is currently enrolled in this institution' },
  { id:'merit',     label:'Merit Certificate',     short:'MC', icon:Star,     color:'#4c1d95', accent:'#7c3aed', desc:'Awarded for outstanding academic achievement' },
];

const hexRgb = (hex) => {
  const h = hex.replace('#','');
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
};

// ── Certificate body text (** ** = bold) ──────────────────────────────────────
function certBody(type, s, today) {
  const name    = s.full_name || s.name || '___';
  const father  = s.father_name || '___________';
  const roll    = s.roll_number || '___';
  const cls     = s.school_class_id?.name || '___';
  const section = s.school_class_id?.section || s.section || '';
  const year    = s.academic_year_id?.label || new Date().getFullYear();
  const dob     = s.dob ? fmtDate(new Date(s.dob)) : '___________';
  const admit   = s.admission_date ? fmtDate(new Date(s.admission_date)) : '___________';
  const clsStr  = cls + (section ? ` — Section ${section}` : '');

  switch (type) {
    case 'transfer': return [
      `This is to certify that **${name}**, son/daughter of **${father}**, bearing Roll No. **${roll}**, was a bonafide student of this institution from ${admit} to ${today}.`,
      `He/She was enrolled in **Class ${clsStr}** during the Academic Year **${year}**.`,
      `His/Her conduct and behaviour during his/her stay in this institution was found to be **Good and Satisfactory**.`,
      `He/She is hereby granted this Transfer Certificate for the purpose of seeking admission in another institution.`,
      `We wish him/her all the best in future endeavours and pray for his/her continued success.`,
    ];
    case 'character': return [
      `This is to certify that **${name}**, son/daughter of **${father}**, bearing Roll No. **${roll}**, is/was a student of ${SCHOOL_NAME}.`,
      `He/She was enrolled in **Class ${clsStr}** during the Academic Year **${year}**.`,
      `During his/her period of study at this institution, his/her character and conduct have been found to be **Excellent**. He/She has consistently demonstrated qualities of discipline, integrity, and responsibility.`,
      `He/She has been a well-disciplined, hardworking, and responsible student throughout his/her academic career.`,
      `This certificate is issued on his/her request for whatever purpose it may serve.`,
    ];
    case 'bonafide': return [
      `This is to certify that **${name}**, son/daughter of **${father}**, bearing Roll No. **${roll}**, is a bonafide student of **${SCHOOL_NAME}**.`,
      `He/She is presently studying in **Class ${clsStr}** during the Academic Year **${year}**.`,
      `Date of Birth: **${dob}**`,
      `He/She has been a regular and disciplined student of this institution.`,
      `This certificate is issued on request for official purposes and is valid for the current academic session only.`,
    ];
    case 'merit': return [
      `This is to proudly certify that **${name}**, son/daughter of **${father}**, bearing Roll No. **${roll}**, has demonstrated exceptional academic excellence and outstanding performance.`,
      `He/She is a student of **Class ${clsStr}** during the Academic Year **${year}**.`,
      `In recognition of his/her dedication, hard work, and remarkable achievement in academics, this **Merit Certificate** is awarded as a token of honour and appreciation.`,
      `We commend his/her outstanding efforts and encourage continued excellence in all future endeavours.`,
      `May his/her future be as bright as his/her remarkable accomplishments.`,
    ];
    default: return [];
  }
}

// ── Render paragraph text with **bold** markers → React JSX ──────────────────
function RenderPara({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

// ── PDF: draw paragraph with inline bold + word-wrap ─────────────────────────
function drawPDFPara(doc, rawText, x, y, maxW, lineH = 6.8) {
  // Parse **bold** segments into tokens
  const tokens = [];
  let remaining = rawText;
  while (remaining.length > 0) {
    const bs = remaining.indexOf('**');
    if (bs === -1) { tokens.push({ text: remaining, bold: false }); break; }
    if (bs > 0)    tokens.push({ text: remaining.slice(0, bs), bold: false });
    const be = remaining.indexOf('**', bs + 2);
    if (be === -1) { tokens.push({ text: remaining.slice(bs + 2), bold: true }); break; }
    tokens.push({ text: remaining.slice(bs + 2, be), bold: true });
    remaining = remaining.slice(be + 2);
  }

  let cx = x, cy = y;

  for (const tok of tokens) {
    const words = tok.text.split(' ');
    for (let wi = 0; wi < words.length; wi++) {
      const word = words[wi];
      if (!word) continue;
      const needsSpace = cx > x;
      const display    = needsSpace ? ' ' + word : word;
      doc.setFont('times', tok.bold ? 'bold' : 'normal');
      const w = doc.getTextWidth(display);
      if (cx + w > x + maxW && cx > x) {
        cy += lineH;
        cx  = x;
        doc.setFont('times', tok.bold ? 'bold' : 'normal');
        const ww = doc.getTextWidth(word);
        doc.text(word, cx, cy);
        cx += ww;
      } else {
        doc.text(display, cx, cy);
        cx += w;
      }
    }
  }
  return cy + lineH;
}

// ── Ornamental gold divider ───────────────────────────────────────────────────
function GoldDivider({ color = '#c9a84c', my = 14 }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, margin:`${my}px 0` }}>
      <div style={{ flex:1, height:1, background:`linear-gradient(90deg,transparent,${color})` }}/>
      <div style={{ width:7, height:7, background:color, transform:'rotate(45deg)', flexShrink:0 }}/>
      <div style={{ width:4, height:4, border:`1.5px solid ${color}`, transform:'rotate(45deg)', flexShrink:0 }}/>
      <div style={{ width:7, height:7, background:color, transform:'rotate(45deg)', flexShrink:0 }}/>
      <div style={{ flex:1, height:1, background:`linear-gradient(90deg,${color},transparent)` }}/>
    </div>
  );
}

// ── Corner ornament SVG paths (correct per corner) ───────────────────────────
const CORNER_PATHS = [
  'M0 0 L14 0 L14 2.5 L2.5 2.5 L2.5 14 L0 14 Z',        // top-left
  'M40 0 L26 0 L26 2.5 L37.5 2.5 L37.5 14 L40 14 Z',    // top-right
  'M0 40 L14 40 L14 37.5 L2.5 37.5 L2.5 26 L0 26 Z',    // bottom-left
  'M40 40 L26 40 L26 37.5 L37.5 37.5 L37.5 26 L40 26 Z', // bottom-right
];
const CORNER_DOTS = [
  { cx:16, cy:16 }, { cx:24, cy:16 }, { cx:16, cy:24 }, { cx:24, cy:24 },
];

// ── HTML Certificate Preview ──────────────────────────────────────────────────
function CertPreview({ type, student }) {
  const ct      = CERT_TYPES.find(c => c.id === type) || CERT_TYPES[0];
  const today   = fmtDate(new Date());
  const certNo  = `${ct.short}/${new Date().getFullYear()}/${String(1000 + Math.floor(Math.random() * 9000))}`;
  const paras   = certBody(type, student, today);

  return (
    <div id="cert-preview-html" style={{ fontFamily:"Georgia,'Times New Roman',serif", maxWidth:700, margin:'0 auto', background:'#fff', position:'relative' }}>
      {/* Outer border */}
      <div style={{ border:`4px solid ${ct.color}`, margin:8, position:'relative' }}>
        {/* Inner gold border */}
        <div style={{ border:'1.5px solid #c9a84c', margin:5, padding:'28px 36px 24px', position:'relative' }}>

          {/* Watermark */}
          <div style={{
            position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%) rotate(-30deg)',
            fontSize:72, fontWeight:900, color:'rgba(201,168,76,0.05)', whiteSpace:'nowrap',
            pointerEvents:'none', letterSpacing:10, userSelect:'none', zIndex:0,
          }}>OFFICIAL</div>

          {/* Corner ornaments — correct paths for each corner */}
          {CORNER_PATHS.map((path, i) => (
            <div key={i} style={{ position:'absolute', width:40, height:40, zIndex:2,
              ...(i===0 && { top:6, left:6 }), ...(i===1 && { top:6, right:6 }),
              ...(i===2 && { bottom:6, left:6 }), ...(i===3 && { bottom:6, right:6 }),
            }}>
              <svg width="40" height="40" viewBox="0 0 40 40">
                <path d={path} fill={ct.color} opacity="0.75"/>
                <circle cx={CORNER_DOTS[i].cx} cy={CORNER_DOTS[i].cy} r="2.5" fill="#c9a84c"/>
              </svg>
            </div>
          ))}

          {/* Content */}
          <div style={{ position:'relative', zIndex:1 }}>

            {/* School header — logo centered, text below */}
            <div style={{ textAlign:'center', marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'center', marginBottom:10 }}>
                <div style={{ width:82, height:82, borderRadius:'50%', overflow:'hidden', border:'3px solid #c9a84c', boxShadow:`0 0 22px rgba(201,168,76,0.35), 0 0 0 6px ${ct.color}18`, background:'#fff' }}>
                  <img src={localLogo} alt="logo" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
                </div>
              </div>
              <div style={{ fontSize:22, fontWeight:'bold', color:ct.color, letterSpacing:'0.03em', lineHeight:1.2 }}>{SCHOOL_NAME}</div>
              <div style={{ fontSize:9.5, color:'#c9a84c', fontStyle:'italic', marginTop:3, letterSpacing:'0.2em', textTransform:'uppercase' }}>{SCHOOL_TAGLINE}</div>
              <div style={{ fontSize:9, color:'#999', marginTop:3 }}>{SCHOOL_ADDRESS} &nbsp;·&nbsp; {SCHOOL_PHONE} &nbsp;·&nbsp; {SCHOOL_EMAIL}</div>
            </div>

            <GoldDivider color={ct.color} my={12}/>

            {/* Certificate title */}
            <div style={{ textAlign:'center', margin:'14px 0 16px' }}>
              <div style={{ display:'inline-block', fontSize:19, fontWeight:'bold', letterSpacing:'0.22em', textTransform:'uppercase', color:ct.color }}>
                {ct.label}
              </div>
              <div style={{ width:'55%', height:2, background:`linear-gradient(90deg,transparent,${ct.color},transparent)`, margin:'6px auto 5px' }}/>
              <div style={{ fontSize:9.5, color:'#aaa', letterSpacing:'0.06em' }}>
                Certificate No: <strong>{certNo}</strong> &nbsp;&nbsp;·&nbsp;&nbsp; Date of Issue: <strong>{today}</strong>
              </div>
            </div>

            {/* Body paragraphs */}
            <div style={{ fontSize:13.5, lineHeight:1.95, color:'#222', textAlign:'justify', marginBottom:22 }}>
              {paras.map((para, i) => (
                <p key={i} style={{ margin: i < paras.length - 1 ? '0 0 11px 0' : 0 }}>
                  <RenderPara text={para}/>
                </p>
              ))}
            </div>

            <GoldDivider color="#c9a84c" my={10}/>

            {/* Signatures */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:12, marginTop:8 }}>
              <div style={{ textAlign:'center', flex:1 }}>
                <div style={{ borderTop:`1.5px solid ${ct.color}`, marginTop:46, paddingTop:7, fontSize:11, color:'#444', fontWeight:'bold' }}>Class Teacher</div>
                <div style={{ fontSize:9, color:'#aaa', marginTop:2 }}>Signature & Date</div>
              </div>
              <div style={{ textAlign:'center', flex:1, display:'flex', flexDirection:'column', alignItems:'center', marginBottom:4 }}>
                <div style={{ width:78, height:78, borderRadius:'50%', border:`2px dashed ${ct.color}`, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:2, color:ct.color }}>
                  <div style={{ fontSize:8.5, fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>Official</div>
                  <div style={{ fontSize:8.5, fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>Stamp</div>
                </div>
              </div>
              <div style={{ textAlign:'center', flex:1 }}>
                <div style={{ borderTop:`1.5px solid ${ct.color}`, marginTop:46, paddingTop:7, fontSize:11, color:'#444', fontWeight:'bold' }}>Principal</div>
                <div style={{ fontSize:9, color:'#aaa', marginTop:2 }}>Signature & Stamp</div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ marginTop:18, padding:'6px 0', borderTop:'1px solid rgba(201,168,76,0.25)', textAlign:'center', fontSize:8, color:'#bbb', fontStyle:'italic' }}>
              This is a computer-generated certificate. For verification, contact the school administration.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Pre-clip logo to circle via canvas (matches CSS border-radius:50%) ────────
async function makeCircularLogo(logoB64, sizePx = 220) {
  if (!logoB64) return null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = sizePx;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(sizePx / 2, sizePx / 2, sizePx / 2, 0, Math.PI * 2);
    ctx.clip();
    const img = await new Promise((res, rej) => {
      const image = new Image();
      image.onload  = () => res(image);
      image.onerror = rej;
      image.src = logoB64;
    });
    ctx.drawImage(img, 0, 0, sizePx, sizePx);
    return canvas.toDataURL('image/png');
  } catch { return logoB64; }
}

// ── Draw filled rounded-rect circle (compatible replacement for doc.circle) ──
function pdfCircle(doc, cx, cy, r, style = 'S') {
  doc.roundedRect(cx - r, cy - r, r * 2, r * 2, r, r, style);
}

// ── Draw a true rotated-square diamond using jsPDF lines() ───────────────────
function pdfDiamond(doc, cx, cy, r, style = 'F') {
  // Start at top point; trace right → bottom → left, then close back to top
  doc.lines([[r, r], [-r, r], [-r, -r]], cx, cy - r, [1, 1], style, true);
}

// ── Ornamental divider matching HTML GoldDivider: line · ◆ ◇ ◆ · line ────────
// Pass themeRgb for first divider (HTML uses ct.color), goldRgb for second.
function pdfDivider(doc, y, rgb, W = 210, margin = 18) {
  const mid  = W / 2;
  const bigR = 1.8, smlR = 1.0, gap = 3.5;
  // Lines either side of diamonds
  doc.setDrawColor(...rgb);
  doc.setLineWidth(0.4);
  doc.line(margin,               y, mid - gap - bigR - 2,   y);
  doc.line(mid + gap + bigR + 2, y, W - margin,             y);
  // Outer big filled diamonds
  doc.setFillColor(...rgb);
  pdfDiamond(doc, mid - gap, y, bigR, 'F');
  pdfDiamond(doc, mid + gap, y, bigR, 'F');
  // Center small outlined diamond
  doc.setDrawColor(...rgb);
  doc.setLineWidth(0.5);
  pdfDiamond(doc, mid, y, smlR, 'S');
}

// ── jsPDF premium certificate ─────────────────────────────────────────────────
async function generateCertPDF(type, student, logoSrc = null) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, H = 297;
  const ct = CERT_TYPES.find(c => c.id === type) || CERT_TYPES[0];

  const themeRgb = hexRgb(ct.color);
  const goldRgb  = C.gold;
  const today    = fmtDate(new Date());
  const certNo   = `${ct.short}/${new Date().getFullYear()}/${String(Date.now()).slice(-4)}`;
  const paras    = certBody(type, student, today);

  const rawLogo  = logoSrc || await loadLogo();
  const circLogo = await makeCircularLogo(rawLogo, 220);

  // 1. White background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, H, 'F');

  // 2. Outer border — theme color (HTML: 4px solid ct.color)
  doc.setDrawColor(...themeRgb);
  doc.setLineWidth(1.4);
  doc.rect(7, 7, W - 14, H - 14);

  // 3. Inner border — gold, thin (HTML: 1.5px solid #c9a84c)
  doc.setDrawColor(...goldRgb);
  doc.setLineWidth(0.5);
  doc.rect(11, 11, W - 22, H - 22);

  // 4. Corner ornaments — L-shaped, theme color + gold accent dot
  const ARM = 14, ARM_T = 2.5;
  doc.setFillColor(...themeRgb);
  doc.rect(7,         7,         ARM,   ARM_T, 'F');
  doc.rect(7,         7,         ARM_T, ARM,   'F');
  doc.rect(W-7-ARM,   7,         ARM,   ARM_T, 'F');
  doc.rect(W-7-ARM_T, 7,         ARM_T, ARM,   'F');
  doc.rect(7,         H-7-ARM_T, ARM,   ARM_T, 'F');
  doc.rect(7,         H-7-ARM,   ARM_T, ARM,   'F');
  doc.rect(W-7-ARM,   H-7-ARM_T, ARM,   ARM_T, 'F');
  doc.rect(W-7-ARM_T, H-7-ARM,   ARM_T, ARM,   'F');
  const dotSz = 3;
  doc.setFillColor(...goldRgb);
  [[7+ARM-dotSz/2,   7+ARM-dotSz/2  ],
   [W-7-ARM-dotSz/2, 7+ARM-dotSz/2  ],
   [7+ARM-dotSz/2,   H-7-ARM-dotSz/2],
   [W-7-ARM-dotSz/2, H-7-ARM-dotSz/2],
  ].forEach(([dx, dy]) => doc.rect(dx, dy, dotSz, dotSz, 'F'));

  // 5. Watermark — very faint warm white (HTML: rgba(201,168,76,0.05))
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(62);
  doc.setTextColor(249, 248, 244);
  doc.text('OFFICIAL', W / 2, H / 2 + 8, { align: 'center', angle: 30 });
  doc.setTextColor(0, 0, 0);

  // 6. Logo — white bg + gold ring + outer theme ring, then circular image
  const logoD  = 24;
  const logoCX = W / 2;
  const logoCY = 34;
  const logoR  = logoD / 2;

  doc.setFillColor(255, 255, 255);
  pdfCircle(doc, logoCX, logoCY, logoR + 2.5, 'F');

  // Gold ring (HTML: border 3px solid #c9a84c)
  doc.setDrawColor(...goldRgb);
  doc.setLineWidth(0.9);
  pdfCircle(doc, logoCX, logoCY, logoR + 1.5, 'S');

  // Outer subtle theme ring (HTML: box-shadow 0 0 0 6px ctColor)
  doc.setDrawColor(...themeRgb);
  doc.setLineWidth(0.35);
  pdfCircle(doc, logoCX, logoCY, logoR + 4, 'S');

  if (circLogo) {
    try {
      doc.addImage(circLogo, 'PNG', logoCX - logoR, logoCY - logoR, logoD, logoD, '', 'FAST');
    } catch { /* skip */ }
  }

  // 7. School text — below logo
  let ty = logoCY + logoR + 9;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(...themeRgb);
  doc.text(SCHOOL_NAME, W / 2, ty, { align: 'center' });

  ty += 6;
  // Tagline: italic + gold (HTML: fontStyle:'italic', color:'#c9a84c')
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...goldRgb);
  doc.text(SCHOOL_TAGLINE.toUpperCase(), W / 2, ty, { align: 'center' });

  ty += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text(`${SCHOOL_ADDRESS}  ·  ${SCHOOL_PHONE}  ·  ${SCHOOL_EMAIL}`, W / 2, ty, { align: 'center' });

  // 8. First divider — THEME color (HTML: GoldDivider color={ct.color})
  const d1Y = ty + 8;
  pdfDivider(doc, d1Y, themeRgb, W);

  // 9. Certificate title
  const titleY = d1Y + 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(...themeRgb);
  doc.text(ct.label.toUpperCase(), W / 2, titleY, { align: 'center' });

  const tW = doc.getTextWidth(ct.label.toUpperCase()) + 10;
  doc.setDrawColor(...themeRgb);
  doc.setLineWidth(1.2);
  doc.line(W / 2 - tW / 2, titleY + 3, W / 2 + tW / 2, titleY + 3);

  // Cert no + date — centered together with · separator (HTML layout)
  const metaY = titleY + 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(150, 150, 150);
  doc.text(`Certificate No: ${certNo}  ·  Date of Issue: ${today}`, W / 2, metaY, { align: 'center' });

  // 10. Body paragraphs with inline bold (Times, justified)
  const bodyX    = 20;
  const bodyMaxW = W - 40;
  let   bodyY    = metaY + 14;

  doc.setFontSize(11.5);
  doc.setTextColor(34, 34, 34);  // HTML: #222

  for (let i = 0; i < paras.length; i++) {
    bodyY = drawPDFPara(doc, paras[i], bodyX, bodyY, bodyMaxW, 7);
    if (i < paras.length - 1) bodyY += 5;  // HTML: margin 0 0 11px → ~3mm
  }

  // 11. Bottom divider — GOLD (HTML: GoldDivider color="#c9a84c")
  const d2Y = bodyY + 10;
  pdfDivider(doc, d2Y, goldRgb, W);

  // 12. Signatures
  const sigTop  = d2Y + 8;
  const sigLine = sigTop + 34;

  // Class Teacher — left
  doc.setDrawColor(...themeRgb);
  doc.setLineWidth(0.8);
  doc.line(20, sigLine, 76, sigLine);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(45, 45, 65);
  doc.text('Class Teacher', 48, sigLine + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text('Signature & Date', 48, sigLine + 9, { align: 'center' });

  // Official stamp — center (HTML: dashed circle, approximated with two rings)
  const stCX = W / 2, stCY = sigTop + 17;
  doc.setDrawColor(...themeRgb);
  doc.setLineWidth(0.7);
  pdfCircle(doc, stCX, stCY, 16, 'S');
  doc.setLineWidth(0.35);
  pdfCircle(doc, stCX, stCY, 12.5, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...themeRgb);
  doc.text('OFFICIAL', stCX, stCY - 2, { align: 'center' });
  doc.text('STAMP',    stCX, stCY + 4,  { align: 'center' });

  // Principal — right
  doc.setDrawColor(...themeRgb);
  doc.setLineWidth(0.8);
  doc.line(W - 76, sigLine, W - 20, sigLine);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(45, 45, 65);
  doc.text('Principal', W - 48, sigLine + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text('Signature & Stamp', W - 48, sigLine + 9, { align: 'center' });

  // 13. Footer — thin faint line + italic gray text (HTML: borderTop gold + italic #bbb)
  const footY = H - 20;
  doc.setDrawColor(215, 200, 160);
  doc.setLineWidth(0.35);
  doc.line(20, footY, W - 20, footY);
  doc.setFont('times', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(185, 185, 185);
  doc.text(
    'This is a computer-generated certificate. For verification, contact the school administration.',
    W / 2, footY + 6, { align: 'center', maxWidth: W - 40 }
  );

  return doc;
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Certificates() {
  const [query,           setQuery]           = useState('');
  const [searching,       setSearching]       = useState(false);
  const [results,         setResults]         = useState([]);
  const [student,         setStudent]         = useState(null);
  const [certType,        setCertType]        = useState('transfer');
  const [showPreview,     setShowPreview]     = useState(false);
  const [generating,      setGenerating]      = useState(false);

  const ct = CERT_TYPES.find(c => c.id === certType) || CERT_TYPES[0];

  const search = async () => {
    if (!query.trim()) { toast.warn('Enter name or roll number'); return; }
    setSearching(true);
    try {
      const { data } = await api.get('/students', { params:{ search:query } });
      const list = Array.isArray(data) ? data : (data.students || []);
      setResults(list);
      if (!list.length) toast.info('No students found');
    } catch { toast.error('Search failed'); }
    finally { setSearching(false); }
  };

  const handlePrint = () => {
    if (!student) { toast.warn('Select a student first'); return; }
    const el  = document.getElementById('cert-preview-html');
    const win = window.open('', '_blank', 'width=820,height=1100');
    if (!el || !win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/>
      <title>${ct.label}</title>
      <style>
        body{margin:0;background:#e8e8e8;display:flex;justify-content:center;padding:24px;font-family:Georgia,serif;}
        @media print{body{background:#fff;padding:0;}@page{size:A4;margin:6mm;}}
        strong{font-weight:bold;}
      </style></head><body>${el.outerHTML}
      <script>window.onload=function(){window.print();}<\/script>
      </body></html>`);
    win.document.close();
  };

  const handleDownload = async () => {
    if (!student) { toast.warn('Select a student first'); return; }
    setGenerating(true);
    try {
      const doc  = await generateCertPDF(certType, student, localLogo);
      const name = student.full_name || student.name || 'Student';
      doc.save(`${ct.label}_${name}_${new Date().getFullYear()}.pdf`);
      toast.success('Certificate downloaded');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate certificate');
    } finally { setGenerating(false); }
  };

  return (
    <div className="min-h-screen pb-12" style={{ background:'#f1f5f9' }}>
      {/* Page header */}
      <div className="px-6 pt-8 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background:`linear-gradient(135deg,${ct.color},${ct.accent})` }}>
            <ct.icon className="w-6 h-6 text-white"/>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Certificates</h1>
            <p className="text-sm text-slate-500">Premium official certificates — school logo · student name bold · correct layout</p>
          </div>
        </div>
      </div>

      <div className="px-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left controls ── */}
        <div className="space-y-4">

          {/* Search */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Find Student</p>
            <div className="flex gap-2 mb-3">
              <input value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition-colors"
                placeholder="Name or roll number…"/>
              <button onClick={search} disabled={searching}
                className="px-3 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                {searching
                  ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
                  : <Search className="w-4 h-4"/>}
              </button>
            </div>
            {results.length > 0 && (
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                {results.map(s => (
                  <button key={s._id}
                    onClick={() => { setStudent(s); setShowPreview(true); setResults([]); setQuery(''); }}
                    className={`w-full text-left px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-indigo-50 transition-colors ${student?._id === s._id ? 'bg-indigo-50' : ''}`}>
                    <div className="font-semibold text-sm text-slate-800">{s.full_name || s.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {s.roll_number}{s.school_class_id?.name && ` · Class ${s.school_class_id.name}`}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected student */}
          {student && (
            <div className="rounded-2xl border p-4" style={{ background:`${ct.color}0d`, borderColor:`${ct.color}35` }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ background:`linear-gradient(135deg,${ct.color},${ct.accent})` }}>
                  {(student.full_name || student.name)?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate">{student.full_name || student.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {student.roll_number && `Roll: ${student.roll_number}`}
                    {student.school_class_id?.name && ` · Class ${student.school_class_id.name}`}
                  </p>
                </div>
                <button onClick={() => { setStudent(null); setShowPreview(false); }}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                  <X size={14}/>
                </button>
              </div>
            </div>
          )}

          {/* Certificate type */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Certificate Type</p>
            <div className="space-y-2">
              {CERT_TYPES.map(c => (
                <button key={c.id}
                  onClick={() => { setCertType(c.id); if (student) setShowPreview(true); }}
                  className="w-full text-left p-3.5 rounded-2xl border-2 transition-all"
                  style={ certType === c.id
                    ? { borderColor:c.color, background:`linear-gradient(135deg,${c.color},${c.accent})`, color:'#fff' }
                    : { borderColor:'#e2e8f0', background:'#fff', color:'#475569' } }>
                  <div className="flex items-center gap-2.5">
                    <c.icon className="w-4 h-4 flex-shrink-0" style={{ opacity: certType === c.id ? 1 : 0.45 }}/>
                    <div>
                      <div className="font-bold text-sm">{c.label}</div>
                      <div className="text-[10px] mt-0.5" style={{ opacity: certType === c.id ? 0.7 : 0.6 }}>{c.desc}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={handlePrint} disabled={!student}
              className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-3 rounded-2xl font-semibold text-sm hover:bg-slate-50 disabled:opacity-40 transition-all">
              <Printer className="w-4 h-4"/> Print
            </button>
            <button onClick={handleDownload} disabled={generating || !student}
              className="flex-1 flex items-center justify-center gap-2 text-white px-4 py-3 rounded-2xl font-bold text-sm disabled:opacity-40 shadow-md transition-all"
              style={{ background:`linear-gradient(135deg,${ct.color},${ct.accent})` }}>
              {generating
                ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
                : <Download className="w-4 h-4"/>}
              {generating ? 'Generating…' : 'Download PDF'}
            </button>
          </div>
        </div>

        {/* ── Preview ── */}
        <div className="lg:col-span-2">
          {showPreview && student ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100"
                style={{ background:`${ct.color}09` }}>
                <div className="flex items-center gap-2">
                  <ct.icon className="w-4 h-4" style={{ color:ct.color }}/>
                  <span className="text-sm font-bold text-slate-700">{ct.label}</span>
                  <span className="text-xs text-slate-400">— {student.full_name || student.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handlePrint}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors">
                    <Printer className="w-3.5 h-3.5"/> Print
                  </button>
                  <button onClick={handleDownload} disabled={generating}
                    className="flex items-center gap-1.5 text-xs font-bold text-white px-3 py-1.5 rounded-xl disabled:opacity-60 transition-colors"
                    style={{ background:ct.color }}>
                    <Download className="w-3.5 h-3.5"/>
                    {generating ? 'Generating…' : 'PDF'}
                  </button>
                  <button onClick={() => setShowPreview(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                    <X className="w-4 h-4"/>
                  </button>
                </div>
              </div>
              <div className="p-4 md:p-6 bg-gray-200 overflow-auto" style={{ maxHeight:'82vh' }}>
                <CertPreview type={certType} student={student}/>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm min-h-[520px] flex flex-col items-center justify-center gap-5">
              <div className="grid grid-cols-2 gap-3 w-full max-w-sm px-6">
                {CERT_TYPES.map(c => (
                  <button key={c.id}
                    onClick={() => { setCertType(c.id); if (student) setShowPreview(true); }}
                    className="rounded-2xl border-2 p-4 text-center cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md"
                    style={{ borderColor:`${c.color}40`, background:`${c.color}07` }}>
                    <c.icon className="w-6 h-6 mx-auto mb-2" style={{ color:c.color }}/>
                    <div className="text-xs font-bold leading-tight text-slate-700">{c.label}</div>
                  </button>
                ))}
              </div>
              <p className="text-sm text-slate-400 font-medium">Search a student above to preview &amp; download</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
