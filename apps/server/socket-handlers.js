import { checkIfTokenIsValid } from './utils/auth.js';
import { generateRoomCode } from './utils/roomCode.js';

import { createRoom, joinRoom, leaveRoom } from'./roomManager.js';

export default function registerHandlers(io, socket) {

  socket.on("set-nickname", ({nickname}) => {
    const token = jwt.sign({nickname}, SECRET);
    socket.emit("token", {token});
  })

  socket.on('create-room', ({ token }) => { 
  const userData = checkIfTokenIsValid(token);
  if (!userData) {
  socket.emit('Invalid or expired token')
  return;
    }
     const roomCode = generateRoomCode(); 
     createRoom(roomCode, socket.id);
     socket.emit('roomCreated', roomCode);
  })

  socket.on('join-room', ({ roomCode, nickname, token }) => {
    const userData = checkIfTokenIsValid(token);
  if (!userData) {
  socket.emit('Invalid or expired token')
  return;
  }
    if (!rooms[roomCode]) {
      socket.emit("error", "Room not found")
      return
    }

    joinRoom(roomCode, socket.id, nickname);
    socket.join(roomCode);
    io.to(roomCode).emit('player-list', rooms[roomCode].players);
    console.log(`${nickname} joined room ${roomCode}`);
  });

  socket.on('draw', (data) => {
    console.log(':pencil2: draw event from', socket.id, data);
    socket.broadcast.emit('draw', data);
  });

  // Testing event connection
  // socket.on('test-event', (data) => {
  //   console.log('Received from client:', data);
  //   socket.emit('test-response', {reply: 'Hello client!'})
  // })

  socket.on('disconnect', () => {
    // remove player from all rooms
    for (const code in rooms) {
      if (rooms[code].players[socket.id]) {
        leaveRoom(code, socket.id);

        io.to(code).emit('player-list', rooms[code]?.players || {});
      }
    }
    console.log('User disconnected', socket.id);
  });
}