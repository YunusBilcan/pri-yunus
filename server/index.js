const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"]
  }
});

const activeRooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId) => {
    if (activeRooms.has(roomId) && activeRooms.get(roomId).revoked) {
      socket.emit('error', 'Room has been revoked');
      return;
    }
    
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
    
    if (!activeRooms.has(roomId)) {
      activeRooms.set(roomId, { host: socket.id, revoked: false, timestamp: Date.now() });
      
      // Auto-purge after 1 hour for maximum security
      setTimeout(() => {
        if (activeRooms.has(roomId)) {
          activeRooms.delete(roomId);
          io.to(roomId).emit('room-revoked');
          console.log(`Auto-purged room ${roomId} after timeout`);
        }
      }, 3600000); // 1 hour
    }
  });

  socket.on('send-message', ({ roomId, message }) => {
    if (activeRooms.has(roomId) && activeRooms.get(roomId).revoked) return;
    socket.to(roomId).emit('receive-message', message);
  });

  socket.on('revoke-room', (roomId) => {
    const room = activeRooms.get(roomId);
    if (room && room.host === socket.id) {
      room.revoked = true;
      io.to(roomId).emit('room-revoked');
      console.log(`Room ${roomId} revoked by host`);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
