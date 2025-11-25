import { generateRoomCode } from "./utils/roomCode";

// "MODEL" (rather than "Controller" - socket-handler)
const rooms = {};
const roomCode = generateRoomCode()

function createRoom(roomCode, hostId) {
    rooms[roomCode] = {
        host: hostId,
        players: {},    //{socketId: {nickname}}
        submissions: []
    };
}

function joinRoom(roomCode, socketId, nickname){
    if (!rooms[roomCode]) return false;

    rooms[roomCode].players[socketId] = {nickname};
    return true;
}

function leaveRoom(roomCode, socketId){
    if (!rooms[roomCode]) return;
    
    delete rooms[roomCode].players[socketId];

    //remove room if empty
    if (Object.keys(rooms[roomCode].players).length === 0) {
        delete rooms[roomCode];
    }
}

module.exports = {rooms, createRoom, joinRoom, leaveRoom};