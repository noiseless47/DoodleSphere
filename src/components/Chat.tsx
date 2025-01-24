import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';

interface ChatProps {
  socket: Socket;
  roomId: string;
  username: string;
}

interface ChatMessage {
  message: string;
  userId: string;
  username: string;
  timestamp: string;
}

const Chat: React.FC<ChatProps> = ({ socket, roomId, username }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatStorageKey = `chat_messages_${roomId}`;

  useEffect(() => {
    // Load existing messages from localStorage
    const storedMessages = localStorage.getItem(chatStorageKey);
    if (storedMessages) {
      setMessages(JSON.parse(storedMessages));
    }

    socket.on('chat-message', (data: ChatMessage) => {
      setMessages(prev => {
        const newMessages = [...prev, data];
        localStorage.setItem(chatStorageKey, JSON.stringify(newMessages));
        return newMessages;
      });
    });

    return () => {
      socket.off('chat-message');
    };
  }, [socket, chatStorageKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      const messageData = {
        roomId,
        message: newMessage,
        username
      };
      socket.emit('chat-message', messageData);
      
      const newMsg = {
        message: newMessage,
        userId: 'me',
        username: username,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setMessages(prev => {
        const newMessages = [...prev, newMsg];
        localStorage.setItem(chatStorageKey, JSON.stringify(newMessages));
        return newMessages;
      });
      
      setNewMessage('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 bg-blue-500 text-white rounded-t-lg">
        <h3 className="font-medium">Chat</h3>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`mb-3 ${
              msg.userId === 'me' ? 'flex flex-col items-end' : 'flex flex-col items-start'
            }`}
          >
            <div className="text-xs text-gray-500 mb-1">
              {msg.username} • {msg.timestamp}
            </div>
            <div
              className={`rounded-lg px-3 py-2 max-w-[80%] ${
                msg.userId === 'me'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {msg.message}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-3 border-t">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="w-full border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </form>
    </div>
  );
};

export default Chat;