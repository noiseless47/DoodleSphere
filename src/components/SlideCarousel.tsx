import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Rocket, Users, Save, Pencil, Shapes, 
  Image, MessageCircle, Download, Share2,
  History, Lock, Palette, Layout, 
  Layers, Eraser, FileText, Settings 
} from "lucide-react";

const slides = [
  {
    icon: Rocket,
    title: "Create Your Room",
    description: "Instantly generate a unique space for collaboration",
    background: "bg-blue-50"
  },
  {
    icon: Users,
    title: "Real-Time Collaboration",
    description: "Connect and work together seamlessly with team members",
    background: "bg-green-50"
  },
  {
    icon: Lock,
    title: "Secure Rooms",
    description: "Private and secure spaces for your team collaboration",
    background: "bg-slate-50"
  },
  {
    icon: Pencil,
    title: "Advanced Drawing Tools",
    description: "Multiple pen types, highlighters, and custom brushes",
    background: "bg-yellow-50"
  },
  {
    icon: Shapes,
    title: "Rich Shape Library",
    description: "Over 25 customizable shapes and elements",
    background: "bg-orange-50"
  },
  {
    icon: Palette,
    title: "Color Palettes",
    description: "Choose from preset palettes or create custom colors",
    background: "bg-rose-50"
  },
  {
    icon: Image,
    title: "Media Integration",
    description: "Import images and create media-rich whiteboards",
    background: "bg-red-50"
  },
  {
    icon: MessageCircle,
    title: "Built-in Chat",
    description: "Real-time communication with team members",
    background: "bg-indigo-50"
  },
  {
    icon: History,
    title: "Version History",
    description: "Track changes and restore previous versions",
    background: "bg-cyan-50"
  },
  {
    icon: Layout,
    title: "Multiple Boards",
    description: "Create and manage multiple whiteboards in one room",
    background: "bg-emerald-50"
  },
  {
    icon: Share2,
    title: "Easy Sharing",
    description: "Share your work with a simple link or invite",
    background: "bg-pink-50"
  },
  {
    icon: Layers,
    title: "Layer Management",
    description: "Organize your work with multiple layers",
    background: "bg-violet-50"
  },
  {
    icon: Eraser,
    title: "Smart Eraser",
    description: "Intelligent erasing tools for precise corrections",
    background: "bg-amber-50"
  },
  {
    icon: Download,
    title: "Export Options",
    description: "Download your work in various formats (PNG, JPG, PDF)",
    background: "bg-teal-50"
  },
  {
    icon: FileText,
    title: "Templates",
    description: "Start quickly with pre-made templates",
    background: "bg-lime-50"
  },
  {
    icon: Settings,
    title: "Customizable",
    description: "Personalize your workspace and tools",
    background: "bg-fuchsia-50"
  },
  {
    icon: Save,
    title: "Auto-Save",
    description: "Never lose your work with automatic saving",
    background: "bg-purple-50"
  }
];

const SlideCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const SLIDE_DURATION = 5000; // 5 seconds between auto-slides

  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, SLIDE_DURATION);

    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="relative h-full w-full flex items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        {slides.map((slide, index) => (
          index === currentSlide && (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.5 }}
              className={`absolute inset-0 flex items-center justify-center ${slide.background} p-8`}
            >
              <div className="text-center max-w-md">
                <slide.icon 
                  className="mx-auto mb-6 text-blue-600" 
                  size={64} 
                  strokeWidth={1.5} 
                />
                <h2 className="text-3xl font-bold text-gray-800 mb-4">
                  {slide.title}
                </h2>
                <p className="text-gray-600 text-lg mb-6">
                  {slide.description}
                </p>
              </div>
            </motion.div>
          )
        ))}
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="absolute bottom-6 flex space-x-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`h-2 w-2 rounded-full transition-all ${
              index === currentSlide 
                ? 'bg-blue-600 w-6' 
                : 'bg-gray-300 hover:bg-gray-400'
            }`}
          />
        ))}
      </div>

      {/* Side Navigation */}
      <button 
        onClick={prevSlide} 
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/50 hover:bg-white/75 p-2 rounded-full shadow-md"
      >
        ←
      </button>
      <button 
        onClick={nextSlide} 
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/50 hover:bg-white/75 p-2 rounded-full shadow-md"
      >
        →
      </button>
    </div>
  );
};

export default SlideCarousel;