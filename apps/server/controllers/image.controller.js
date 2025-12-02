import { addSubmission } from '../roomManager.js';

export function uploadImage(req, res) {
  const { socketId, roomCode } = req.body;
  const file = req.file;

  if (!socketId || !roomCode || !file) {
    return res.status(400).send({
      message: 'socketId, roomCode and image are required.',
    });
  }

  // if (!findRoom(roomCode)) {
  //   return res.status(400).send({
  //     message: 'Room does not exist',
  //   });
  // }

  addSubmission(roomCode, socketId, file);
  res.send({
    message: 'Image Upload Successful',
  });
}
