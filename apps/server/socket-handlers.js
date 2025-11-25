// socket (server side) - "CONTROLLER"
// Socket.on etc:
// Listen for events from that one user
// Send data to that one user
// Access their socket.id
// Handle disconnects
// Authentication:


import socket from '../../../doodle-duel-FE/doodle-duel-ReactFE/src/socket';
import { checkIfTokenIsValid, createNewUserToken } from './utils/auth';
import { generateRoomCode } from './utils/roomCode';

const { rooms, createRoom, joinRoom, leaveRoom } = require('./roomManager');

function registerHandlers(io, socket) {

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
     createRoom(roomCode, socket.id); // room code generated above, socket.id = the hosts socket id
     socket.emit('roomCreated', roomCode); //'roomCreated' = an 'event'
  })

  socket.on('join-room', ({ roomCode, nickname }) => {
    if (!rooms[roomCode]) {
return
    }

    // Add player
    joinRoom(roomCode, socket.id, nickname);

    // Join the socket.io room
    socket.join(roomCode);

    // Notify others
    io.to(roomCode).emit('player-list', rooms[roomCode].players);

    console.log(`${nickname} joined room ${roomCode}`);
  });

  socket.on('draw', (data) => {
    console.log(':pencil2: draw event from', socket.id, data);
    socket.broadcast.emit('draw', data);
  });

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

  //   socket.on('chat message', (msg) => {
//     console.log('message from client:', msg);

//     io.emit('chat message', msg);
//   });
}

module.exports = registerHandlers;

module.exports = registerHandlers;