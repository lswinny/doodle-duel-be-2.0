import jwt from 'jsonwebtoken';
import { SECRET, checkIfTokenIsValid } from './utils/auth.js';
import { generateRoomCode } from './utils/roomCode.js';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  addSubmission,
  judgeRoomSubmissions,
} from "./roomManager.js";


export default function registerHandlers(io, socket) {
  socket.on('set-nickname', ({ nickname }) => {
    const token = jwt.sign({ nickname }, SECRET);
    socket.emit('token', { token });
  });

  socket.on('create-room', ({ token }) => {
    const userData = checkIfTokenIsValid(token);
    if (!userData) {
      socket.emit('Invalid or expired token');
      return;
    }
    const roomCode = generateRoomCode();
    createRoom(roomCode, socket.id, userData.nickname);
    socket.join(roomCode);

    io.emit('lobby:rooms-updated', Object.keys(rooms));
    socket.emit('roomCreated', roomCode);
  });

  socket.on('lobby:join', () => {
    socket.emit('lobby:rooms-updated', Object.keys(rooms));
  });

  socket.on('join-room', ({ roomCode, nickname, token }) => {
    const userData = checkIfTokenIsValid(token);
    if (!userData) {
      socket.emit('Invalid or expired token');
      return;
    }
    if (!rooms[roomCode]) {
      socket.emit('error', 'Room not found');
      return;
    }

    joinRoom(roomCode, socket.id, nickname);
    socket.join(roomCode);
    io.to(roomCode).emit('player-list', {
      players: rooms[roomCode].players,
      hostId: rooms[roomCode].hostId,
    });
    console.log(`${nickname} joined room ${roomCode}`);
    io.emit('lobby:rooms-updated', Object.keys(rooms));
  });

  socket.on('draw', (data) => {
    console.log(':pencil2: draw event from', socket.id, data);
    socket.broadcast.emit('draw', data);
  });

  socket.on('disconnect', () => {
    for (const code in rooms) {
      const room = rooms[code];

      if (room.players[socket.id]) {
        if (room.hostId === socket.id) {
          // Host left, close room
          delete rooms[code];
          io.to(code).emit('roomClosed', { roomCode: code });
          socket.leave(code);
          io.emit('lobby:rooms-updated', Object.keys(rooms));
          console.log(`Host left, room ${code} closed`);
        } else {
          // Regular player left
          leaveRoom(code, socket.id);
          io.to(code).emit('player-list', {
            players: room.players,
            hostId: room.hostId,
          });
          console.log(`Player left room ${code}`);
        }
      }
    }
  });


  socket.on("submit-drawing", ({ roomCode, imageData }) => {
    if (!roomCode || !imageData) {
      console.warn("submit-drawing called without roomCode or imageData");
      return;
    }
  
    const ok = addSubmission(roomCode, socket.id, imageData);
    if (!ok) {
      socket.emit("error", { message: "Room not found when submitting drawing" });
      return;
    }
  
    console.log(`Submission stored for room ${roomCode}, socket ${socket.id}`);
  });


  socket.on("judge-round", async ({ roomCode, promptId }) => {
    try {
      const result = await judgeRoomSubmissions(roomCode, promptId);
  
      // Broadcast the winner and scores to everyone in the room
      io.to(roomCode).emit("round-result", {
        prompt: result.prompt,
        winnerSocketId: result.winnerSocketId,
        scores: result.scores,
        isFallback: result.isFallback,
        error: result.error,
      });
    } catch (err) {
      console.error("Error during AI judging:", err.message);
      socket.emit("error", {
        message: "Could not judge round",
        details: err.message,
      });
    }
  });
  
  
}
