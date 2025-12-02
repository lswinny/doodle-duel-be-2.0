import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import sanitizeImage from './middleware/imageSanitizer.js';
import { uploadImage } from './controllers/image.controller.js';
import cors from 'cors';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '2mb' }));
app.use('/upload', sanitizeImage);
app.use(cors());

app.get('/upload', uploadImage);

export default app;
