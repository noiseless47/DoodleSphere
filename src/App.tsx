import React, { useState, useEffect } from 'react';
import { Socket, io } from 'socket.io-client';
import Whiteboard from './components/Whiteboard';
import Chat from './components/Chat';
import Login from './components/Login';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
console.log('Connecting to backend at:', BACKEND_URL);

const socketOptions = {
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  autoConnect: true,
  forceNew: true,
  timeout: 20000
};

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionError, setConnectionError] = useState<string>('');

  useEffect(() => {
    let newSocket: Socket | null = null;

    const connectToServer = async () => {
      try {
        console.log('Attempting health check at:', `${BACKEND_URL}/health`);
        
        // First check if backend is available
        const healthCheck = await fetch(`${BACKEND_URL}/health`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        if (!healthCheck.ok) {
          throw new Error(`Health check failed with status: ${healthCheck.status}`);
        }

        const healthData = await healthCheck.json();
        console.log('Health check response:', healthData);

        if (healthData.status === 'ok') {
          newSocket = io(BACKEND_URL, socketOptions);

          newSocket.on('connect', () => {
            console.log('Socket connected successfully with ID:', newSocket?.id);
            setConnectionError('');
            setSocket(newSocket);
          });

          newSocket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            setConnectionError(`Connection error: ${error.message}`);
          });

          newSocket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            if (reason === 'io server disconnect') {
              // Server disconnected, try to reconnect
              newSocket?.connect();
            }
          });
        } else {
          throw new Error('Backend health check returned not ok');
        }
      } catch (error) {
        console.error('Server connection error:', error);
        setConnectionError(`Unable to connect to server: ${error.message}`);
      }
    };

    connectToServer();

    return () => {
      if (newSocket) {
        console.log('Cleaning up socket connection');
        newSocket.close();
      }
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
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 mb-2">Connecting to server...</p>
          {connectionError && (
            <div className="text-red-500 mt-4 p-4 bg-red-50 rounded">
              <p className="font-semibold">Connection Error:</p>
              <p>{connectionError}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Retry Connection
              </button>
            </div>
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