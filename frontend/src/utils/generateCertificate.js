import jsPDF from 'jspdf';

export const generateCertificate = (student) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297, H = 210;

  // --- Background ---
  doc.setFillColor(255, 252, 242); // warm cream
  doc.rect(0, 0, W, H, 'F');

  // --- Outer gold double border ---
  doc.setDrawColor(180, 145, 60);
  doc.setLineWidth(3);
  doc.rect(8, 8, W - 16, H - 16);
  doc.setLineWidth(0.6);
  doc.rect(13, 13, W - 26, H - 26);

  // --- Corner ornaments (filled diamonds) ---
  const corners = [[8, 8], [W - 8, 8], [8, H - 8], [W - 8, H - 8]];
  doc.setFillColor(180, 145, 60);
  corners.forEach(([x, y]) => {
    doc.circle(x, y, 2.5, 'F');
  });

  // --- Top decorative gold bar ---
  doc.setFillColor(20, 20, 60);
  doc.rect(13, 13, W - 26, 36, 'F');

  // --- Institute name ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 215, 80); // gold text
  doc.text('INFLORESCENCE ADVANCE SKILLS', W / 2, 30, { align: 'center' });

  // --- Subtitle ---
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 195, 230);
  doc.text('Excellence in Education  ·  Karachi, Pakistan', W / 2, 41, { align: 'center' });

  // --- "Certificate of Completion" heading ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(32);
  doc.setTextColor(20, 20, 60);
  doc.text('Certificate of Completion', W / 2, 72, { align: 'center' });

  // --- Gold divider under heading ---
  doc.setDrawColor(180, 145, 60);
  doc.setLineWidth(0.8);
  doc.line(60, 77, W - 60, 77);

  // --- Presented to ---
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(13);
  doc.setTextColor(100, 100, 100);
  doc.text('This is to proudly certify that', W / 2, 92, { align: 'center' });

  // --- Student name (large) ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(20, 20, 60);
  doc.text(student.full_name, W / 2, 113, { align: 'center' });

  // Underline the name with gold
  const nameW = doc.getTextWidth(student.full_name);
  doc.setDrawColor(180, 145, 60);
  doc.setLineWidth(1);
  doc.line(W / 2 - nameW / 2, 117, W / 2 + nameW / 2, 117);

  // --- Body text ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(90, 90, 90);
  doc.text('has successfully completed the following course with distinction:', W / 2, 130, { align: 'center' });

  // --- Course name ---
  const courseName = student.courses?.[0]?.course_name || '';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(180, 145, 60);
  doc.text(courseName, W / 2, 146, { align: 'center' });

  // --- Details row ---
  const duration = student.courses?.[0]?.duration || '';
  const completionDate = student.courses?.[0]?.completion_date
    ? new Date(student.courses[0].completion_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(110, 110, 110);
  const batchName = student.courses?.[0]?.batch_id?.name;
  const detailParts = [];
  if (duration) detailParts.push(`Duration: ${duration}`);
  if (batchName) detailParts.push(`Batch: ${batchName}`);
  detailParts.push(`Completed: ${completionDate}`);
  detailParts.push(`Roll No: ${student.roll_number}`);
  doc.text(detailParts.join('   |   '), W / 2, 157, { align: 'center' });

  // --- Signature lines ---
  doc.setDrawColor(180, 145, 60);
  doc.setLineWidth(0.5);
  doc.line(42, 182, 115, 182);
  doc.line(182, 182, 255, 182);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 60);
  doc.text('Principal / Director', 78, 188, { align: 'center' });
  doc.text('Course Coordinator', 218, 188, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text('Inflorescence Advance Skills', 78, 193, { align: 'center' });
  doc.text('Inflorescence Advance Skills', 218, 193, { align: 'center' });

  // --- Bottom gold stripe ---
  doc.setFillColor(180, 145, 60);
  doc.rect(13, H - 17, W - 26, 2, 'F');

  // --- Save ---
  const fileName = `Certificate_${student.full_name.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
};
