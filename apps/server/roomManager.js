export const rooms = {};

import { judgeDrawingsWithAI } from './utils/aiJudge.js';
import fs from 'fs';
import { io } from './server.js';

const prompts = JSON.parse(
  fs.readFileSync(new URL('../shared/prompts.json', import.meta.url))
);

export function createRoom(roomCode, hostId, nickname, avatar) {
  rooms[roomCode] = {
    host: hostId,
    players: { [hostId]: { nickname, avatar } },
    submissions: [],
    currentPrompt: '',
  };
}

export function findRoom(roomCode) {
  const room = rooms[roomCode];
  return room ? true : false;
}

export function joinRoom(roomCode, socketId, nickname, avatar) {
  if (!findRoom(roomCode)) return;
  const room = rooms[roomCode];
  room.players[socketId] = { nickname, avatar };
}

export function leaveRoom(roomCode, socketId) {
  const room = rooms[roomCode];
  if (!room) return;
  delete room.players[socketId];

  if (Object.keys(rooms[roomCode].players).length === 0) {
    delete rooms[roomCode];
  }
}

export function addSubmission(roomCode, socketId, imageData) {
  const room = rooms[roomCode];
  if (!room) return false;

  const player = room.players[socketId];
  if (!player) {
    console.log(
      `Player with socket ${socketId} not found in current room ${roomCode}`
    );
  }
  room.submissions.push({
    playerName: player.nickname,
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

export async function judgeRoomSubmissions(room) {
  const roomCode = Object.keys(rooms).find((key) => rooms[key] === room);

  if (!room) {
    throw new Error(`Invalid room object`);
  }

  const submissions = room.submissions;
  if (!submissions || submissions.length === 0) {
    throw new Error(`No submissions for room ${roomCode}`);
  }

  const promptText = room.currentPrompt;
  const images = submissions.map((s) => s.imageData);

  const result = await judgeDrawingsWithAI(promptText, submissions);

  const winnerSubmission = submissions[result.winnerIndex];

  const results = {
    prompt: promptText,
    winnerSocketId: winnerSubmission.socketId,
    scores: result.scores,
    isFallback: result.isFallback,
    error: result.error,
  };

  if (roomCode) {
    io.to(roomCode).emit('round-results', results);
  } else {
    console.error('Could not find room code for broadcasting results.');
  }
}

export function startNewRound(roomCode, duration = 30) {
  const room = rooms[roomCode];
  if (!room) return null;

  room.submissions = [];
  room.timeLeft = duration;

  const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];

  return {
    duration,
    prompt: randomPrompt.prompt,
    promptId: randomPrompt.id,
    category: randomPrompt.category,
    room: room,
  };
}

export function handlePlayerLeaving(roomCode, socketId) {
  const room = rooms[roomCode];
  if (!room) return null;

  if (room.host === socketId) {
    delete rooms[roomCode];
    return { roomClosed: true };
  }

  delete room.players[socketId];


  if (Object.keys(room.players).length === 0) {
    delete rooms[roomCode];
    return { roomClosed: true };
  }

  return { roomClosed: false };
}
