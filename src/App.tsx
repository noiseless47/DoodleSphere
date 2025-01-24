import React, { useState } from 'react';
import { io } from 'socket.io-client';
import Whiteboard from './components/Whiteboard';
import Chat from './components/Chat';
import Login from './components/Login';

const socket = io('http://localhost:5000');

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');

  const handleJoin = (username: string, roomId: string) => {
    setUsername(username);
    setRoomId(roomId);
    setIsLoggedIn(true);
  };

  if (!isLoggedIn) {
    return <Login onJoin={handleJoin} />;
  }

  return (
    <div className="h-screen flex flex-col">
      <Whiteboard 
        socket={socket} 
        roomId={roomId} 
        username={username}
      />
    </div>
  );
};

export default App;