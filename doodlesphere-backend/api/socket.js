const { Server } = require('socket.io');
const { createServer } = require('http');

const rooms = new Map();

const ioHandler = (req, res) => {
  console.log('Socket handler called, method:', req.method);
  
  if (!res.socket.server.io) {
    console.log('Initializing Socket.IO server');
    
    // Create HTTP server if it doesn't exist
    if (!res.socket.server.httpServer) {
      res.socket.server.httpServer = createServer();
    }

    const io = new Server(res.socket.server.httpServer, {
      path: '/socket.io',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST', 'OPTIONS'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization']
      },
      maxHttpBufferSize: 1e8,
      pingTimeout: 60000,
      transports: ['websocket', 'polling'],
      allowEIO3: true // Enable Socket.IO v3 compatibility
    });

    io.on('connection', (socket) => {
      console.log('New client connected:', socket.id);
      
      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      // Handle joining a room
      socket.on('join-room', (roomId) => {
        socket.join(roomId);
        
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

      socket.on('clear-board', ({ roomId }) => {
        const room = rooms.get(roomId);
        if (room) {
          room.drawings = [];
          room.history = [{ type: 'clear' }];
          io.to(roomId).emit('clear-board');
        }
      });

      socket.on('chat-message', (data) => {
        const messageData = {
          ...data,
          userId: socket.id,
          senderId: data.senderId || socket.id,
          timestamp: new Date().toLocaleTimeString()
        };
        
        io.to(data.roomId).emit('chat-message', messageData);
      });

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
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

    res.socket.server.io = io;
    console.log('Socket.IO server initialized successfully');
  }

  // Handle WebSocket upgrade
  if (req.headers.upgrade === 'websocket') {
    res.socket.server.httpServer.emit('upgrade', req, req.socket, req.head);
    return;
  }

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(200).end();
    return;
  }

  res.end();
};

const handler = (req, res) => {
  console.log('Request received:', req.method, req.url);
  
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(200).end();
    return;
  }

  try {
    if (req.method === "POST" || req.headers.upgrade === 'websocket') {
      ioHandler(req, res);
    } else if (req.method === "GET") {
      res.status(200).json({ 
        message: 'Socket server is running',
        timestamp: new Date().toISOString(),
        socketPath: '/socket.io'
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

module.exports = handler; 