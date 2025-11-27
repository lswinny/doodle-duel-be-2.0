import jwt from "jsonwebtoken";
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