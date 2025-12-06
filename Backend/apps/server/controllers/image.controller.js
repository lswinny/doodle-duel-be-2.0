import { addSubmission, findRoom } from '../roomManager.js';
import binaryToBase64 from '../utils/binarytob64.js';

export async function uploadImage(req, res) {
  if (!req.body) {
    return res.status(400).send({
      message: 'Request does not contain a body',
    });
  }
  const { socketId, roomCode } = req.body;
  const file = req.file;

  if (!socketId || !roomCode) {
    return res.status(400).send({
      message: 'socketId, roomCode and image are required.',
    });
  }

  if (!findRoom(roomCode)) {
    return res.status(400).send({
      message: 'Room does not exist',
    });
  }

  addSubmission(roomCode, socketId, file);
  res.send({
    message: 'Image Upload Successful',
  });
}
