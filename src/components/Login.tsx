import React, { useState } from "react";
import SlideCarousel from "./SlideCarousel"; // Import the new carousel component
import SocialButtons from './SocialButtons';

interface LoginProps {
  onJoin: (username: string, roomId: string) => void;
  initialRoomId?: string;
}

const Login: React.FC<LoginProps> = ({ onJoin, initialRoomId = '' }) => {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState(initialRoomId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && roomId.trim()) {
      onJoin(username.trim(), roomId.trim());
    }
  };

  const generateRoom = () => {
    const randomRoom = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomId(randomRoom);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: Login Form */}
      <div className="w-1/3 flex flex-col items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Join DoodleSphere</h2>
            <p className="mt-2 text-gray-500">Enter your details to get started</p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-5">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full px-4 py-3 text-gray-700 bg-gray-50 border border-gray-200 rounded-xl 
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all
                    placeholder:text-gray-400"
                  placeholder="Enter your username"
                />
              </div>
              <div>
                <label htmlFor="room" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Room ID
                </label>
                <div className="relative">
                  <input
                    id="room"
                    type="text"
                    required
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="block w-full px-4 py-3 text-gray-700 bg-gray-50 border border-gray-200 
                      rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white 
                      transition-all placeholder:text-gray-400 pr-24"
                    placeholder="Enter room ID"
                  />
                  <button
                    type="button"
                    onClick={generateRoom}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5
                      text-sm font-medium text-gray-700 bg-gray-100 rounded-lg
                      hover:bg-gray-200 hover:text-gray-900 transition-colors
                      focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Generate
                  </button>
                </div>
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-medium
                hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 
                focus:ring-offset-2 transition-colors"
            >
              Join Room
            </button>
          </form>
        </div>
        {/* Attribution and Social Links */}
        <div className="mt-6 text-center">
          <div className="text-sm text-gray-400 mb-4">
            Crafted with ♥️ by{' '}
            <a 
              href="https://linkedin.com/in/asishkumaryeleti/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-gray-600 transition-colors"
            >
              noiseless47
            </a>
          </div>
          <SocialButtons />
        </div>
      </div>

      {/* Right: Slideshow */}
      <div className="w-2/3 bg-gray-100">
        <SlideCarousel />
      </div>
    </div>
  );
};

export default Login;