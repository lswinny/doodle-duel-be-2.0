export default function binaryToBase64(imageData) {
  if (typeof imageData === 'string') {
    if (imageData.startsWith('data:')) {
      const commaIndex = imageData.indexOf(',');
      if (commaIndex !== -1) {
        return imageData.substring(commaIndex + 1);
      }
    }
    return imageData;
  }

  // Original buffer handling
  if (Buffer.isBuffer(imageData)) {
    return imageData.toString('base64');
  }

  if (imageData instanceof Uint8Array) {
    return Buffer.from(imageData).toString('base64');
  }

  if (Array.isArray(imageData)) {
    return Buffer.from(imageData).toString('base64');
  }

  throw new Error('Unsupported image data type for conversion to Base64');
}
