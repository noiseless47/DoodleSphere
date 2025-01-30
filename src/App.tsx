import React, { useState, useEffect } from 'react';
import { Socket, io } from 'socket.io-client';
import Whiteboard from './components/Whiteboard';
import Chat from './components/Chat';
import Login from './components/Login';

const BACKEND_URL = import.meta.env.VITE_API_URL;
console.log('Backend URL:', BACKEND_URL); // Add this for debugging

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionError, setConnectionError] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(true);

  useEffect(() => {
    const connectToServer = async () => {
      try {
        console.log('Attempting to connect to backend...');
        
        // First check if backend is available
        const healthResponse = await fetch(`${BACKEND_URL}/health`);
        console.log('Health check status:', healthResponse.status);
        
        if (!healthResponse.ok) {
          throw new Error(`Health check failed: ${healthResponse.status}`);
        }

        const healthData = await healthResponse.json();
        console.log('Health check response:', healthData);

        if (healthData.status === 'ok') {
          console.log('Creating socket connection...');
          const newSocket = io(BACKEND_URL, {
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 20000
          });

          newSocket.on('connect', () => {
            console.log('Socket connected successfully:', newSocket.id);
            setSocket(newSocket);
            setConnectionError('');
            setIsConnecting(false);
          });

          newSocket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            setConnectionError(`Connection failed: ${error.message}`);
            setIsConnecting(false);
          });

          newSocket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            if (reason === 'io server disconnect') {
              newSocket.connect();
            }
          });
        }
      } catch (error) {
        console.error('Connection error:', error);
        setConnectionError(error instanceof Error ? error.message : 'Failed to connect to server');
        setIsConnecting(false);
      }
    };

    connectToServer();
  }, []);

  const handleJoin = (username: string, roomId: string) => {
    console.log('Joining room:', roomId, 'as:', username);
    setUsername(username);
    setRoomId(roomId);
    setIsLoggedIn(true);
  };

  if (isConnecting || !socket) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 mb-2">
            {isConnecting ? 'Connecting to server...' : 'Waiting for connection...'}
          </p>
          {connectionError && (
            <div className="text-red-500 mt-4 p-4 bg-red-50 rounded">
              <p className="font-semibold">Connection Error:</p>
              <p className="mb-2">{connectionError}</p>
              <p className="text-sm text-gray-600 mb-4">Backend URL: {BACKEND_URL}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
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