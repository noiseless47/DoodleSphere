import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Whiteboard from './components/Whiteboard';
import Chat from './components/Chat';
import Login from './components/Login';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [socket, setSocket] = useState<any>(null);

  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    
    newSocket.on('connect', () => {
      console.log('Socket connected');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const handleJoin = (username: string, roomId: string) => {
    console.log('Joining room:', roomId, 'as:', username);
    setUsername(username);
    setRoomId(roomId);
    setIsLoggedIn(true);
  };

  if (!socket) {
    return <div>Connecting...</div>;
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