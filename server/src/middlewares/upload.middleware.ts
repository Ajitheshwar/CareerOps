// src/middlewares/upload.middleware.ts
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';

const uploadDir = path.join(__dirname, '../../../workspace/resumes/temp');

// Ensure the temp directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

export const upload = multer({ storage });
export default upload;
