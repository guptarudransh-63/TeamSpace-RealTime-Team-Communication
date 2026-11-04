import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueHash = crypto.randomBytes(16).toString('hex');
    cb(null, `${Date.now()}-${uniqueHash}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  // Allow common images, audio, video, pdfs, and documents
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'text/plain',
    'text/csv',
    'text/markdown',
    'application/json',
    'application/zip',
    'application/javascript',
    'text/javascript',
    'text/html',
    'text/css',
    'text/yaml',
    'application/x-yaml',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (
    allowedMimes.includes(file.mimetype) ||
    file.mimetype.startsWith('image/') ||
    file.mimetype.startsWith('text/')
  ) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not supported`), false);
  }
};

const maxFileSize = (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 25) * 1024 * 1024;

export const upload = multer({
  storage,
  limits: { fileSize: maxFileSize },
  fileFilter,
});

export const getUploadDirectory = () => uploadDir;
