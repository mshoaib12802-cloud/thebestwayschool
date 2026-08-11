import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import {
  CreditCard, Search, Download, RefreshCw, CheckSquare, Square,
  Users, Briefcase, Eye, ChevronLeft, ChevronRight,
} from 'lucide-react';
import localLogo from '../assets/logo2.jpeg';

const API_BASE     = '';
const LOGO_PNG_URL = '/icons/icon-512.png';
const SCHOOL_NAME  = 'The Best Way Public School';
const SCHOOL_PHONE = '0300-0000000';
const SCHOOL_WEB   = 'www.thebestway.edu.pk';
const CARD_W = 85.6;   // mm
const CARD_H = 54;     // mm

// ── Gold accent (premium) ────────────────────────────────────────────────────
const GOLD  = '#c9a84c';
const GOLDR = [201, 168, 76];

// ── Themes: only the background gradient changes, gold stays everywhere ───────
const THEMES = {
  navy: {
    label: 'Navy',
    bg1: '#0b1528', bg2: '#162444', bg3: '#080d18',
    stripe: '#0e1d38',
  },
  emerald: {
    label: 'Emerald',
    bg1: '#052e1c', bg2: '#0a4a2e', bg3: '#031510',
    stripe: '#073d25',
  },
  maroon: {
    label: 'Maroon',
    bg1: '#2a0a0a', bg2: '#4a1212', bg3: '#150505',
    stripe: '#380e0e',
  },
  violet: {
    label: 'Violet',
    bg1: '#160830', bg2: '#2d1260', bg3: '#0b0420',
    stripe: '#1e0c42',
  },
  slate: {
    label: 'Slate',
    bg1: '#0f172a', bg2: '#1e293b', bg3: '#080d18',
    stripe: '#18243a',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
async function loadB64(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error();
    const blob = await r.blob();
    return await new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onloadend = () => res(reader.result);
      reader.onerror  = rej;
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

function imgFmt(b64) {
  if (!b64) return 'JPEG';
  if (b64.startsWith('data:image/png'))  return 'PNG';
  if (b64.startsWith('data:image/webp')) return 'WEBP';
  return 'JPEG';
}

function hexRgb(h) {
  return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
}

// ── Deterministic micro-QR pixels from a string ───────────────────────────────
function qrBits(str) {
  // 6×6 deterministic pixel grid from string hash
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  const bits = [];
  for (let i = 0; i < 36; i++) bits.push((hash >> (i % 32)) & 1);
  return bits;
}

// ── PDF card renderer ────────────────────────────────────────────────────────
async function drawCard(doc, card, x, y, thKey, logoB64, photoMap) {
  const th = THEMES[thKey] || THEMES.navy;
  const W  = CARD_W, H = CARD_H;

  // ── Background (three-layer gradient simulation) ──
  doc.setFillColor(...hexRgb(th.bg1));
  doc.roundedRect(x, y, W, H, 3, 3, 'F');

  // Lower half slightly lighter tone
  doc.setFillColor(...hexRgb(th.bg2));
  doc.roundedRect(x, y + H * 0.5, W, H * 0.5, 0, 0, 'F');
  doc.roundedRect(x, y + H * 0.5, W, H * 0.5, 3, 3, 'F');

  // Subtle diagonal stripe overlay (simulate texture)
  doc.setFillColor(...hexRgb(th.stripe));
  doc.rect(x, y, W, H * 0.3, 'F');

  // ── Gold border lines ──
  doc.setDrawColor(...GOLDR);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, W, H, 3, 3, 'S');

  // Inner fine gold line
  doc.setLineWidth(0.15);
  doc.roundedRect(x + 1.2, y + 1.2, W - 2.4, H - 2.4, 2.5, 2.5, 'S');

  // ── Header strip (top 14mm) ──
  // Gold separator line below header
  doc.setDrawColor(...GOLDR);
  doc.setLineWidth(0.4);
  doc.line(x + 3, y + 14, x + W - 3, y + 14);

  // Logo (circle mask simulation — just square with radius)
  const logoX = x + 3, logoY = y + 2, logoSz = 10;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(logoX, logoY, logoSz, logoSz, logoSz / 2, logoSz / 2, 'F');
  doc.setDrawColor(...GOLDR);
  doc.setLineWidth(0.5);
  doc.roundedRect(logoX, logoY, logoSz, logoSz, logoSz / 2, logoSz / 2, 'S');
  if (logoB64) {
    try {
      doc.addImage(logoB64, imgFmt(logoB64), logoX + 0.5, logoY + 0.5, logoSz - 1, logoSz - 1, '', 'FAST');
    } catch { /* skip */ }
  }

  // School name
  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  const nameX = logoX + logoSz + 3;
  const nameMaxW = W - nameX + x - 22;
  doc.text(SCHOOL_NAME, nameX, y + 6.5, { maxWidth: nameMaxW });

  // Tagline
  doc.setFontSize(4.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GOLDR);
  doc.text('Excellence in Education', nameX, y + 11, { maxWidth: nameMaxW });

  // "STUDENT ID" badge top-right
  const badgeW = 18, badgeH = 6.5;
  const badgeX = x + W - badgeW - 3, badgeY = y + 3;
  doc.setFillColor(...GOLDR);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.5, 1.5, 'F');
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...hexRgb(th.bg1));
  doc.text(card.type === 'staff' ? 'STAFF ID' : 'STUDENT ID', badgeX + badgeW / 2, badgeY + 4.2, { align: 'center' });

  // ── Photo (left of body) ──
  const pX = x + 3.5, pY = y + 16, pW = 18, pH = 26;
  // White bg + gold border
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pX - 1, pY - 1, pW + 2, pH + 2, 1.5, 1.5, 'F');
  doc.setDrawColor(...GOLDR);
  doc.setLineWidth(0.5);
  doc.roundedRect(pX - 1, pY - 1, pW + 2, pH + 2, 1.5, 1.5, 'S');

  const pb64 = card._id ? photoMap[card._id] : null;
  if (pb64) {
    try { doc.addImage(pb64, imgFmt(pb64), pX, pY, pW, pH, '', 'FAST'); }
    catch { drawPhotoBox(doc, pX, pY, pW, pH, th); }
  } else {
    drawPhotoBox(doc, pX, pY, pW, pH, th);
  }

  // ── Student info (right of photo) ──
  const iX = pX + pW + 4, iY = y + 17;
  const iW = W - (iX - x) - 4;

  // Name
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  const nameLines = doc.splitTextToSize((card.name || 'Unknown').toUpperCase(), iW);
  doc.text(nameLines[0], iX, iY);
  if (nameLines[1]) doc.text(nameLines[1], iX, iY + 4.5);

  // Gold rule under name
  const ruleY = iY + (nameLines[1] ? 6.5 : 2.5);
  doc.setDrawColor(...GOLDR);
  doc.setLineWidth(0.4);
  doc.line(iX, ruleY, iX + iW, ruleY);

  // Info rows
  const rows = [
    ['Roll No', card.roll_number || card.staff_id || '—'],
    ['Class',   card.class_name || card.role || '—'],
    ['Session', card.academic_year || '2025–2026'],
    ...(card.dob ? [['D.O.B', card.dob]] : []),
  ];
  let ry = ruleY + 3.5;
  for (const [label, value] of rows) {
    // Label
    doc.setFontSize(4.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GOLDR);
    doc.text(label.toUpperCase(), iX, ry);
    // Dot leaders
    doc.setFontSize(4);
    doc.setTextColor(100, 120, 150);
    doc.text('············', iX + 12, ry);
    // Value
    doc.setFontSize(5.2);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(230, 235, 245);
    doc.text(String(value), iX + 22, ry);
    ry += 4;
  }

  // ── Footer ──
  const fY = y + H - 9;
  doc.setFillColor(...hexRgb(th.bg3));
  doc.roundedRect(x, fY, W, 9, 0, 0, 'F');
  doc.roundedRect(x, fY, W, 9, 3, 3, 'F');
  // Gold line above footer
  doc.setDrawColor(...GOLDR);
  doc.setLineWidth(0.3);
  doc.line(x + 3, fY, x + W - 3, fY);

  // Mini QR grid (6×6)
  const qX = x + 4, qY = fY + 1.5, cellSz = 0.9;
  const bits = qrBits(card.roll_number || card._id || 'school');
  bits.forEach((bit, i) => {
    const col = i % 6, row = Math.floor(i / 6);
    if (bit) {
      doc.setFillColor(...GOLDR);
      doc.rect(qX + col * cellSz, qY + row * cellSz, cellSz - 0.15, cellSz - 0.15, 'F');
    }
  });

  // Website & phone
  doc.setFontSize(4.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 175, 200);
  doc.text(SCHOOL_WEB, x + W / 2, fY + 4, { align: 'center' });
  doc.text(SCHOOL_PHONE, x + W / 2, fY + 7.5, { align: 'center' });

  // Card no (right side of footer)
  doc.setFontSize(4);
  doc.setTextColor(...GOLDR);
  doc.text(`ID: ${(card.roll_number || card.staff_id || '000').toString().padStart(6,'0')}`, x + W - 4, fY + 5.5, { align: 'right' });
}

function drawPhotoBox(doc, x, y, w, h, th) {
  doc.setFillColor(...hexRgb(th.stripe));
  doc.rect(x, y, w, h, 'F');
  doc.setFillColor(100, 120, 160);
  // head
  doc.circle(x + w / 2, y + h * 0.3, 3.2, 'F');
  // shoulders
  doc.setFillColor(80, 100, 140);
  doc.ellipse(x + w / 2, y + h * 0.72, 5, 3.5, 'F');
}

// ── Browser Preview Card ──────────────────────────────────────────────────────
function PreviewCard({ card, theme, logoUrl }) {
  const th     = THEMES[theme] || THEMES.navy;
  const photoUrl = card.photo ? `${API_BASE}/uploads/students/${card.photo}` : null;
  // deterministic QR bits
  const bits   = qrBits(card.roll_number || card._id || 'school');

  return (
    <div style={{
      width: 380, height: 240,
      borderRadius: 14,
      background: `linear-gradient(160deg, ${th.bg1} 0%, ${th.bg2} 45%, ${th.bg3} 100%)`,
      position: 'relative', overflow: 'hidden',
      fontFamily: "'Inter','Helvetica Neue',sans-serif",
      boxShadow: `0 32px 80px rgba(0,0,0,0.65), 0 0 0 1.5px ${GOLD}55`,
      flexShrink: 0,
    }}>

      {/* ── Diagonal watermark ── */}
      <div style={{ position:'absolute', inset:0, opacity:0.04, backgroundImage:'repeating-linear-gradient(45deg,rgba(255,255,255,1) 0,rgba(255,255,255,1) 1px,transparent 0,transparent 50%)', backgroundSize:'14px 14px', pointerEvents:'none' }}/>

      {/* ── Gold top & bottom trim lines ── */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg, transparent 0%, ${GOLD} 30%, ${GOLD} 70%, transparent 100%)`, zIndex:10 }}/>
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:2, background:`linear-gradient(90deg, transparent 0%, ${GOLD} 30%, ${GOLD} 70%, transparent 100%)`, zIndex:10 }}/>
      {/* Gold side lines */}
      <div style={{ position:'absolute', top:0, left:0, bottom:0, width:2, background:`linear-gradient(180deg, transparent 0%, ${GOLD} 30%, ${GOLD} 70%, transparent 100%)`, zIndex:10 }}/>
      <div style={{ position:'absolute', top:0, right:0, bottom:0, width:2, background:`linear-gradient(180deg, transparent 0%, ${GOLD} 30%, ${GOLD} 70%, transparent 100%)`, zIndex:10 }}/>

      {/* ── Inner gold inset border ── */}
      <div style={{ position:'absolute', inset:5, borderRadius:10, border:`1px solid ${GOLD}25`, pointerEvents:'none', zIndex:1 }}/>

      {/* ── Header ── */}
      <div style={{ padding:'10px 14px 8px', display:'flex', alignItems:'center', gap:10, position:'relative', zIndex:2 }}>
        {/* Logo circle */}
        <div style={{ width:38, height:38, borderRadius:'50%', overflow:'hidden', border:`2px solid ${GOLD}`, flexShrink:0, boxShadow:`0 0 14px ${GOLD}60, 0 2px 8px rgba(0,0,0,0.4)`, background:'#fff' }}>
          <img src={logoUrl || localLogo} alt="logo"
            style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
            onError={e => { e.target.style.display='none'; }}/>
        </div>
        {/* School text */}
        <div style={{ flex:1 }}>
          <div style={{ color:'#fff', fontSize:11, fontWeight:800, letterSpacing:'-0.01em', lineHeight:1.2, textShadow:'0 1px 4px rgba(0,0,0,0.4)' }}>
            {SCHOOL_NAME}
          </div>
          <div style={{ color:GOLD, fontSize:8, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', marginTop:2 }}>
            Excellence in Education
          </div>
        </div>
        {/* Badge */}
        <div style={{ background:`linear-gradient(135deg, ${GOLD}, #e8cc7a)`, borderRadius:6, padding:'4px 10px', flexShrink:0, boxShadow:`0 2px 8px ${GOLD}60` }}>
          <span style={{ color:th.bg1, fontSize:7, fontWeight:900, letterSpacing:'0.12em', textTransform:'uppercase' }}>
            {card.type === 'staff' ? 'STAFF ID' : 'STUDENT ID'}
          </span>
        </div>
      </div>

      {/* Gold rule below header */}
      <div style={{ margin:'0 14px', height:1, background:`linear-gradient(90deg, transparent, ${GOLD}80, ${GOLD}, ${GOLD}80, transparent)`, zIndex:2 }}/>

      {/* ── Body ── */}
      <div style={{ display:'flex', gap:0, padding:'10px 14px 8px', position:'relative', zIndex:2 }}>

        {/* Photo */}
        <div style={{ flexShrink:0, marginRight:14 }}>
          <div style={{ width:72, height:88, borderRadius:8, overflow:'hidden', border:`2.5px solid ${GOLD}`, boxShadow:`0 0 20px ${GOLD}40, 0 4px 16px rgba(0,0,0,0.5)`, background:`linear-gradient(135deg, ${th.stripe}, ${th.bg2})`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative' }}>
            {photoUrl ? (
              <img src={photoUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}/>
            ) : null}
            <div style={{ display: photoUrl ? 'none' : 'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', width:'100%', height:'100%', gap:4 }}>
              {/* silhouette */}
              <div style={{ width:26, height:26, borderRadius:'50%', background:`rgba(255,255,255,0.15)`, marginBottom:2 }}/>
              <div style={{ width:44, height:18, borderRadius:'50% 50% 0 0 / 100% 100% 0 0', background:`rgba(255,255,255,0.1)` }}/>
            </div>
          </div>
        </div>

        {/* Info */}
        <div style={{ flex:1, minWidth:0 }}>
          {/* Name */}
          <div style={{ color:'#fff', fontSize:14.5, fontWeight:900, letterSpacing:'-0.02em', lineHeight:1.1, marginBottom:5, wordBreak:'break-word', textShadow:'0 1px 6px rgba(0,0,0,0.4)' }}>
            {(card.name || 'Unknown').toUpperCase()}
          </div>
          {/* Gold rule under name */}
          <div style={{ height:1.5, background:`linear-gradient(90deg, ${GOLD}, ${GOLD}30)`, borderRadius:1, marginBottom:8 }}/>

          {/* Detail rows */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', rowGap:5, columnGap:8 }}>
            {[
              ['Roll No',  card.roll_number || card.staff_id || '—'],
              ['Class',    card.class_name || card.role || '—'],
              ['Session',  card.academic_year || '2025–2026'],
              ['D.O.B',    card.dob || '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ color:GOLD, fontSize:6.5, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', lineHeight:1, marginBottom:2 }}>{k}</div>
                <div style={{ color:'rgba(255,255,255,0.92)', fontSize:8.5, fontWeight:600, letterSpacing:'0.01em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ position:'absolute', bottom:2, left:2, right:2, height:34, background:`rgba(0,0,0,0.45)`, borderRadius:'0 0 11px 11px', borderTop:`1px solid ${GOLD}40`, display:'flex', alignItems:'center', padding:'0 12px', gap:10, backdropFilter:'blur(6px)', zIndex:2 }}>
        {/* Micro QR */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:1.5, flexShrink:0 }}>
          {bits.map((bit, i) => (
            <div key={i} style={{ width:5, height:5, borderRadius:1, background: bit ? GOLD : 'rgba(255,255,255,0.08)' }}/>
          ))}
        </div>
        {/* Centre text */}
        <div style={{ flex:1, textAlign:'center' }}>
          <div style={{ color:'rgba(255,255,255,0.5)', fontSize:6.5, fontWeight:500, letterSpacing:'0.06em' }}>{SCHOOL_WEB}</div>
          <div style={{ color:'rgba(255,255,255,0.35)', fontSize:6, letterSpacing:'0.04em', marginTop:2 }}>{SCHOOL_PHONE}</div>
        </div>
        {/* Card ID */}
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ color:`${GOLD}90`, fontSize:6, fontWeight:700, letterSpacing:'0.08em' }}>CARD NO</div>
          <div style={{ color:GOLD, fontSize:7.5, fontWeight:800, fontFamily:'monospace', letterSpacing:'0.06em' }}>
            {(card.roll_number || card.staff_id || '000').toString().padStart(6,'0').toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function IDCards() {
  const [filterType,   setFilterType]   = useState('students');
  const [filterClass,  setFilterClass]  = useState('');
  const [classes,      setClasses]      = useState([]);
  const [people,       setPeople]       = useState([]);
  const [selected,     setSelected]     = useState(new Set());
  const [loading,      setLoading]      = useState(false);
  const [generating,   setGenerating]   = useState(false);
  const [search,       setSearch]       = useState('');
  const [theme,        setTheme]        = useState('navy');
  const [logoUrl,      setLogoUrl]      = useState(localLogo);
  const [previewIdx,   setPreviewIdx]   = useState(0);
  const [showPreview,  setShowPreview]  = useState(true);

  useEffect(() => { fetchClasses(); fetchSettings(); }, []);
  useEffect(() => { fetchPeople(); setSelected(new Set()); }, [filterType, filterClass]);

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/settings');
      if (data.logo_url) setLogoUrl(`${API_BASE}${data.logo_url}`);
    } catch { /* keep bundled logo */ }
  };

  const fetchClasses = async () => {
    try { const { data } = await api.get('/school-classes'); setClasses(data); } catch {}
  };

  const fetchPeople = async () => {
    setLoading(true);
    try {
      if (filterType === 'students') {
        const params = filterClass ? { class_id: filterClass } : {};
        const { data } = await api.get('/students', { params });
        const list = Array.isArray(data) ? data : (data.students || []);
        setPeople(list.map(s => ({
          _id:           s._id,
          name:          s.full_name || s.name,
          roll_number:   s.roll_number,
          class_name:    s.school_class_id
            ? `${s.school_class_id.name}–${s.school_class_id.section || 'A'}`
            : (s.class_name || '—'),
          academic_year: s.academic_year_id?.label || '2025–2026',
          photo:         s.photo || '',
          dob:           s.dob ? new Date(s.dob).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—',
          type:          'student',
        })));
      } else {
        const { data } = await api.get('/staff');
        setPeople(data.map(s => ({
          _id:      s._id,
          name:     s.name,
          staff_id: s.staff_id || s._id?.toString().slice(-6).toUpperCase(),
          role:     (s.role || '').replace('_', ' '),
          photo:    s.photo || '',
          type:     'staff',
        })));
      }
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const toggleSel = (id) => setSelected(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(p => String(p._id))));
  };

  const filtered = people.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name?.toLowerCase().includes(q)
      || p.roll_number?.toLowerCase().includes(q)
      || p.staff_id?.toLowerCase().includes(q);
  });

  const selList = people.filter(p => selected.has(String(p._id)));

  const generatePDF = async () => {
    if (!selList.length) { toast.warn('Select at least one person'); return; }
    setGenerating(true);
    try {
      // Load logo: prefer 512px PNG for crisp print
      let logoB64 = await loadB64(LOGO_PNG_URL);
      if (!logoB64) logoB64 = await loadB64(localLogo);
      if (logoUrl && logoUrl !== localLogo) {
        const srv = await loadB64(logoUrl);
        if (srv) logoB64 = srv;
      }

      // Load student photos
      const photoMap = {};
      await Promise.all(selList.map(async c => {
        if (c.photo) {
          const b = await loadB64(`${API_BASE}/uploads/students/${c.photo}`);
          if (b) photoMap[String(c._id)] = b;
        }
      }));

      // Layout: 2 cols × 3 rows on A4 portrait
      const COLS = 2, ROWS = 3, CPP = 6;
      const PW = 210, PH = 297;
      const mX = (PW - COLS * CARD_W) / (COLS + 1);
      const mY = (PH - ROWS * CARD_H) / (ROWS + 1);

      const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });

      for (let i = 0; i < selList.length; i++) {
        if (i > 0 && i % CPP === 0) doc.addPage();
        const pos = i % CPP;
        const col = pos % COLS, row = Math.floor(pos / COLS);
        const x = mX + col * (CARD_W + mX);
        const y = mY + row * (CARD_H + mY);
        await drawCard(doc, selList[i], x, y, theme, logoB64, photoMap);
      }

      doc.save(`IDCards_${filterType}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success(`Generated ${selList.length} card${selList.length > 1 ? 's' : ''}`);
    } catch (e) {
      console.error(e);
      toast.error('PDF generation failed');
    } finally { setGenerating(false); }
  };

  const previewCards = selList.length ? selList : filtered.slice(0, 8);

  return (
    <div className="min-h-screen pb-16" style={{ background:'#f1f5f9' }}>

      {/* ── Page header ── */}
      <div className="px-6 pt-8 pb-0">
        <div className="flex items-center gap-4">
          <div style={{ width:48, height:48, borderRadius:14, background:'linear-gradient(135deg,#0b1528,#1a3a6b)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 24px rgba(11,21,40,0.4)' }}>
            <CreditCard className="w-6 h-6 text-white"/>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Student ID Cards</h1>
            <p className="text-sm text-slate-500">Premium · Gold-trim · School logo &amp; photo embedded</p>
          </div>
        </div>
      </div>

      <div className="px-6 mt-6 space-y-6">

        {/* ── Controls bar ── */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
          <div className="flex flex-wrap gap-4 items-end">

            {/* Type */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Type</p>
              <div className="flex gap-2">
                {[{id:'students',label:'Students',icon:Users},{id:'staff',label:'Staff',icon:Briefcase}].map(t=>(
                  <button key={t.id} onClick={()=>setFilterType(t.id)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${filterType===t.id?'bg-slate-900 text-white border-slate-900 shadow':'border-slate-200 text-slate-500 hover:border-slate-400'}`}>
                    <t.icon className="w-4 h-4"/>{t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Class */}
            {filterType==='students' && (
              <div className="min-w-[150px]">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Class</p>
                <select value={filterClass} onChange={e=>setFilterClass(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400">
                  <option value="">All Classes</option>
                  {classes.map(c=><option key={c._id} value={c._id}>{c.name}–{c.section||'A'}</option>)}
                </select>
              </div>
            )}

            {/* Theme swatches */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Theme</p>
              <div className="flex gap-2 items-center">
                {Object.entries(THEMES).map(([key,th])=>(
                  <button key={key} title={th.label} onClick={()=>setTheme(key)}
                    className={`w-9 h-9 rounded-xl transition-all ${theme===key?'scale-110 ring-2 ring-offset-2':''}`}
                    style={{ background:`linear-gradient(135deg,${th.bg1},${th.bg2})`, ringColor: GOLD, boxShadow: theme===key?`0 0 0 2px ${GOLD}`:'none' }}>
                    {theme===key && <span style={{ display:'block', width:'100%', height:'100%', borderRadius:10, border:`2px solid ${GOLD}` }}/>}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 flex-1 min-w-[180px] max-w-xs">
              <Search className="w-4 h-4 text-slate-400 shrink-0"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name / roll…"
                className="bg-transparent outline-none text-sm text-slate-700 flex-1 min-w-0"/>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 ml-auto">
              <button onClick={()=>setShowPreview(v=>!v)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border transition-all ${showPreview?'bg-indigo-600 text-white border-indigo-600':'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'}`}>
                <Eye className="w-4 h-4"/>{showPreview?'Hide Preview':'Show Preview'}
              </button>
              <button onClick={generatePDF} disabled={generating||!selList.length}
                style={{ background:'linear-gradient(135deg,#0b1528,#1a3a6b)', boxShadow:'0 4px 16px rgba(11,21,40,0.4)' }}
                className="flex items-center gap-2 text-white px-5 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 transition-all hover:opacity-90">
                {generating?<RefreshCw className="w-4 h-4 animate-spin"/>:<Download className="w-4 h-4"/>}
                {generating?'Generating…':`Download PDF${selList.length?` (${selList.length})`:''}`}
              </button>
            </div>
          </div>
        </div>

        {/* ── Card Preview ── */}
        {showPreview && previewCards.length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-extrabold text-slate-800 text-lg tracking-tight">Live Preview</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selList.length ? `${selList.length} card${selList.length>1?'s':''} selected` : 'Sample cards — click rows below to select'}
                  {' · '}Logo: {logoUrl !== localLogo ? 'Custom ✓' : 'School logo ✓'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={()=>setPreviewIdx(i=>Math.max(0,i-1))} disabled={previewIdx===0}
                  className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 disabled:opacity-30 transition-all">
                  <ChevronLeft size={16}/>
                </button>
                <span className="text-xs font-bold text-slate-500 tabular-nums w-12 text-center">
                  {previewIdx+1} / {previewCards.length}
                </span>
                <button onClick={()=>setPreviewIdx(i=>Math.min(previewCards.length-1,i+1))} disabled={previewIdx>=previewCards.length-1}
                  className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 disabled:opacity-30 transition-all">
                  <ChevronRight size={16}/>
                </button>
              </div>
            </div>

            {/* Show current card centred + neighbours dimmed */}
            <div className="flex gap-5 items-center justify-center flex-wrap">
              {[-1, 0, 1].map(offset => {
                const idx = previewIdx + offset;
                if (idx < 0 || idx >= previewCards.length) return null;
                const isCentre = offset === 0;
                return (
                  <div key={idx} style={{ transform: isCentre ? 'scale(1)' : 'scale(0.88)', opacity: isCentre ? 1 : 0.45, transition:'all 0.3s cubic-bezier(.4,0,.2,1)', filter: isCentre ? 'none' : 'blur(1px)' }}>
                    <PreviewCard card={previewCards[idx]} theme={theme} logoUrl={logoUrl}/>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── People table ── */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/70">
            <button onClick={selectAll} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
              {selected.size > 0 && selected.size === filtered.length
                ? <CheckSquare className="w-5 h-5 text-indigo-600"/>
                : selected.size > 0
                  ? <div className="w-5 h-5 rounded border-2 border-indigo-400 bg-indigo-50 flex items-center justify-center"><div className="w-2.5 h-0.5 bg-indigo-600 rounded"/></div>
                  : <Square className="w-5 h-5 text-slate-300"/>}
              {selected.size === filtered.length && filtered.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
            <div className="h-4 w-px bg-slate-200"/>
            <span className="text-xs text-slate-400 font-medium">
              {filtered.length} {filterType} &nbsp;·&nbsp; <span className="text-indigo-600 font-bold">{selected.size} selected</span>
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin"/>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <CreditCard size={40} className="text-slate-200 mx-auto mb-3"/>
              <p className="text-slate-400 text-sm">No records found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="w-10 px-5 py-3"/>
                    <th className="text-left px-4 py-3">Name</th>
                    {filterType==='students'?(
                      <>
                        <th className="text-left px-4 py-3">Roll No</th>
                        <th className="text-left px-4 py-3">Class</th>
                        <th className="text-left px-4 py-3">Session</th>
                      </>
                    ):(
                      <>
                        <th className="text-left px-4 py-3">Staff ID</th>
                        <th className="text-left px-4 py-3">Role</th>
                      </>
                    )}
                    <th className="text-left px-4 py-3">Photo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(p => {
                    const isSel = selected.has(String(p._id));
                    return (
                      <tr key={p._id} onClick={()=>toggleSel(String(p._id))}
                        className={`cursor-pointer transition-colors ${isSel?'bg-indigo-50':'hover:bg-slate-50/80'}`}>
                        <td className="px-5 py-3">
                          {isSel?<CheckSquare className="w-4 h-4 text-indigo-600"/>:<Square className="w-4 h-4 text-slate-300"/>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {p.photo?(
                              <img src={`${API_BASE}/uploads/students/${p.photo}`} alt=""
                                className="w-10 h-10 rounded-xl object-cover border-2 border-slate-100 shrink-0"/>
                            ):(
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-extrabold text-sm shrink-0">
                                {p.name?.charAt(0)}
                              </div>
                            )}
                            <span className="font-semibold text-slate-800">{p.name}</span>
                          </div>
                        </td>
                        {filterType==='students'?(
                          <>
                            <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.roll_number||'—'}</td>
                            <td className="px-4 py-3 text-slate-600">{p.class_name||'—'}</td>
                            <td className="px-4 py-3 text-slate-500">{p.academic_year||'—'}</td>
                          </>
                        ):(
                          <>
                            <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.staff_id}</td>
                            <td className="px-4 py-3 text-slate-600 capitalize">{p.role}</td>
                          </>
                        )}
                        <td className="px-4 py-3">
                          {p.photo?(
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">✓ Photo</span>
                          ):(
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">No photo</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Tips ── */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-2">
            <span style={{ background:`linear-gradient(135deg,${GOLD},#e8cc7a)`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>★</span>
            Premium ID Card Tips
          </p>
          <ul className="text-xs text-amber-700 space-y-1.5 list-disc list-inside font-medium">
            <li>School logo is already embedded (same as sidebar) — upload a custom one in <strong>Settings → Institute</strong></li>
            <li>Student photos show on the card — add them in <strong>Admissions → Edit Student</strong></li>
            <li>PDF exports at 85.6 × 54 mm (credit card size) — <strong>6 cards per A4 page</strong></li>
            <li>PNG 512×512 is used for PDF logo for <strong>crisp print quality</strong></li>
            <li>Update school phone &amp; website at top of <code>IDCards.jsx</code> (<code>SCHOOL_PHONE</code>, <code>SCHOOL_WEB</code>)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
