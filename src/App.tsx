import React, { useState, useEffect } from 'react';
import { Socket, io } from 'socket.io-client';
import Whiteboard from './components/Whiteboard';
import Chat from './components/Chat';
import Login from './components/Login';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
console.log('Connecting to backend at:', BACKEND_URL);

const socketOptions = {
  transports: ['websocket'],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  autoConnect: true,
  forceNew: true
};

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionError, setConnectionError] = useState<string>('');

  useEffect(() => {
    console.log('Attempting to connect to:', BACKEND_URL);
    
    // First verify the backend is running
    fetch(`${BACKEND_URL}/health`)
      .then(res => res.json())
      .then(data => {
        console.log('Backend health check:', data);
        if (data.status === 'ok') {
          initializeSocket();
        }
      })
      .catch(error => {
        console.error('Backend health check failed:', error);
        setConnectionError('Failed to connect to server: Backend not responding');
      });

    const initializeSocket = () => {
      const newSocket = io(BACKEND_URL, socketOptions);
      
      newSocket.on('connect', () => {
        console.log('Socket connected successfully');
        setConnectionError('');
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error details:', error);
        setConnectionError(`Failed to connect to server: ${error.message}`);
      });

      newSocket.on('error', (error) => {
        console.error('Socket general error:', error);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
      });

      setSocket(newSocket);

      return () => {
        console.log('Cleaning up socket connection');
        newSocket.close();
      };
    };
  }, []);

  const handleJoin = (username: string, roomId: string) => {
    console.log('Joining room:', roomId, 'as:', username);
    setUsername(username);
    setRoomId(roomId);
    setIsLoggedIn(true);
  };

  if (!socket) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Connecting to server...</p>
          {connectionError && (
            <p className="text-red-500 mt-2">{connectionError}</p>
          )}
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Login onJoin={handleJoin} />;
  }

  return (
    <div className="h-screen w-screen bg-gray-100">
      <Whiteboard 
        socket={socket} 
        roomId={roomId} 
        username={username}
      />
    </div>
  );
};

export default App;