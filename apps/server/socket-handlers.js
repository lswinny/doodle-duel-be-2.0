// socket (server side)

// Listen for events from that one user
// Send data to that one user
// Access their socket.id
// Handle disconnects

const { rooms, createRoom, joinRoom, leaveRoom } = require('./roomManager');

function registerHandlers(io, socket) {
//   socket.on('chat message', (msg) => {
//     console.log('message from client:', msg);

//     io.emit('chat message', msg);
//   });


  socket.on('join-room', ({ roomCode, nickname }) => {
    if (!rooms[roomCode]) {
      createRoom(roomCode, socket.id);
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
}

module.exports = registerHandlers;