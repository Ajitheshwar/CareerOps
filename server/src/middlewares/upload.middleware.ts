// src/middlewares/upload.middleware.ts
import multer from 'multer';
import * as path from 'path';

const uploadDir = path.join(__dirname, '../../../workspace/resumes');

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
