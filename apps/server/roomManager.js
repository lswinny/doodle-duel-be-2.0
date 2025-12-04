export const rooms = {};

import { judgeDrawingsWithAI } from './utils/aiJudge.js';
import fs from 'fs';
import { io } from './server.js';

// Load the JSON file manually
const prompts = JSON.parse(
  fs.readFileSync(new URL('../shared/prompts.json', import.meta.url))
);

export function createRoom(roomCode, hostId, nickname) {
  rooms[roomCode] = {
    host: hostId,
    players: { [hostId]: { nickname } }, //{socketId: {nickname}}
    submissions: [],
    currentPrompt: '',
  };
}

export function findRoom(roomCode) {
  console.log(rooms);
  const room = rooms[roomCode];
  return room ? true : false;
}

export function joinRoom(roomCode, socketId, nickname) {
  if (!findRoom) return;
  const room = rooms[roomCode];
  room.players[socketId] = { nickname };
}

export function leaveRoom(roomCode, socketId) {
  const room = rooms[roomCode];
  if (!room) return;
  delete room.players[socketId];

  //remove room if empty
  if (Object.keys(rooms[roomCode].players).length === 0) {
    delete rooms[roomCode];
  }
}

export function addSubmission(roomCode, socketId, imageData) {
  const room = rooms[roomCode];
  if (!room) return false;

  room.submissions.push({
    socketId,
    imageData,
  });

  if (room.submissions.length === Object.keys(room.players).length) {
    judgeRoomSubmissions(room);
  }

  return true;
}

export function getSubmissions(roomCode) {
  const room = rooms[roomCode];
  if (!room) return [];
  return room.submissions;
}

export function clearSubmissions(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;
  room.submissions = [];
}

// Optional: expose rooms for debugging ONLY – remove in production
export function _getRoom(roomCode) {
  return rooms[roomCode];
}

export async function judgeRoomSubmissions(room) {
  const roomCode = Object.keys(rooms).find(key => rooms[key] === room);
  
  if (!room) {
    throw new Error(`Invalid room object`);
  }

  const submissions = room.submissions;
  if (!submissions || submissions.length === 0) {
    throw new Error(`No submissions for room ${roomCode}`);
  }

  const promptText = room.currentPrompt;
  const images = submissions.map((s) => s.imageData);

  const result = await judgeDrawingsWithAI(promptText, images);

  const winnerSubmission = submissions[result.winnerIndex];

  const results = {
    prompt: promptText,
    winnerSocketId: winnerSubmission.socketId,
    scores: result.scores,
    isFallback: result.isFallback,
    error: result.error,
  };

  console.log(results);

  // The judge implementation from the 'main' branch includes emitting the results
  if (roomCode) {
    io.to(roomCode).emit('round-results', results);
  } else {
    console.error("Could not find room code for broadcasting results.");
  }
}

export function startNewRound(roomCode, duration = 30) {
  const room = rooms[roomCode];
  if (!room) return null;

  // Reset round state
  room.submissions = [];
  //room.scores = {};
  room.timeLeft = duration;

  // Pick a new random prompt
  const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];

  return {
    duration,
    prompt: randomPrompt.prompt,
    promptId: randomPrompt.id,
    category: randomPrompt.category,
  };
}

export function handlePlayerLeaving(roomCode, socketId) {
  const room = rooms[roomCode];
  if (!room) return null;

  if (room.host === socketId) {
    // Host left → delete room
    delete rooms[roomCode];
    return { roomClosed: true };
  } 
  // Regular player leaves
  delete room.players[socketId];

  // If room is now empty after player leaves, delete it
  if (Object.keys(room.players).length === 0) {
    delete rooms[roomCode];
    return { roomClosed: true };
  }

  return { roomClosed: false };
}
