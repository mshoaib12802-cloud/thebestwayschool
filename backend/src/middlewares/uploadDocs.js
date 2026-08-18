const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const makeDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); return dir; };

// Documents storage (PDFs, images, etc.)
const docStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, makeDir(path.join(__dirname, '../../uploads/documents'))),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `doc-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});
const docFilter = (req, file, cb) => {
  const allowed = ['image/jpeg','image/png','image/gif','application/pdf','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  cb(allowed.includes(file.mimetype) ? null : new Error('Only images, PDF and Word files allowed'), allowed.includes(file.mimetype));
};
exports.uploadDoc = multer({ storage: docStorage, fileFilter: docFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// Settings logo storage
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, makeDir(path.join(__dirname, '../../uploads/settings'))),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `logo-${Date.now()}${ext}`);
  },
});
const imgFilter = (req, file, cb) => {
  cb(file.mimetype.startsWith('image/') ? null : new Error('Only images allowed'), file.mimetype.startsWith('image/'));
};
exports.uploadLogo = multer({ storage: logoStorage, fileFilter: imgFilter, limits: { fileSize: 2 * 1024 * 1024 } });
