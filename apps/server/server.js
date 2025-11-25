// server.js
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
  },
});

io.on('connection', (socket) => {
  console.log('🔌 A user connected', socket.id);

  socket.on('chat message', (msg) => {
    console.log('message from client:', msg);

    io.emit('chat message', msg);
  });

  socket.on('disconnect', () => {
    console.log('❌ User disconnected', socket.id);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
