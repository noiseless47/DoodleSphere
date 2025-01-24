import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Rocket, Users, Save } from "lucide-react";

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
    description: "Connect and work together seamlessly",
    background: "bg-green-50"
  },
  {
    icon: Save,
    title: "Preserve Your Work",
    description: "Save and revisit your creative projects anytime",
    background: "bg-purple-50"
  }
];

const SlideCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

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