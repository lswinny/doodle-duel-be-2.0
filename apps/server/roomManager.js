import { generateRoomCode } from "./utils/roomCode.js";

import { judgeDrawingsWithAI } from "./utils/aiJudge.js";
import fs from "fs";

// Load the JSON file manually
const prompts = JSON.parse(
  fs.readFileSync(new URL("../shared/prompts.json", import.meta.url))
);

// "MODEL" (rather than "Controller" - socket-handler)
const rooms = {};
const roomCode = generateRoomCode()

export function createRoom(roomCode, hostId) {
    rooms[roomCode] = {
        host: hostId,
        players: {},    //{socketId: {nickname}}
        submissions: []
    };
}

export function joinRoom(roomCode, socketId, nickname){
    if (!rooms[roomCode]) return false;

    rooms[roomCode].players[socketId] = {nickname};
    return true;
}

export function leaveRoom(roomCode, socketId){
    if (!rooms[roomCode]) return;
    
    delete rooms[roomCode].players[socketId];

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
  