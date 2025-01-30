const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const httpServer = createServer(app);

// Basic middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString()
  });
});

// Socket setup
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Store rooms data
const rooms = new Map();

// Socket event handlers
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Handle joining a room
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    
    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        users: new Map(),
        drawings: [],
        history: [],
        redoStack: []
      });
    }
    
    const room = rooms.get(roomId);
    room.users.set(socket.id, { 
      id: socket.id,
      username: socket.username
    });
    
    // Send existing drawings to new user
    socket.emit('initial-state', {
      drawings: room.drawings,
      history: room.history,
      redoStack: room.redoStack
    });
  });

  // Handle drawing events
  socket.on('draw', (data) => {
    const room = rooms.get(data.roomId);
    if (room) {
      room.drawings.push(data);
      room.history.push({ type: 'draw', data });
      socket.broadcast.to(data.roomId).emit('draw', data);
    }
  });

  socket.on('undo', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && room.history.length > 0) {
      const lastAction = room.history.pop();
      room.redoStack.push(lastAction);

      // Rebuild drawings array from history
      room.drawings = room.history
        .filter(entry => entry.type === 'draw')
        .map(entry => entry.data);

      io.to(roomId).emit('undo', {
        drawings: room.drawings,
        history: room.history,
        redoStack: room.redoStack
      });
    }
  });

  // Update redo handler
  socket.on('redo', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && room.redoStack.length > 0) {
      const action = room.redoStack.pop();
      room.history.push(action);

      if (action.type === 'draw') {
        room.drawings.push(action.data);
      } else if (action.type === 'clear') {
        room.drawings = [];
      }

      io.to(roomId).emit('redo', {
        drawings: room.drawings,
        history: room.history,
        redoStack: room.redoStack
      });
    }
  });

  // Handle clear board event
  socket.on('clear-board', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.drawings = [];
      room.history = [{ type: 'clear' }];
      io.to(roomId).emit('clear-board');  // Changed to io.to to include all clients
    }
  });

  // Handle chat messages
  socket.on('chat-message', (data) => {
    const messageData = {
      ...data,
      userId: socket.id,
      senderId: data.senderId || socket.id,
      timestamp: new Date().toLocaleTimeString()
    };
    
    // Broadcast to all clients including sender
    io.to(data.roomId).emit('chat-message', messageData);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    rooms.forEach((room, roomId) => {
      if (room.users.has(socket.id)) {
        room.users.delete(socket.id);
        if (room.users.size === 0) {
          rooms.delete(roomId);
        } else {
          // Notify others that user has left
          socket.to(roomId).emit('user-left', socket.id);
        }
      }
    });
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

module.exports = httpServer;