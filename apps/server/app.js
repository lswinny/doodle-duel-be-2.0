import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import sanitizeImage from './middleware/imageSanitizer.js';
import { uploadImage } from './controllers/image.controller.js';
import cors from 'cors';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });
const app = express();

app.use(cors());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')));
app.post('/upload', upload.single('image'), sanitizeImage, uploadImage);

app.use(express.json({ limit: '2mb' }));

export default app;
