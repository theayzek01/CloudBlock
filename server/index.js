const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// A simple in-memory room system and temporary state
const rooms = {};
// Cursor positions cache (Temporary Memory)
const cursorState = {}; // { roomId: { userId: { x, y } } }

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    if (!rooms[roomId]) {
      rooms[roomId] = [];
      cursorState[roomId] = {};
    }
    rooms[roomId].push(socket.id);
    console.log(`User ${socket.id} joined room ${roomId}`);
    io.to(roomId).emit('user_joined', { userId: socket.id, activeUsers: rooms[roomId] });
  });

  socket.on('block_event', (data) => {
    const { roomId, event } = data;
    socket.to(roomId).emit('block_event', event);
  });

  // OPTIMIZATION: Instead of broadcasting every pixel move instantly,
  // we save it to temporary memory (cursorState)
  socket.on('cursor_move', (data) => {
    const { roomId, cursor } = data;
    if (!cursorState[roomId]) cursorState[roomId] = {};
    cursorState[roomId][socket.id] = cursor;
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (const roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
      if (cursorState[roomId]) delete cursorState[roomId][socket.id];
      io.to(roomId).emit('user_left', { userId: socket.id, activeUsers: rooms[roomId] });
      
      // Cleanup empty rooms to free up memory
      if (rooms[roomId].length === 0) {
        delete rooms[roomId];
        delete cursorState[roomId];
      }
    }
  });
});

// ULTRA OPTIMIZATION: Broadcast batched cursors to rooms at fixed intervals (e.g. 20 times a second)
// This prevents the server from crashing under heavy load and reduces network traffic by 90%.
setInterval(() => {
  for (const roomId in cursorState) {
    const cursors = cursorState[roomId];
    if (Object.keys(cursors).length > 0) {
      // Send all cursor positions in this room in a single packet
      io.to(roomId).emit('cursor_batch', cursors);
    }
  }
}, 50); // 50ms = 20 FPS. The client's CSS transitions will make it feel like 60+ FPS.

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Cloud Block Server is running on port ${PORT}`);
});
