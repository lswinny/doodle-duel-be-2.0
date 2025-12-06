import sharp from 'sharp';

async function sanitizeImage(req, res, next) {
  if (!req.file) return next();
  try {
    const buffer = await sharp(req.file.buffer)
      .rotate()
      .resize(800, 800, { fit: 'inside' }) // size limit
      .png({ compressionLevel: 9 })
      .toBuffer();

    req.file.buffer = buffer;
    req.file.mimetype = 'image/png';
    req.file.size = buffer.length;

    next();
  } catch (err) {
    next(err);
  }
}

export default sanitizeImage;
