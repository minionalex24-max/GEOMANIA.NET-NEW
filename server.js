/**
 * Minimal backend for Geomania file uploads.
 * - Streaming multipart upload to filesystem using multer diskStorage
 * - Unique filenames with timestamp + random suffix
 * - Date-based directories to avoid huge single-folder storage
 * - Static file serving via /files/<path>
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_ROOT = path.join(__dirname, 'uploads');

fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

const blockedExt = new Set(['.exe', '.bat', '.cmd', '.com', '.msi', '.sh', '.ps1', '.jar', '.php', '.py']);

function safeName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const now = new Date();
    const dir = path.join(
      UPLOAD_ROOT,
      String(now.getUTCFullYear()),
      String(now.getUTCMonth() + 1).padStart(2, '0'),
      String(now.getUTCDate()).padStart(2, '0')
    );
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const base = path.basename(file.originalname || 'file', ext);
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    cb(null, `${safeName(base)}-${unique}${ext}`);
  }
});

const upload = multer({
  storage,
  // Several GB upload support.
  limits: {
    fileSize: 50 * 1024 * 1024 * 1024 // 50GB
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (blockedExt.has(ext)) {
      return cb(new Error('Forbidden file type'));
    }
    cb(null, true);
  }
});

app.use(express.static(__dirname));
app.use('/files', express.static(UPLOAD_ROOT, {
  dotfiles: 'deny',
  index: false,
  maxAge: '7d',
  immutable: false
}));

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const relativePath = path.relative(UPLOAD_ROOT, req.file.path).replace(/\\/g, '/');
  const fileUrl = `/files/${relativePath}`;

  res.json({
    fileUrl,
    fileName: req.file.filename,
    originalName: req.file.originalname,
    fileType: req.file.mimetype,
    size: req.file.size
  });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ error: err.message || 'Request failed' });
  }
  next();
});

app.listen(PORT, () => {
  console.log(`Geomania server running on http://localhost:${PORT}`);
});
