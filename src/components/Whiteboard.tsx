import React, { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { 
  X, MessageCircle, Square, Circle, Type, Eraser, 
  ChevronDown, Undo2, Redo2, Trash2, MousePointer,
  Triangle, Star, Hexagon, PenTool, Highlighter, Edit3,
  Move, PaintBucket, Download, Image, ArrowRight, Minus,
  Heart, Zap, Moon, Sun, Plus, Hash, CircleDot, Box, Copy
} from 'lucide-react';
import Chat from './Chat';
import type { Tool, DrawData } from '../types/whiteboard';

interface WhiteboardProps {
  socket: Socket;
  roomId: string;
  username: string;
  defaultColor: string;
}

interface Point {
  x: number;
  y: number;
}

interface StrokeData extends DrawData {
  path: Point[];
}

type HistoryEntry = {
  type: 'draw' | 'clear';
  data?: DrawData | StrokeData;
  previousHistory?: HistoryEntry[];
};

const colorPalettes = {
  primary: [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF'
  ],
  pastel: [
    '#FFB3BA', '#BAFFC9', '#BAE1FF', '#FFFFBA', '#FFB3FF', '#B3FFFF', '#FFC9BA', '#E1BAFF'
  ],
  earth: [
    '#4B371C', '#8B4513', '#CD853F', '#DEB887', '#D2B48C', '#BC8F8F', '#F4A460', '#DAA520'
  ],
  neon: [
    '#FF1493', '#00FFFF', '#FFD700', '#7B68EE', '#FF4500', '#32CD32', '#FF69B4', '#00FA9A'
  ]
};

const penTools = [
  { id: 'pen', icon: PenTool, name: 'Pen', width: 2 },
  { id: 'marker', icon: Edit3, name: 'Marker', width: 5 },
  { id: 'highlighter', icon: Highlighter, name: 'Highlighter', width: 20 },
] as const;

interface Shape {
  id: Tool;
  icon: React.FC<any>;
}

const shapes: Shape[] = [
  { id: 'rectangle', icon: Square },
  { id: 'circle', icon: Circle },
  { id: 'triangle', icon: Triangle },
  { id: 'star', icon: Star },
  { id: 'hexagon', icon: Hexagon },
  { id: 'diamond', icon: Square },
  { id: 'pentagon', icon: Triangle },
  { id: 'octagon', icon: Square },
  { id: 'cross', icon: X },
  { id: 'arrow', icon: ArrowRight },
  { id: 'line', icon: Minus },
  { id: 'hash', icon: Hash },
  { id: 'box', icon: Box },
  { id: 'circleDot', icon: CircleDot },
  { id: 'heart', icon: Heart },
  { id: 'bolt', icon: Zap },
  { id: 'moon', icon: Moon },
  { id: 'sun', icon: Sun },
  { id: 'plus', icon: Plus },
  { id: 'dot', icon: Circle },
  { id: 'ring', icon: Circle },
  { id: 'parallelogram', icon: Square },
  { id: 'trapezoid', icon: Square },
  { id: 'ellipse', icon: Circle },
  { id: 'smallSquare', icon: Square },
] as const;

interface BasicTool {
  id: string;
  icon: React.FC<any>;
  name: string;
  isDropdown?: boolean;
  group?: string;
  action?: () => void;
  disabled?: boolean;
  defaultTool?: string;
}

const basicTools: BasicTool[] = [
  { id: 'select', icon: MousePointer, name: 'Select' },
  { 
    id: 'pen', 
    icon: PenTool, 
    name: 'Drawing Tools', 
    isDropdown: true, 
    group: 'pen', 
    defaultTool: 'pen' 
  },
  { 
    id: 'shapes', 
    icon: Square, 
    name: 'Shapes', 
    isDropdown: true, 
    group: 'shapes', 
    defaultTool: 'rectangle' 
  },
  { id: 'eraser', icon: Eraser, name: 'Eraser' },
  { id: 'text', icon: Type, name: 'Text' },
  { id: 'fill', icon: PaintBucket, name: 'Fill' },
  { id: 'move', icon: Move, name: 'Move' },
  { id: 'image', icon: Image, name: 'Import Image' }
] as const;

// Add these line width presets near your other constants
const lineWidthPresets = [
  { size: 2, label: 'Fine' },
  { size: 4, label: 'Medium' },
  { size: 6, label: 'Thick' },
  { size: 8, label: 'Extra Thick' },
  { size: 12, label: 'Super Thick' },
];

// Add this type near the top of the file
type ToolType = Tool | 'pen' | 'marker' | 'highlighter' | 'eraser' | 'text' | 'fill' | 'move' | 'image' | 'select';

const Whiteboard: React.FC<WhiteboardProps> = ({ socket, roomId, username, defaultColor }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState(defaultColor);
  const [fillColor, setFillColor] = useState('#ffffff');
  const [lineWidth, setLineWidth] = useState(2);
  const [selectedTool, setSelectedTool] = useState<ToolType>('pen');
  const [showChat, setShowChat] = useState(false);
  const [selectedObject, setSelectedObject] = useState<DrawData | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryEntry[]>([]);
  const [showShapesMenu, setShowShapesMenu] = useState(false);
  const [showPenMenu, setShowPenMenu] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [selectedObjects, setSelectedObjects] = useState<DrawData[]>([]);
  const [textPosition, setTextPosition] = useState<{x: number, y: number}>({ x: 0, y: 0 });
  const [textValue, setTextValue] = useState('');
  const [showLineWidthMenu, setShowLineWidthMenu] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [showCopyToast, setShowCopyToast] = useState(false);
  
  const lastX = useRef<number>(0);
  const lastY = useRef<number>(0);
  const shapeStartX = useRef<number>(0);
  const shapeStartY = useRef<number>(0);
  const dragStartX = useRef<number>(0);
  const dragStartY = useRef<number>(0);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const downloadWhiteboard = () => {
    if (canvasRef.current) {
      const dataURL = canvasRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `doodlesphere_${new Date().toISOString().slice(0,10)}.png`;
      link.href = dataURL;
      link.click();
    }
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId)
      .then(() => {
        setShowCopyToast(true);
        setTimeout(() => setShowCopyToast(false), 2000); // Hide after 2 seconds
      })
      .catch(err => {
        console.error('Failed to copy room ID:', err);
      });
  };

  const setCanvasSize = () => {
    const canvas = canvasRef.current;
    const previewCanvas = previewCanvasRef.current;
    const container = containerRef.current;
    
    if (!canvas || !previewCanvas || !container) return;

    // Store the current canvas content
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    if (tempCtx) {
      tempCtx.drawImage(canvas, 0, 0);
    }

    // Get the new dimensions
    const newWidth = container.offsetWidth;
    const newHeight = container.offsetHeight;

    // Calculate scale factors
    const scaleX = newWidth / canvas.width;
    const scaleY = newHeight / canvas.height;

    // Resize both canvases
    canvas.width = newWidth;
    canvas.height = newHeight;
    previewCanvas.width = newWidth;
    previewCanvas.height = newHeight;

    // Get the main canvas context
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Set white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, newWidth, newHeight);

      // Enable smooth scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Scale and restore the content
      ctx.scale(scaleX, scaleY);
      ctx.drawImage(tempCanvas, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transformation
    }
  };

  useEffect(() => {
    const initCanvas = () => {
      const canvas = canvasRef.current;
      const previewCanvas = previewCanvasRef.current;
      const container = containerRef.current;

      if (!canvas || !previewCanvas || !container) return;

      // Initial canvas setup
      setCanvasSize();

      // Debounce the resize handler
      let resizeTimeout: NodeJS.Timeout;
      const handleResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(setCanvasSize, 100);
      };

      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(resizeTimeout);
      };
    };

    initCanvas();
  }, []);

  useEffect(() => {
    socket.emit('join-room', roomId);
    
    socket.on('draw', (data: DrawData | StrokeData) => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;

      if ('path' in data && data.path && data.path.length > 0) {
        // Handle complete pen strokes
        ctx.beginPath();
        ctx.strokeStyle = data.tool === 'eraser' ? '#FFFFFF' : data.color;
        ctx.lineWidth = data.lineWidth;
        
        if (data.tool === 'highlighter') {
          ctx.globalAlpha = 0.3;
        }
        
        ctx.moveTo(data.path[0].x, data.path[0].y);
        data.path.forEach(point => {
          ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
        ctx.globalAlpha = 1.0;
        
        // Add complete strokes to history
        addToHistory({ type: 'draw', data });
      } else {
        // For temporary strokes, just draw them without adding to history
        if ('isTemp' in data && data.isTemp) {
          ctx.beginPath();
          ctx.moveTo(data.startX, data.startY);
          ctx.lineTo(data.endX, data.endY);
          ctx.strokeStyle = data.tool === 'eraser' ? '#FFFFFF' : data.color;
          ctx.lineWidth = data.lineWidth;
          if (data.tool === 'highlighter') {
            ctx.globalAlpha = 0.3;
          }
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        } else {
          // Handle shapes and other non-temporary drawings
          handleRemoteDraw(data);
        }
      }
    });

    socket.on('initial-state', (state: { drawings: DrawData[], history: HistoryEntry[], redoStack: HistoryEntry[] }) => {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        // Clear canvas first
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        // Redraw all history entries in order
        state.history.forEach(entry => {
          if (!entry.data) return;
          
          if ('path' in entry.data && entry.data.path && entry.data.path.length > 0) {
            // Draw pen strokes
            ctx.beginPath();
            ctx.strokeStyle = entry.data.tool === 'eraser' ? '#FFFFFF' : entry.data.color;
            ctx.lineWidth = entry.data.lineWidth;
            
            if (entry.data.tool === 'highlighter') {
              ctx.globalAlpha = 0.3;
            }
            
            ctx.moveTo(entry.data.path[0].x, entry.data.path[0].y);
            entry.data.path.forEach(point => {
              ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
            ctx.globalAlpha = 1.0;
          } else {
            // Draw shapes
            drawShape(ctx, entry.data);
          }
        });

        // Update state
        setHistory(state.history);
        setRedoStack(state.redoStack);
      }
    });

    socket.on('undo', (state: { drawings: DrawData[], history: HistoryEntry[], redoStack: HistoryEntry[] }) => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      // Redraw from history
      state.history.forEach(entry => {
        if (!entry.data) return;
        
        if ('path' in entry.data && entry.data.path && entry.data.path.length > 0) {
          // Draw pen strokes
          ctx.beginPath();
          ctx.strokeStyle = entry.data.tool === 'eraser' ? '#FFFFFF' : entry.data.color;
          ctx.lineWidth = entry.data.lineWidth;
          
          if (entry.data.tool === 'highlighter') {
            ctx.globalAlpha = 0.3;
          }
          
          const path = entry.data.path;
          ctx.moveTo(path[0].x, path[0].y);
          path.forEach(point => {
            ctx.lineTo(point.x, point.y);
          });
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        } else {
          // Draw shapes
          drawShape(ctx, entry.data);
        }
      });

      // Update states
      setHistory(state.history);
      setRedoStack(state.redoStack);
    });

    socket.on('redo', (state: { drawings: DrawData[], history: HistoryEntry[], redoStack: HistoryEntry[] }) => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      state.history.forEach(entry => {
        if (!entry.data) return;
        
        if ('path' in entry.data && entry.data.path && entry.data.path.length > 0) {
          ctx.beginPath();
          ctx.strokeStyle = entry.data.tool === 'eraser' ? '#FFFFFF' : entry.data.color;
          ctx.lineWidth = entry.data.lineWidth;
          
          if (entry.data.tool === 'highlighter') {
            ctx.globalAlpha = 0.3;
          }
          
          const path = entry.data.path;
          ctx.moveTo(path[0].x, path[0].y);
          path.forEach(point => {
            ctx.lineTo(point.x, point.y);
          });
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        } else {
          drawShape(ctx, entry.data);
        }
      });

      setHistory(state.history);
      setRedoStack(state.redoStack);
    });

    socket.on('clear-board', () => {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        setHistory([]);
        setRedoStack([]);
      }
    });

    return () => {
      socket.off('draw');
      socket.off('initial-state');
      socket.off('undo');
      socket.off('redo');
      socket.off('clear-board');
    };
  }, [socket]);

  const handleInitialState = (drawings: DrawData[]) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      drawings.forEach(drawing => drawShape(ctx, drawing));
    }
  };

  const handleRemoteDraw = (data: DrawData) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    if (['pen', 'marker', 'highlighter', 'eraser'].includes(data.tool)) {
      // Draw remote pen stroke
      ctx.beginPath();
      ctx.moveTo(data.startX, data.startY);
      ctx.lineTo(data.endX, data.endY);
      ctx.strokeStyle = data.tool === 'eraser' ? '#FFFFFF' : data.color;
      ctx.lineWidth = data.lineWidth;
      if (data.tool === 'highlighter') {
        ctx.globalAlpha = 0.3;
      }
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      // Add to history only if it's a complete stroke (has path)
      if ('path' in data && data.path && data.path.length > 0) {
        addToHistory({ type: 'draw', data });
      }
    } else {
      drawShape(ctx, data);
      addToHistory({ type: 'draw', data });
    }
  };

  const addToHistory = (entry: HistoryEntry) => {
    if (!entry.data) return;

    // For pen strokes, validate the path
    if ('path' in entry.data) {
      if (!entry.data.path || 
          entry.data.path.length < 2 || 
          (entry.data.path.length === 2 && 
           entry.data.path[0].x === entry.data.path[1].x && 
           entry.data.path[0].y === entry.data.path[1].y)) {
        return;
      }
    }

    setHistory(prev => [...prev, entry]);
    setRedoStack([]); // Clear redo stack when new action is performed
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Clear both history and redo stack completely
    setHistory([]);
    setRedoStack([]);
    
    // Notify server
    socket.emit('clear-board', { roomId });
  };

  const undo = () => {
    if (history.length === 0) return;

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // Remove the last action from history
    const lastEntry = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    
    // Add to redo stack
    setRedoStack(prev => [...prev, lastEntry]);
    setHistory(newHistory);

    // Clear canvas
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Redraw everything from history in one go
    const redrawnDrawings: DrawData[] = [];
    
    // First draw all shapes
    newHistory.forEach(entry => {
      if (!entry.data || ('path' in entry.data && entry.data.path)) return;
      drawShape(ctx, entry.data);
      redrawnDrawings.push(entry.data);
    });

    // Then draw all pen strokes on top
    newHistory.forEach(entry => {
      if (!entry.data || !('path' in entry.data) || !entry.data.path) return;
      
      ctx.beginPath();
      ctx.strokeStyle = entry.data.tool === 'eraser' ? '#FFFFFF' : entry.data.color;
      ctx.lineWidth = entry.data.lineWidth;
      
      if (entry.data.tool === 'highlighter') {
        ctx.globalAlpha = 0.3;
      }
      
      const path = entry.data.path;
      ctx.moveTo(path[0].x, path[0].y);
      path.forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
      ctx.globalAlpha = 1.0;
      redrawnDrawings.push(entry.data);
    });

    // Notify server
    socket.emit('undo', { 
      roomId,
      drawings: redrawnDrawings,
      history: newHistory,
      redoStack: [...redoStack, lastEntry]
    });
  };

  const redo = () => {
    if (redoStack.length === 0) return;

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // Get the last redone entry
    const lastRedoEntry = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);
    const newHistory = [...history, lastRedoEntry];
    
    // Update states
    setHistory(newHistory);
    setRedoStack(newRedoStack);

    // Create a new array to store the drawings as they're redrawn
    const redrawnDrawings: DrawData[] = [];

    // Clear and redraw everything
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Redraw all history including the redone action
    newHistory.forEach(entry => {
      if (!entry.data) return;

      if ('path' in entry.data && entry.data.path && entry.data.path.length > 0) {
        // Draw pen stroke
        ctx.beginPath();
        ctx.strokeStyle = entry.data.tool === 'eraser' ? '#FFFFFF' : entry.data.color;
        ctx.lineWidth = entry.data.lineWidth;
        
        if (entry.data.tool === 'highlighter') {
          ctx.globalAlpha = 0.3;
        }
        
        const path = entry.data.path;
        ctx.moveTo(path[0].x, path[0].y);
        path.forEach(point => {
          ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
        ctx.globalAlpha = 1.0;
        redrawnDrawings.push(entry.data);
      } else {
        // Draw shape
        drawShape(ctx, entry.data);
        redrawnDrawings.push(entry.data);
      }
    });

    // Notify server with the updated drawings array
    socket.emit('redo', { 
      roomId,
      drawings: redrawnDrawings,
      history: newHistory,
      redoStack: newRedoStack
    });
  };

  // Add these functions BEFORE drawShape
  const drawStar = (ctx: CanvasRenderingContext2D, data: DrawData) => {
    const radius = Math.sqrt(
      Math.pow(data.endX - data.startX, 2) +
      Math.pow(data.endY - data.startY, 2)
    );
    const spikes = 5;
    const rotation = Math.PI / 2;

    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? radius : radius / 2;
      const angle = (i * Math.PI) / spikes - rotation;
      const x = data.startX + Math.cos(angle) * r;
      const y = data.startY + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    if (data.fillColor) {
      ctx.fillStyle = data.fillColor;
      ctx.fill();
    }
    ctx.stroke();
  };

  const drawHexagon = (ctx: CanvasRenderingContext2D, data: DrawData) => {
    const radius = Math.sqrt(
      Math.pow(data.endX - data.startX, 2) +
      Math.pow(data.endY - data.startY, 2)
    );
    const sides = 6;

    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides;
      const x = data.startX + radius * Math.cos(angle);
      const y = data.startY + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    if (data.fillColor) {
      ctx.fillStyle = data.fillColor;
      ctx.fill();
    }
    ctx.stroke();
  };

  // Then your drawShape function
  const drawShape = (ctx: CanvasRenderingContext2D, data: DrawData) => {
    // Only proceed if it's not a pen tool
    if (['pen', 'marker', 'highlighter', 'eraser'].includes(data.tool)) {
      return;
    }

    const width = Math.abs(data.endX - data.startX);
    const height = Math.abs(data.endY - data.startY);
    const startX = Math.min(data.startX, data.endX);
    const startY = Math.min(data.startY, data.endY);
    const centerX = (data.startX + data.endX) / 2;
    const centerY = (data.startY + data.endY) / 2;

    ctx.beginPath();
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.lineWidth;

    switch (data.tool) {
      case 'rectangle':
      case 'box':
        ctx.rect(startX, startY, width, height);
        break;

      case 'circle':
      case 'circleDot':
        const radius = Math.sqrt(width * width + height * height) / 2;
        ctx.arc(data.startX, data.startY, radius, 0, Math.PI * 2);
        if (data.tool === 'circleDot') {
          ctx.moveTo(data.startX + 2, data.startY);
          ctx.arc(data.startX, data.startY, 2, 0, Math.PI * 2);
        }
        break;

      case 'triangle':
      case 'pentagon':
        ctx.moveTo(data.startX, data.endY);
        ctx.lineTo(data.endX, data.endY);
        ctx.lineTo((data.startX + data.endX) / 2, data.startY);
        ctx.closePath();
        break;

      case 'hexagon':
        drawHexagon(ctx, data);
        return; // drawHexagon handles its own stroke and fill

      case 'octagon': {
        const side = Math.min(width, height) / 2;
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4;
          const x = centerX + side * Math.cos(angle);
          const y = centerY + side * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        break;
      }

      case 'star':
        const spikes = 5;
        const outerRadius = Math.min(width, height) / 2;
        const innerRadius = outerRadius / 2;
        
        for (let i = 0; i < spikes * 2; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (i * Math.PI) / spikes - Math.PI / 2;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        break;

      case 'line':
        ctx.moveTo(data.startX, data.startY);
        ctx.lineTo(data.endX, data.endY);
        break;

      case 'arrow':
        ctx.moveTo(data.startX, data.startY);
        ctx.lineTo(data.endX, data.endY);
        const angle = Math.atan2(data.endY - data.startY, data.endX - data.startX);
        const headLength = 20;
        ctx.lineTo(data.endX - headLength * Math.cos(angle - Math.PI / 6), data.endY - headLength * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(data.endX, data.endY);
        ctx.lineTo(data.endX - headLength * Math.cos(angle + Math.PI / 6), data.endY - headLength * Math.sin(angle + Math.PI / 6));
        break;

      case 'diamond':
      case 'parallelogram':
        if (data.tool === 'parallelogram') {
          const offset = width / 4;
          ctx.moveTo(startX + offset, startY);
          ctx.lineTo(startX + width + offset, startY);
          ctx.lineTo(startX + width, startY + height);
          ctx.lineTo(startX, startY + height);
        } else {
          ctx.moveTo(centerX, startY);
          ctx.lineTo(startX + width, centerY);
          ctx.lineTo(centerX, startY + height);
          ctx.lineTo(startX, centerY);
        }
        ctx.closePath();
        break;

      case 'cross':
        const crossSize = Math.min(width, height);
        ctx.moveTo(centerX - crossSize/2, centerY);
        ctx.lineTo(centerX + crossSize/2, centerY);
        ctx.moveTo(centerX, centerY - crossSize/2);
        ctx.lineTo(centerX, centerY + crossSize/2);
        break;

      case 'dot':
        ctx.arc(data.startX, data.startY, lineWidth/2, 0, Math.PI * 2);
        break;

      default:
        // Don't do anything for unknown tools
        return;
    }

    if (data.fillColor) {
      ctx.fillStyle = data.fillColor;
      ctx.fill();
    }
    ctx.stroke();
  };

  // First, let's group our tools
  const toolGroups = [
    // Drawing tools group
    [
      basicTools[0], // select
      basicTools[1], // pen
      basicTools[2], // shapes
      basicTools[3], // eraser
    ],
    // Content tools group
    [
      basicTools[4], // text
      basicTools[5], // fill
      basicTools[6], // move
      basicTools[7], // image
    ],
    // Style tools group
    [
      { id: 'color', icon: () => (
        <div 
          className="w-5 h-5 rounded-full border-2 border-gray-200"
          style={{ backgroundColor: color }}
        />
      ), name: 'Color', isDropdown: true, group: 'color' },
      { id: 'lineWidth', icon: () => (
        <div className="w-5 flex items-center">
          <div 
            className="w-full rounded-sm bg-gray-800" 
            style={{ height: `${lineWidth}px` }}
          />
        </div>
      ), name: 'Line Width', isDropdown: true, group: 'lineWidth' },
    ],
    // History tools group
    [
      { id: 'undo', icon: Undo2, name: 'Undo', action: undo, disabled: history.length === 0 },
      { id: 'redo', icon: Redo2, name: 'Redo', action: redo, disabled: redoStack.length === 0 },
      { id: 'clear', icon: Trash2, name: 'Clear Board', action: clearCanvas }
    ]
  ];

  // Add this type guard function
  const isBasicTool = (tool: any): tool is BasicTool => {
    return 'id' in tool && 'name' in tool;
  };

  // Then modify the renderToolbar function
  const renderToolbar = () => (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-white p-2 rounded-md shadow-md z-20">
      <div className="flex items-center gap-2 justify-center whitespace-nowrap">
        {toolGroups.map((group, groupIndex) => (
          <React.Fragment key={groupIndex}>
            {/* Add vertical divider between groups */}
            {groupIndex > 0 && (
              <div className="h-8 w-px bg-gray-200 mx-1" />
            )}
            {group.map(tool => (
              <div key={tool.id} className="relative p-1 flex-shrink-0">
                <button
                  onClick={(e) => {
                    if (tool.id === 'image') {
                      e.preventDefault();
                      imageInputRef.current?.click();
                    } else if (isBasicTool(tool) && tool.action) {
                      e.preventDefault();
                      tool.action();
                    } else {
                      e.stopPropagation();
                      if (isBasicTool(tool)) {
                        if (!tool.isDropdown) {
                          setSelectedTool(tool.id as ToolType);
                        } else {
                          if (tool.group === 'pen') {
                            setShowPenMenu(!showPenMenu);
                            setShowShapesMenu(false);
                            setShowColorPalette(false);
                          } else if (tool.group === 'shapes') {
                            setShowShapesMenu(!showShapesMenu);
                            setShowPenMenu(false);
                            setShowColorPalette(false);
                          } else if (tool.group === 'color') {
                            setShowColorPalette(!showColorPalette);
                            setShowPenMenu(false);
                            setShowShapesMenu(false);
                          } else if (tool.group === 'lineWidth') {
                            setShowLineWidthMenu(!showLineWidthMenu);
                            setShowPenMenu(false);
                            setShowShapesMenu(false);
                            setShowColorPalette(false);
                          }
                        }
                      }
                    }
                  }}
                  className={`p-2 rounded-md transition-colors flex items-center justify-center min-w-[40px] ${
                    isBasicTool(tool) && tool.disabled ? 'opacity-50 cursor-not-allowed' : 
                    (isBasicTool(tool) && !tool.isDropdown && selectedTool === tool.id) || 
                    (tool.id === 'pen' && ['pen', 'marker', 'highlighter'].includes(selectedTool)) ||
                    (tool.id === 'shapes' && shapes.some(s => s.id === selectedTool))
                      ? 'bg-blue-500 text-white' 
                      : 'hover:bg-gray-100'
                  }`}
                  disabled={isBasicTool(tool) && tool.disabled}
                >
                  {tool.id === 'pen' && ['pen', 'marker', 'highlighter'].includes(selectedTool) ? (
                    <div className="w-5 h-5">
                      {React.createElement(
                        penTools.find(pt => pt.id === selectedTool)?.icon || PenTool,
                        { size: 20 }
                      )}
                    </div>
                  ) : tool.id === 'shapes' && shapes.some(s => s.id === selectedTool) ? (
                    <div className="w-5 h-5">
                      {React.createElement(
                        shapes.find(s => s.id === selectedTool)?.icon || Square,
                        { size: 20 }
                      )}
                    </div>
                  ) : (
                    <tool.icon size={20} />
                  )}
                  {isBasicTool(tool) && tool.isDropdown && <ChevronDown size={16} className="ml-1" />}
                </button>

                {/* Pen Tools Dropdown */}
                {tool.id === 'pen' && showPenMenu && (
                  <div className="absolute top-full left-0 mt-1 bg-white rounded-md shadow-lg p-2 z-50 min-w-[150px]">
                    {penTools.map(penTool => (
                      <button
                        key={penTool.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedTool(penTool.id);
                          setLineWidth(penTool.width);
                          setShowPenMenu(false);
                        }}
                        className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-md w-full"
                      >
                        <penTool.icon size={16} />
                        <span>{penTool.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Shapes Dropdown */}
                {tool.id === 'shapes' && showShapesMenu && (
                  <div className="absolute top-full left-0 mt-1 bg-white rounded-md shadow-lg p-4 z-50 w-[280px]">
                    <div className="grid grid-cols-5 gap-3">
                      {shapes.map(shape => (
                        <button
                          key={shape.id}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedTool(shape.id);
                            setShowShapesMenu(false);
                          }}
                          className={`p-2 hover:bg-gray-50 rounded-md transition-colors flex items-center justify-center ${
                            selectedTool === shape.id ? 'bg-blue-50 ring-1 ring-blue-500' : ''
                          }`}
                          title={shape.id}
                        >
                          <shape.icon 
                            size={18} 
                            className={`transition-transform ${
                              shape.id === 'diamond' ? 'rotate-45' :
                              shape.id === 'parallelogram' ? 'skew-x-12' :
                              shape.id === 'dot' ? 'scale-50' :
                              shape.id === 'ellipse' ? 'scale-x-150' :
                              shape.id === 'smallSquare' ? 'scale-75' :
                              ''
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Color Picker Dropdown */}
                {tool.id === 'color' && showColorPalette && (
                  <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg p-4 z-50 w-64">
                    {Object.entries(colorPalettes).map(([paletteName, colors]) => (
                      <div key={paletteName} className="mb-4">
                        <div className="text-sm font-medium text-gray-700 capitalize mb-2">
                          {paletteName}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {colors.map(colorOption => (
                            <button
                              key={colorOption}
                              onClick={() => {
                                setColor(colorOption);
                                setShowColorPalette(false);
                              }}
                              className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${
                                color === colorOption 
                                  ? 'ring-2 ring-offset-2 ring-blue-500' 
                                  : 'hover:ring-2 hover:ring-offset-2 hover:ring-gray-300'
                              }`}
                              style={{ backgroundColor: colorOption }}
                              title={colorOption}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    {/* Custom Color */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-700">
                          Custom Color
                        </div>
                        <div className="relative">
                          <label 
                            className={`w-7 h-7 rounded-full transition-transform hover:scale-110 inline-block ${
                              'ring-2 ring-offset-2 ring-gray-200 hover:ring-blue-500'
                            }`}
                            style={{ backgroundColor: color }}
                          >
                            <input
                              type="color"
                              value={color}
                              onChange={(e) => {
                                setColor(e.target.value);
                                setShowColorPalette(false);
                              }}
                              className="opacity-0 absolute w-full h-full cursor-pointer"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Line Width Dropdown */}
                {tool.id === 'lineWidth' && showLineWidthMenu && (
                  <div className="absolute top-full left-0 mt-1 bg-white rounded-md shadow-lg p-3 z-50 min-w-[200px]">
                    {/* Custom Slider */}
                    <div className="mb-4 px-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Custom Width</span>
                        <span className="text-sm text-gray-500">{lineWidth}px</span>
                      </div>
                      <div className="relative h-4 flex items-center">
                        <input
                          type="range"
                          min="1"
                          max="20"
                          value={lineWidth}
                          onChange={(e) => setLineWidth(parseInt(e.target.value))}
                          className="absolute w-full h-4 cursor-pointer appearance-none bg-transparent z-10
                            [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-gray-200 [&::-webkit-slider-runnable-track]:rounded-full
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 
                            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white 
                            [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-500 
                            [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:mt-[-6px]
                            [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform
                            [&::-moz-range-track]:h-1 [&::-moz-range-track]:bg-gray-200 [&::-moz-range-track]:rounded-full
                            [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:border-none
                            [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white 
                            [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-blue-500"
                        />
                        <div className="absolute w-full h-1 bg-gray-100 rounded-full overflow-hidden pointer-events-none">
                          <div 
                            className="absolute h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full pointer-events-none transition-all duration-150"
                            style={{ width: `${(lineWidth / 20) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-gray-200 my-2" />

                    {/* Preset Options */}
                    <div className="space-y-2">
                      {lineWidthPresets.map(preset => (
                        <button
                          key={preset.size}
                          onClick={() => {
                            setLineWidth(preset.size);
                            setShowLineWidthMenu(false);
                          }}
                          className={`w-full flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-md transition-colors ${
                            lineWidth === preset.size ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="w-12 flex items-center">
                            <div 
                              className="w-full rounded-full bg-gray-800" 
                              style={{ height: `${preset.size}px` }}
                            />
                          </div>
                          <span className="text-sm text-gray-700">{preset.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  // Add these mouse event handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    
    lastX.current = startX;
    lastY.current = startY;
    shapeStartX.current = startX;
    shapeStartY.current = startY;

    if (['pen', 'marker', 'highlighter', 'eraser'].includes(selectedTool)) {
      setCurrentPath([{ x: startX, y: startY }]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if (selectedTool === 'text' || selectedTool === 'select' || selectedTool === 'move') return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    if (['pen', 'marker', 'highlighter', 'eraser'].includes(selectedTool)) {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        const minDistance = 2;
        const dx = currentX - lastX.current;
        const dy = currentY - lastY.current;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance >= minDistance) {
          // Draw locally
          ctx.beginPath();
          ctx.moveTo(lastX.current, lastY.current);
          ctx.lineTo(currentX, currentY);
          ctx.strokeStyle = selectedTool === 'eraser' ? '#FFFFFF' : color;
          ctx.lineWidth = lineWidth;
          if (selectedTool === 'highlighter') {
            ctx.globalAlpha = 0.3;
          }
          ctx.stroke();
          ctx.globalAlpha = 1.0;

          // Only collect points for the final stroke
          setCurrentPath(prev => [...prev, { x: currentX, y: currentY }]);

          lastX.current = currentX;
          lastY.current = currentY;
        }
      }
    } else {
      // Handle shapes preview
      const previewCtx = previewCanvasRef.current?.getContext('2d');
      if (previewCtx && previewCanvasRef.current) {
        previewCtx.clearRect(0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);
        
        const drawData: DrawData = {
          roomId,
          startX: shapeStartX.current,
          startY: shapeStartY.current,
          endX: currentX,
          endY: currentY,
          color,
          lineWidth,
          tool: selectedTool,
          fillColor: fillColor !== '#ffffff' ? fillColor : undefined
        };
        
        drawShape(previewCtx, drawData);
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;

    if (['pen', 'marker', 'highlighter', 'eraser'].includes(selectedTool)) {
      // Ensure we have at least two points in the path
      if (currentPath.length >= 2) {
        const strokeData: StrokeData = {
          roomId,
          startX: currentPath[0].x,
          startY: currentPath[0].y,
          endX: currentPath[currentPath.length - 1].x,
          endY: currentPath[currentPath.length - 1].y,
          color: selectedTool === 'eraser' ? '#FFFFFF' : color,
          lineWidth,
          tool: selectedTool,
          path: currentPath
        };

        addToHistory({ type: 'draw', data: strokeData });
        socket.emit('draw', strokeData);
      }
    } else {
      // Only add shape to history if start and end points are different
      const dx = endX - shapeStartX.current;
      const dy = endY - shapeStartY.current;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance >= 3) {
        const drawData: DrawData = {
          roomId,
          startX: shapeStartX.current,
          startY: shapeStartY.current,
          endX,
          endY,
          color,
          lineWidth,
          tool: selectedTool,
          fillColor: fillColor !== '#ffffff' ? fillColor : undefined
        };

        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
          drawShape(ctx, drawData);
        }

        addToHistory({ type: 'draw', data: drawData });
        socket.emit('draw', drawData);
      }
    }

    setIsDrawing(false);
    setCurrentPath([]);

    // Clear preview canvas
    const previewCtx = previewCanvasRef.current?.getContext('2d');
    if (previewCtx && previewCanvasRef.current) {
      previewCtx.clearRect(0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.relative')) {
        setShowPenMenu(false);
        setShowShapesMenu(false);
        setShowColorPalette(false);
        setShowLineWidthMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Add this variable for text size
  const textSize = 16; // You can adjust this value as needed

  // Add this function near your other event handlers
  const handleTextSubmit = () => {
    if (!textValue.trim()) {
      setTextPosition({ x: 0, y: 0 });
      setTextValue('');
      return;
    }

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      const drawData: DrawData = {
        roomId,
        startX: textPosition.x,
        startY: textPosition.y,
        endX: textPosition.x,
        endY: textPosition.y,
        color,
        lineWidth,
        tool: 'text',
        text: textValue
      };

      drawShape(ctx, drawData);
      socket.emit('draw', drawData);
      addToHistory({ type: 'draw', data: drawData });
    }

    setTextPosition({ x: 0, y: 0 });
    setTextValue('');
  };

  const handleImageImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx && canvasRef.current) {
          // Calculate dimensions to maintain aspect ratio and fit within canvas
          const maxWidth = canvasRef.current.width * 0.8;
          const maxHeight = canvasRef.current.height * 0.8;
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (maxWidth * height) / width;
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = (maxHeight * width) / height;
            height = maxHeight;
          }

          // Center the image
          const x = (canvasRef.current.width - width) / 2;
          const y = (canvasRef.current.height - height) / 2;

          // Draw image directly first
          ctx.drawImage(img, x, y, width, height);

          // Then create and emit the draw data
          const drawData: DrawData = {
            roomId,
            startX: x,
            endX: x + width,
            startY: y,
            endY: y + height,
            color: color,
            lineWidth: lineWidth,
            tool: 'image',
            imageData: reader.result as string,
            width,
            height
          };

          // Emit to other users
          socket.emit('draw', drawData);

          // Add to history
          addToHistory({ type: 'draw', data: drawData });
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);

    // Reset input
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  return (
    <div 
      ref={containerRef} 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#f3f4f6'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'white'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseOut={handleMouseUp}
      />
      <canvas
        ref={previewCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      />
      {/* Room Details */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white p-2 rounded-md shadow-md z-20">
        <div className="flex items-center justify-center space-x-2">
          <div className="flex items-center space-x-2">
            <p className="text-sm text-gray-600 whitespace-nowrap">Room ID: {roomId}</p>
            <button
              onClick={copyRoomId}
              className="p-1 hover:bg-gray-100 rounded-md flex-shrink-0 text-gray-600"
              title="Copy Room ID"
            >
              <Copy size={16} />
            </button>
          </div>
          <div className="w-px h-4 bg-gray-200" /> {/* Vertical divider */}
          <p className="text-sm text-gray-600 whitespace-nowrap">User: {username}</p>
        </div>
      </div>

      {/* Copy Toast Notification */}
      {showCopyToast && (
        <div 
          className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-black/75 text-white px-3 py-2 rounded-full text-sm shadow-lg transition-opacity duration-200 flex items-center gap-2"
        >
          <svg 
            className="w-4 h-4 text-green-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 13l4 4L19 7"
            />
          </svg>
          Room ID copied!
        </div>
      )}

      {renderToolbar()}

      <button
        onClick={() => setShowChat(!showChat)}
        className="fixed bottom-4 right-4 bg-blue-500 text-white rounded-full p-3 shadow-lg hover:bg-blue-600 z-10"
      >
        {showChat ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {showChat && (
        <div className="absolute right-4 bottom-20 w-96 h-96 bg-white rounded-lg shadow-xl z-10">
          <Chat 
            socket={socket} 
            roomId={roomId} 
            username={username} 
            onClose={() => setShowChat(false)} 
          />
        </div>
      )}

      {/* Text Input Overlay */}
      {textPosition.x !== 0 && textPosition.y !== 0 && (
        <div
          className="absolute z-50"
          style={{
            left: textPosition.x,
            top: textPosition.y
          }}
        >
          <textarea
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onBlur={handleTextSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
            className="border-2 border-blue-500 rounded p-1"
            style={{
              backgroundColor: 'rgba(255,255,255,0.8)',
              color,
              fontSize: `${textSize}px`
            }}
            placeholder="Type here..."
          />
        </div>
      )}

      <button
        onClick={downloadWhiteboard}
        className="fixed bottom-4 left-4 bg-green-500 text-white rounded-full p-3 shadow-lg hover:bg-green-600 z-10"
      >
        <Download size={24} />
      </button>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageImport}
        className="hidden"
      />
    </div>
  );
};

export default Whiteboard;