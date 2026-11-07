import multer from 'multer';
import ApiError from '../utils/ApiError.js';

const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
const MAX_MB = 8;

const memory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MB * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.includes(file.mimetype)) {
      return cb(ApiError.badRequest('Only JPG, PNG, WEBP or AVIF images are allowed'));
    }
    cb(null, true);
  },
});

export const uploadImages = memory.array('images', 10);
export const uploadSingle = memory.single('image');
export default memory;
