import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import registerHandlers from './socket-handlers.js';

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173', 'http://127.0.0.1:5173/',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log('A user connected', socket.id);
  registerHandlers(io, socket);
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
