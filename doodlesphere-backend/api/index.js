const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString()
  });
});

// Socket.IO setup
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
  
  // Your existing socket handlers...
});

// Export the handler for serverless
module.exports = (req, res) => {
  if (!res.socket.server.io) {
    console.log('Setting up Socket.IO');
    res.socket.server.io = io;
  }

  if (req.url === '/health') {
    return app._router.handle(req, res);
  }

  res.socket.server.io.handler(req, res);
}; 