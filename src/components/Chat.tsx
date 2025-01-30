import React, { useState, useEffect, useRef } from 'react';
import { io as socketIO } from 'socket.io-client';
import { Send, X, Image, Smile, Paperclip, ChevronDown } from 'lucide-react';
import { Socket } from 'socket.io-client';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface ChatProps {
  socket: Socket;
  roomId: string;
  username: string;
  onClose: () => void;
}

interface ChatMessage {
  message: string;
  userId: string;
  username: string;
  timestamp: string;
  senderId: string;
  type?: 'text' | 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
  fileData?: string;
}

type FileMessageType = {
  type: 'file' | 'image';
  fileUrl: string;
  fileName: string;
  message: string;
};

const Chat: React.FC<ChatProps> = ({ socket, roomId, username, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatStorageKey = `chat_messages_${roomId}`;
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const storedMessages = localStorage.getItem(chatStorageKey);
    if (storedMessages) {
      try {
        const parsedMessages = JSON.parse(storedMessages);
        const updatedMessages = parsedMessages.map((msg: ChatMessage) => ({
          ...msg,
          senderId: msg.userId === socket.id ? socket.id : msg.userId
        }));
        setMessages(updatedMessages);
      } catch (e) {
        console.error('Error parsing stored messages:', e);
      }
    }

    socket.on('chat-message', (data: ChatMessage) => {
      setMessages(prev => {
        const newMessage = {
          ...data,
          senderId: data.userId === socket.id ? socket.id : data.userId,
          fileData: data.fileData || data.fileUrl,
          fileUrl: data.fileData || data.fileUrl
        };

        const newMessages = [...prev, newMessage];

        try {
          const storageMessages = newMessages.map(msg => ({
            ...msg,
            fileData: undefined,
            fileUrl: msg.type === 'text' ? undefined : msg.fileUrl,
            senderId: msg.userId === socket.id ? socket.id : msg.userId
          }));
          localStorage.setItem(chatStorageKey, JSON.stringify(storageMessages));
        } catch (e) {
          console.warn('Failed to store in localStorage:', e);
        }

        return newMessages;
      });

      if (data.userId !== socket.id) {
        playNotificationSound();
      }
    });

    socket.on('user-typing', ({ username: typingUsername, isTyping }) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (isTyping) {
          newSet.add(typingUsername);
        } else {
          newSet.delete(typingUsername);
        }
        return newSet;
      });
    });

    return () => {
      socket.off('chat-message');
      socket.off('user-typing');
    };
  }, [socket, chatStorageKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const playNotificationSound = () => {
    const audio = new Audio('/notification.mp3'); // Add a notification sound file to your public folder
    audio.play().catch(err => console.log('Audio play failed:', err));
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', { roomId, username, isTyping: true });
      setTimeout(() => {
        setIsTyping(false);
        socket.emit('typing', { roomId, username, isTyping: false });
      }, 2000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (e.g., 10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size too large. Maximum size is 10MB');
      return;
    }

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }

    setSelectedFile(file);
  };

  const handleEmojiSelect = (emoji: any) => {
    setNewMessage(prev => prev + emoji.native);
    setShowEmojiPicker(false);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedFile && !isUploading) {
      try {
        setIsUploading(true);
        
        const readFileAsDataURL = (file: File): Promise<string> => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
          });
        };

        const base64Data = await readFileAsDataURL(selectedFile);
        const isImage = selectedFile.type.startsWith('image/');
        
        const messageData = {
          roomId,
          message: selectedFile.name,
          username,
          userId: socket.id,
          senderId: socket.id,
          timestamp: new Date().toLocaleTimeString(),
          type: isImage ? 'image' : 'file',
          fileUrl: base64Data,
          fileName: selectedFile.name,
          fileData: base64Data
        };

        socket.emit('chat-message', messageData);

        // Clear file states
        setSelectedFile(null);
        setFilePreview('');
        setNewMessage('');
      } catch (error) {
        console.error('Error uploading file:', error);
        alert('Failed to send file. Please try again.');
      } finally {
        setIsUploading(false);
      }
    } else if (newMessage.trim() && !isUploading) {
      const messageData = {
        roomId,
        message: newMessage.trim(),
        username,
        userId: socket.id,
        senderId: socket.id,
        timestamp: new Date().toLocaleTimeString(),
        type: 'text'
      };

      socket.emit('chat-message', messageData);
      setNewMessage('');
    }
  };

  const formatTime = (timestamp: string) => {
    // If timestamp is already in HH:MM format, return it as is
    if (timestamp.includes(':')) return timestamp;
    
    try {
      return new Date(timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (e) {
      return timestamp; // Fallback to original timestamp if parsing fails
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 rounded-lg shadow-xl text-gray-100">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-700 bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-lg">
        <div>
          <h3 className="font-bold text-lg">Chat Room</h3>
          <div className="flex items-center gap-2">
            <p className="text-sm text-blue-100">Room ID: {roomId}</p>
            <button
              onClick={() => navigator.clipboard.writeText(roomId)}
              className="text-xs px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 rounded-full transition-colors"
            >
              Copy
            </button>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-blue-600/50 rounded-full transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-4 overflow-y-auto bg-zinc-800/50 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${
              msg.senderId === socket.id ? 'items-end' : 'items-start'
            }`}
          >
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-xs font-medium text-zinc-400">{msg.username}</span>
              <span className="text-xs text-zinc-500">{formatTime(msg.timestamp)}</span>
            </div>

            {msg.type === 'image' && (msg.fileUrl || msg.fileData) ? (
              <div className="max-w-[240px] rounded-lg overflow-hidden shadow-lg">
                <img 
                  src={msg.fileData || msg.fileUrl}
                  alt={msg.fileName || 'Image'} 
                  className="w-full h-auto"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/fallback-image.png';
                  }}
                />
              </div>
            ) : msg.type === 'file' && (msg.fileUrl || msg.fileData) ? (
              <a 
                href={msg.fileData || msg.fileUrl}
                download={msg.fileName}
                className="flex items-center gap-2 p-3 bg-zinc-700/50 hover:bg-zinc-700 rounded-lg transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Paperclip size={16} className="text-blue-400" />
                <span className="text-sm text-blue-400 hover:underline">
                  {msg.fileName || 'Download File'}
                </span>
              </a>
            ) : (
              <div
                className={`rounded-lg px-4 py-2 max-w-[80%] ${
                  msg.senderId === socket.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-700/50 text-gray-100'
                }`}
              >
                {msg.message}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
        
        {/* Typing Indicator */}
        {typingUsers.size > 0 && (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <div className="flex gap-1">
              <span className="animate-bounce">•</span>
              <span className="animate-bounce delay-100">•</span>
              <span className="animate-bounce delay-200">•</span>
            </div>
            {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
          </div>
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={sendMessage} className="p-4 border-t border-zinc-700 bg-zinc-800/50 rounded-b-lg">
        <div className="space-y-3">
          {/* File Preview */}
          {selectedFile && (
            <div className="flex items-center gap-2 px-3 py-2 bg-zinc-700/50 rounded-lg">
              <Paperclip size={16} className="text-zinc-400" />
              <span className="text-sm text-zinc-300 truncate">{selectedFile.name}</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setFilePreview('');
                }}
                className="ml-auto text-zinc-400 hover:text-red-400"
              >
                <X size={16} />
              </button>
            </div>
          )}
          
          {/* Image Preview */}
          {filePreview && (
            <div className="max-w-[200px] rounded-lg overflow-hidden">
              <img src={filePreview} alt="Preview" className="w-full h-auto" />
            </div>
          )}

          {/* Input Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={newMessage}
                onChange={handleTyping}
                placeholder={selectedFile ? 'Press Enter to send file...' : 'Type a message...'}
                className="w-full px-4 py-2 bg-zinc-700/50 border border-zinc-600 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100 placeholder-zinc-500"
              />
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 rounded-full transition-colors"
                title="Attach file"
              >
                <Paperclip size={20} />
              </button>
              
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 rounded-full transition-colors"
                  title="Add emoji"
                >
                  <Smile size={20} />
                </button>
                
                {showEmojiPicker && (
                  <div className="absolute bottom-full right-0 mb-2">
                    <Picker 
                      data={data} 
                      onEmojiSelect={handleEmojiSelect}
                      theme="dark"
                      previewPosition="none"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isUploading}
                className={`p-2 rounded-full transition-colors ${
                  isUploading 
                    ? 'bg-zinc-600 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                title={isUploading ? 'Uploading...' : 'Send message'}
              >
                {isUploading ? (
                  <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send size={20} />
                )}
              </button>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx"
        />
      </form>
    </div>
  );
};

export default Chat;