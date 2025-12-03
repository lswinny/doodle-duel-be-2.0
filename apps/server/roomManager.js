export const rooms = {};

import { judgeDrawingsWithAI } from './utils/aiJudge.js';
import fs from 'fs';
import { generateRoomCode } from './utils/roomCode.js';
import { io } from './server.js';

// Load the JSON file manually
const prompts = JSON.parse(
  fs.readFileSync(new URL('../shared/prompts.json', import.meta.url))
);

const roomCode = generateRoomCode();

export function createRoom(roomCode, hostId, nickname, server) {
  rooms[roomCode] = {
    host: hostId,
    players: { [hostId]: { nickname } }, //{socketId: {nickname}}
    submissions: [],
    server,
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

  io.to(roomCode).emit('round-results', results);
}
