export function generateRoomCode(length = 6) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.chartAt(Math.floor(Math.random() * chars.length))
    }
    return roomCode;
}

module.exprts = {generateRoomCode};