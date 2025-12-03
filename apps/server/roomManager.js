export const rooms = {};

import { judgeDrawingsWithAI } from './utils/aiJudge.js';
import fs from 'fs';
import { generateRoomCode } from './utils/roomCode.js';

// Load the JSON file manually
const prompts = JSON.parse(
  fs.readFileSync(new URL('../shared/prompts.json', import.meta.url))
);

// "MODEL" (rather than "Controller" - socket-handler)
const roomCode = generateRoomCode();

export function createRoom(roomCode, hostId, nickname) {
  rooms[roomCode] = {
    host: hostId,
    players: { [hostId]: { nickname } }, //{socketId: {nickname}}
    submissions: [],
  };
}

export function joinRoom(roomCode, socketId, nickname) {
  const room = rooms[roomCode];
  if (!room) return;
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

// ... adding the below exports on my branch

export function addSubmission(roomCode, socketId, imageData) {
  const room = rooms[roomCode];
  if (!room) return false;

  room.submissions.push({
    socketId,
    imageData,
  });

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

export async function judgeRoomSubmissions(roomCode, promptId) {
  const room = rooms[roomCode];
  if (!room) {
    throw new Error(`Room ${roomCode} not found`);
  }

  const submissions = room.submissions;
  if (!submissions || submissions.length === 0) {
    throw new Error(`No submissions for room ${roomCode}`);
  }

  // Find prompt text from prompts.json using the id
  const promptObj = prompts.find((p) => p.id === promptId);
  if (!promptObj) {
    throw new Error(`Prompt with id ${promptId} not found`);
  }

  const promptText = promptObj.prompt;
  const images = submissions.map((s) => s.imageData);

  const result = await judgeDrawingsWithAI(promptText, images);

  const winnerSubmission = submissions[result.winnerIndex];

  return {
    prompt: promptText,
    winnerSocketId: winnerSubmission.socketId,
    scores: result.scores,
    isFallback: result.isFallback,
    error: result.error,
  };
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