import { Sun, Moon, Check, X } from 'lucide-react';

interface ToggleProps {
  enabled: boolean;
  onChange: () => void;
  variant?: 'default' | 'darkMode' | 'grid' | 'snap' | 'autoSave';
}

const Toggle: React.FC<ToggleProps> = ({ enabled, onChange, variant = 'default' }) => {
  // Color schemes for different toggles
  const colors = {
    darkMode: {
      on: 'bg-blue-500',
      off: 'bg-gray-200',
      icon: enabled ? 'bg-gray-900' : 'bg-yellow-400'
    },
    grid: {
      on: 'bg-green-500',
      off: 'bg-red-500',
      icon: enabled ? 'bg-white' : 'bg-white'
    },
    snap: {
      on: 'bg-green-500',
      off: 'bg-red-500',
      icon: enabled ? 'bg-white' : 'bg-white'
    },
    autoSave: {
      on: 'bg-green-500',
      off: 'bg-red-500',
      icon: enabled ? 'bg-white' : 'bg-white'
    },
    default: {
      on: 'bg-green-500',
      off: 'bg-red-500',
      icon: 'bg-white'
    }
  };

  if (variant === 'darkMode') {
    return (
      <button
        type="button"
        onClick={onChange}
        className={`
          w-14 h-7 rounded-full p-1 relative
          ${enabled ? colors[variant].on : colors[variant].off}
          transition-colors duration-200
        `}
      >
        <span className="sr-only">Toggle dark mode</span>
        <div
          className={`
            w-5 h-5 rounded-full 
            ${colors[variant].icon}
            ${enabled ? 'translate-x-7' : 'translate-x-0'}
            transition-all duration-200 transform
            flex items-center justify-center
          `}
        >
          {enabled ? (
            <Moon size={12} className="text-white" />
          ) : (
            <Sun size={12} className="text-yellow-600" />
          )}
        </div>
      </button>
    );
  }

  // For grid, snap, and autoSave variants
  if (['grid', 'snap', 'autoSave'].includes(variant)) {
    return (
      <button
        type="button"
        onClick={onChange}
        className={`
          w-14 h-7 rounded-full p-1 relative
          ${enabled ? colors[variant].on : colors[variant].off}
          transition-colors duration-200
        `}
      >
        <span className="sr-only">Toggle setting</span>
        <div
          className={`
            w-5 h-5 rounded-full 
            ${colors[variant].icon}
            ${enabled ? 'translate-x-7' : 'translate-x-0'}
            transition-all duration-200 transform
            flex items-center justify-center
            shadow-sm
          `}
        >
          {enabled ? (
            <Check size={12} className="text-green-500" />
          ) : (
            <X size={12} className="text-red-600" />
          )}
        </div>
      </button>
    );
  }

  // Default toggle
  return (
    <button
      type="button"
      onClick={onChange}
      className={`
        w-11 h-6 rounded-full relative
        ${enabled ? colors.default.on : colors.default.off}
        transition-colors duration-200
      `}
    >
      <span className="sr-only">Toggle setting</span>
      <div
        className={`
          absolute top-1 left-1
          w-4 h-4 rounded-full
          ${colors.default.icon}
          transform transition-transform duration-200
          ${enabled ? 'translate-x-5' : 'translate-x-0'}
          flex items-center justify-center
        `}
      >
        {enabled ? (
          <Check size={8} className="text-green-500" />
        ) : (
          <X size={8} className="text-red-600" />
        )}
      </div>
    </button>
  );
};

export default Toggle; 