const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const httpServer = createServer(app);

// Add basic request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// CORS configuration
app.use(cors({
  origin: '*', // Allow all origins temporarily for testing
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'DoodleSphere Backend API',
    status: 'running'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://doodlesphere-10rmre238-noiseless47s-projects.vercel.app']
      : ['http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Store rooms data
const rooms = new Map();

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

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
    console.log('User disconnected:', socket.id);
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

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});