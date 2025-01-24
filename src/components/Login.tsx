import React, { useState } from "react";
import SlideCarousel from "./SlideCarousel"; // Import the new carousel component

interface LoginProps {
  onJoin: (username: string, roomId: string) => void;
}

const Login: React.FC<LoginProps> = ({ onJoin }) => {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");

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
      <div className="w-1/3 flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 bg-white rounded-xl shadow-lg p-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Join DoodleSphere</h2>
            <p className="mt-2 text-gray-600">Enter your details to get started</p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your username"
                />
              </div>
              <div>
                <label htmlFor="room" className="block text-sm font-medium text-gray-700">
                  Room ID
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    id="room"
                    type="text"
                    required
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter room ID"
                  />
                  <button
                    type="button"
                    onClick={generateRoom}
                    className="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Generate
                  </button>
                </div>
              </div>
            </div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Join Room
            </button>
          </form>
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