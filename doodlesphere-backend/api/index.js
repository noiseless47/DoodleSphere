const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://doodlesphere.vercel.app',
    'https://doodlesphere-10rmre238-noiseless47s-projects.vercel.app'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'DoodleSphere Backend',
    status: 'running',
    time: new Date().toISOString()
  });
});

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:5173',
      'https://doodlesphere.vercel.app',
      'https://doodlesphere-10rmre238-noiseless47s-projects.vercel.app'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Store rooms data
const rooms = new Map();

// Socket event handlers
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Add username to socket when user joins
  socket.on('join-room', ({ roomId, username }) => {  // Update to receive username
    console.log(`User ${username} joining room ${roomId}`);
    socket.join(roomId);
    socket.username = username;  // Store username in socket
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        users: new Map(),
        drawings: [],
        history: [],
        redoStack: [],
        messages: []  // Add messages array
      });
    }
    
    const room = rooms.get(roomId);
    room.users.set(socket.id, { 
      id: socket.id,
      username: username  // Use provided username
    });
    
    // Send existing state to new user
    socket.emit('initial-state', {
      drawings: room.drawings,
      history: room.history,
      redoStack: room.redoStack,
      messages: room.messages  // Send existing messages
    });
  });

  // Handle chat messages
  socket.on('chat-message', (data) => {
    console.log('Chat message received:', data);
    const room = rooms.get(data.roomId);
    if (room) {
      const messageData = {
        ...data,
        userId: socket.id,
        username: socket.username,
        timestamp: new Date().toISOString()
      };
      
      // Store message in room history
      room.messages.push(messageData);
      
      // Broadcast to all users in the room (including sender)
      io.to(data.roomId).emit('chat-message', messageData);
    }
  });

  // Handle typing events
  socket.on('typing', ({ roomId, isTyping }) => {
    socket.to(roomId).emit('user-typing', {
      username: socket.username,
      isTyping
    });
  });

  // Handle drawing events
  socket.on('draw', (data) => {
    console.log('Draw event received:', data.tool); // Add logging
    const room = rooms.get(data.roomId);
    if (room) {
      // Add to room history
      room.drawings.push(data);
      room.history.push({ type: 'draw', data });
      
      // Broadcast to all other users in the room
      socket.broadcast.to(data.roomId).emit('draw', data);
    }
  });

  socket.on('undo', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && room.history.length > 0) {
      const lastAction = room.history.pop();
      room.redoStack.push(lastAction);

      room.drawings = room.history
        .filter(entry => entry.type === 'draw')
        .map(entry => entry.data);

      // Broadcast to all users in the room
      io.to(roomId).emit('undo', {
        drawings: room.drawings,
        history: room.history,
        redoStack: room.redoStack
      });
    }
  });

  socket.on('redo', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && room.redoStack.length > 0) {
      const action = room.redoStack.pop();
      room.history.push(action);

      if (action.type === 'draw') {
        room.drawings.push(action.data);
      }

      // Broadcast to all users in the room
      io.to(roomId).emit('redo', {
        drawings: room.drawings,
        history: room.history,
        redoStack: room.redoStack
      });
    }
  });

  socket.on('clear-board', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.drawings = [];
      room.history = [{ type: 'clear' }];
      room.redoStack = [];
      
      // Broadcast to all users in the room
      io.to(roomId).emit('clear-board');
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    rooms.forEach((room, roomId) => {
      if (room.users.has(socket.id)) {
        room.users.delete(socket.id);
        if (room.users.size === 0) {
          rooms.delete(roomId);
        } else {
          socket.to(roomId).emit('user-left', socket.id);
        }
      }
    });
  });
});

// Start server
const PORT = parseInt(process.env.PORT || '10000');
console.log('Starting server on port:', PORT);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  console.log('Environment:', process.env.NODE_ENV);
});

// Export for serverless
module.exports = httpServer; 