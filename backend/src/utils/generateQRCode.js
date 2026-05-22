const QRCode = require('qrcode');

const generateQRCode = async (text) => {
  try {
    // QR Code ko Data URL (Image string) main convert krna
    const qrCodeImage = await QRCode.toDataURL(text);
    return qrCodeImage;
  } catch (err) {
    console.error('QR Code Generation Error:', err);
    return null;
  }
};

module.exports = generateQRCode;