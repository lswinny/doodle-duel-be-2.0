import jwt from 'jsonwebtoken';
import { SECRET, checkIfTokenIsValid } from './utils/auth.js';
import { generateRoomCode } from './utils/roomCode.js';
import fs from 'fs';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  addSubmission,
  judgeRoomSubmissions,
  rooms,
  startNewRound,
  handlePlayerLeaving
} from './roomManager.js';

const prompts = JSON.parse(
  fs.readFileSync(new URL('../shared/prompts.json', import.meta.url))
);

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
    socket.emit('roomCreated', roomCode, rooms[roomCode]);
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

    const room = rooms[roomCode];
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }

    joinRoom(roomCode, socket.id, nickname);
    socket.join(roomCode);

    io.to(roomCode).emit('room:data', {
      roomCode,
      host: room.host,
      players: room.players,
      submissions: room.submissions,
    });
    console.log(`${nickname} joined room ${roomCode}`);
    io.emit('lobby:rooms-updated', Object.keys(rooms));
  });

  socket.on('get-room-data', ({ roomCode }) => {
    const room = rooms[roomCode];

    if (!room) {
      socket.emit('room:data', null);
      return;
    }

    socket.emit('room:data', {
      host: room.host,
      players: room.players,
      submissions: room.submissions,
    });
  });

  socket.on('start-game', ({ roomCode, token, duration = 30 }) => {
    const userData = checkIfTokenIsValid(token);
    if (!userData) {
      socket.emit('error', 'Invalid or expired token');
      return;
    }

    const room = rooms[roomCode];
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }
    if (socket.id !== room.host) {
      socket.emit('error', 'Only the host can start the game');
      return;
    }

    console.log('START GAME RECEIVED ON SERVER');
    io.to(roomCode).emit('game-started', { roomCode, roomData: { ...room } });

    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];

    let preCount = 3;
    const preInterval = setInterval(() => {
      io.to(roomCode).emit('round:precountdown', {
        count: preCount,
        prompt: randomPrompt.prompt,
        category: randomPrompt.category,
        promptId: randomPrompt.id,
        duration,
      });
      preCount = preCount - 1;

      if (preCount < 0) {
        clearInterval(preInterval);
        room.currentPrompt = randomPrompt.prompt;
        io.to(roomCode).emit('round:start', {
          duration,
          prompt: randomPrompt.prompt,
          promptId: randomPrompt.id,
          category: randomPrompt.category,
        });

        let timeLeft = duration;

        const interval = setInterval(() => {
          timeLeft = timeLeft - 1;
          io.to(roomCode).emit('round:countdown', { timeLeft });
          console.log('TICK room', roomCode, 'timeLeft', timeLeft);

          if (timeLeft <= 0) {
            clearInterval(interval);
            io.to(roomCode).emit('round:ended');
            // Trigger judging or put next-round setup here
          }
        }, 1000);
      }
    }, 1000);
  });

  socket.on('next-round', ({ roomCode }) => {
    const data = startNewRound(roomCode);

    if (!data) {
      socket.emit('error', 'Room not found');
      return;
    }

    io.to(roomCode).emit('round:start', data);
  });

  // socket.on('draw', (data) => {
  //   console.log(':pencil2: draw event from', socket.id, data);
  //   socket.broadcast.emit('draw', data);
  // });

  socket.on('disconnect', () => {
    for (const roomCode in rooms) {
      const result = handlePlayerLeaving(roomCode, socket.id);

      if (!result) continue;

      if (result.roomClosed) {
        io.to(roomCode).emit('roomClosed', { roomCode });
        io.emit('lobby:rooms-updated', Object.keys(rooms));
        console.log(`Host disconnected — room ${roomCode} deleted`);
      } else {
        io.to(roomCode).emit('room:data', {
          roomCode,
          host: rooms[roomCode].host,
          players: rooms[roomCode].players,
          submissions: rooms[roomCode].submissions,
        });
        console.log(`Player ${socket.id} disconnected from room ${roomCode}`);
      }
    }
  });

  socket.on('quit-room', ({ roomCode }) => {
    const result = handlePlayerLeaving(roomCode, socket.id);

    if (!result) return;

    if (result.roomClosed) {
      io.to(roomCode).emit('roomClosed', { roomCode });
      io.emit('lobby:rooms-updated', Object.keys(rooms));
      console.log(`Host quit — room ${roomCode} deleted`);
    } else {
      io.to(roomCode).emit('room:data', {
        roomCode,
        host: rooms[roomCode].host,
        players: rooms[roomCode].players,
        submissions: rooms[roomCode].submissions,
      });
      console.log(`Player ${socket.id} quit room ${roomCode}`);
    }

    socket.leave(roomCode);
  });

  socket.on('submit-drawing', ({ roomCode, imageData }) => {
    if (!roomCode || !imageData) {
      console.warn('submit-drawing called without roomCode or imageData');
      return;
    }

    const ok = addSubmission(roomCode, socket.id, imageData);
    if (!ok) {
      socket.emit('error', {
        message: 'Room not found when submitting drawing',
      });
      return;
    }

    console.log(`Submission stored for room ${roomCode}, socket ${socket.id}`);
  });

  socket.on('judge-round', async ({ roomCode, promptId }) => {
    try {
      const result = await judgeRoomSubmissions(roomCode, promptId);

      // Broadcast the winner and scores to everyone in the room
      io.to(roomCode).emit('round-result', {
        prompt: result.prompt,
        winnerSocketId: result.winnerSocketId,
        scores: result.scores,
        isFallback: result.isFallback,
        error: result.error,
      });
    } catch (err) {
      console.error('Error during AI judging:', err.message);
      socket.emit('error', {
        message: 'Could not judge round',
        details: err.message,
      });
    }
  });
}
