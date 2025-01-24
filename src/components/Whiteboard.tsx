import React, { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { 
  X, MessageCircle, Square, Circle, Type, Eraser, 
  ChevronDown, Undo2, Redo2, Trash2, MousePointer,
  Triangle, Star, Hexagon, PenTool, Highlighter, Edit3,
  Move, PaintBucket, Download
} from 'lucide-react';
import Chat from './Chat';

interface WhiteboardProps {
  socket: Socket;
  roomId: string;
  username: string;
}

interface DrawData {
  roomId: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  lineWidth: number;
  tool: string;
  text?: string;
  fillColor?: string;
  selectedObject?: boolean;
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
  data?: DrawData;
};

const Whiteboard: React.FC<WhiteboardProps> = ({ socket, roomId, username }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('#ffffff');
  const [lineWidth, setLineWidth] = useState(2);
  const [selectedTool, setSelectedTool] = useState('pen');
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
  
  const lastX = useRef<number>(0);
  const lastY = useRef<number>(0);
  const shapeStartX = useRef<number>(0);
  const shapeStartY = useRef<number>(0);
  const dragStartX = useRef<number>(0);
  const dragStartY = useRef<number>(0);
  
  const downloadWhiteboard = () => {
    if (canvasRef.current) {
      const dataURL = canvasRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `doodlesphere_${new Date().toISOString().slice(0,10)}.png`;
      link.href = dataURL;
      link.click();
    }
  };

  const penTools = [
    { id: 'pen', icon: PenTool, name: 'Pen', width: 2 },
    { id: 'marker', icon: Edit3, name: 'Marker', width: 5 },
    { id: 'highlighter', icon: Highlighter, name: 'Highlighter', width: 20 },
  ];

  const shapes = [
    { id: 'rectangle', icon: Square, name: 'Rectangle' },
    { id: 'circle', icon: Circle, name: 'Circle' },
    { id: 'triangle', icon: Triangle, name: 'Triangle' },
    { id: 'star', icon: Star, name: 'Star' },
    { id: 'hexagon', icon: Hexagon, name: 'Hexagon' },
  ];

  const tools = [
    { id: 'select', icon: MousePointer, name: 'Select' },
    { id: 'pen', icon: PenTool, name: 'Drawing Tools', isDropdown: true },
    { id: 'shapes', icon: Square, name: 'Shapes', isDropdown: true },
    { id: 'eraser', icon: Eraser, name: 'Eraser' },
    { id: 'text', icon: Type, name: 'Text' },
    { id: 'fill', icon: PaintBucket, name: 'Fill' },
    { id: 'move', icon: Move, name: 'Move' }
  ];

  // Add useEffect for history management
  useEffect(() => {
    socket.emit('join-room', roomId);

    socket.on('draw', (data: DrawData) => {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        drawShape(ctx, data);
        addToHistory({ type: 'draw', data });
      }
    });

    socket.on('initial-state', (drawings: DrawData[]) => {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        drawings.forEach(drawing => {
          drawShape(ctx, drawing);
          addToHistory({ type: 'draw', data: drawing });
        });
      }
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

    const resizeCanvas = () => {
      if (canvasRef.current && previewCanvasRef.current && containerRef.current) {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Set main canvas size
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        
        // Set preview canvas size
        previewCanvasRef.current.width = width;
        previewCanvasRef.current.height = height;
        
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, width, height);
        }
      }
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    return () => {
      socket.off('draw');
      socket.off('initial-state');
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [roomId, socket]);

  const handleInitialState = (drawings: DrawData[]) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      drawings.forEach(drawing => drawShape(ctx, drawing));
    }
  };

  const handleRemoteDraw = (data: DrawData) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      drawShape(ctx, data);
    }
  };

  const addToHistory = (entry: HistoryEntry) => {
    setHistory(prev => [...prev, entry]);
    setRedoStack([]); // Clear redo stack when new action is performed
  };

  const undo = () => {
    if (history.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    // Remove last action from history
    const newHistory = [...history];
    const lastAction = newHistory.pop();
    setHistory(newHistory);
    setRedoStack(prev => [...prev, lastAction!]);

    // Clear canvas and redraw everything from history
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    newHistory.forEach(entry => {
      if (entry.type === 'draw' && entry.data) {
        drawShape(ctx, entry.data);
      }
    });
  };

  const redo = () => {
    if (redoStack.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    // Get last action from redo stack
    const newRedoStack = [...redoStack];
    const lastAction = newRedoStack.pop();
    setRedoStack(newRedoStack);
    setHistory(prev => [...prev, lastAction!]);

    if (lastAction?.type === 'draw' && lastAction.data) {
      drawShape(ctx, lastAction.data);
    } else if (lastAction?.type === 'clear') {
      clearCanvas();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    addToHistory({ type: 'clear' });
    socket.emit('clear-board', { roomId });
  };

  // Enhanced drawShape function to handle new shapes
  const drawShape = (ctx: CanvasRenderingContext2D, data: DrawData) => {
    ctx.strokeStyle = data.tool === 'eraser' ? '#FFFFFF' : data.color;
    ctx.lineWidth = data.lineWidth;
    
    if (data.tool === 'highlighter') {
      ctx.globalAlpha = 0.3;
    } else {
      ctx.globalAlpha = 1;
    }

    if ('path' in data && data.path) {
      // Draw the complete path
      ctx.beginPath();
      ctx.moveTo(data.path[0].x, data.path[0].y);
      for (let i = 1; i < data.path.length; i++) {
        ctx.lineTo(data.path[i].x, data.path[i].y);
      }
      ctx.stroke();
    } else {

      switch (data.tool) {
        case 'pen':
        case 'marker':
        case 'highlighter':
        case 'eraser':
          ctx.beginPath();
          ctx.moveTo(data.startX, data.startY);
          ctx.lineTo(data.endX, data.endY);
          ctx.stroke();
          ctx.closePath();
          break;
        
        case 'rectangle':
          ctx.beginPath();
          const width = data.endX - data.startX;
          const height = data.endY - data.startY;
          if (data.fillColor) {
            ctx.fillStyle = data.fillColor;
            ctx.fillRect(data.startX, data.startY, width, height);
          }
          ctx.strokeRect(data.startX, data.startY, width, height);
          break;
        
        case 'circle':
          ctx.beginPath();
          const radius = Math.sqrt(
            Math.pow(data.endX - data.startX, 2) +
            Math.pow(data.endY - data.startY, 2)
          );
          ctx.arc(data.startX, data.startY, radius, 0, Math.PI * 2);
          if (data.fillColor) {
            ctx.fillStyle = data.fillColor;
            ctx.fill();
          }
          ctx.stroke();
          break;

        case 'triangle':
          ctx.beginPath();
          ctx.moveTo(data.startX, data.endY);
          ctx.lineTo(data.startX + (data.endX - data.startX) / 2, data.startY);
          ctx.lineTo(data.endX, data.endY);
          ctx.closePath();
          if (data.fillColor) {
            ctx.fillStyle = data.fillColor;
            ctx.fill();
          }
          ctx.stroke();
          break;

        case 'star':
          drawStar(ctx, data);
          break;

        case 'hexagon':
          drawHexagon(ctx, data);
          break;
        
        case 'text':
          if (data.text) {
            ctx.font = `${data.lineWidth * 8}px Arial`;
            ctx.fillStyle = data.color;
            ctx.fillText(data.text, data.startX, data.startY);
          }
          break;
      }  
    }
    ctx.globalAlpha = 1;
  };

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

  // Enhanced toolbar render
  const renderToolbar = () => (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white p-2 rounded-md shadow-md flex space-x-2 z-20">
      <div className="flex items-center space-x-2">
        {tools.map(tool => (
          <div key={tool.id} className="relative">
            <button
              onClick={() => {
                if (tool.isDropdown) {
                  if (tool.id === 'pen') setShowPenMenu(!showPenMenu);
                  if (tool.id === 'shapes') setShowShapesMenu(!showShapesMenu);
                } else {
                  setSelectedTool(tool.id);
                  setShowPenMenu(false);
                  setShowShapesMenu(false);
                }
              }}
              className={`p-2 rounded-md transition-colors flex items-center ${
                selectedTool === tool.id 
                  ? 'bg-blue-500 text-white' 
                  : 'hover:bg-gray-100'
              }`}
              title={tool.name}
            >
              <tool.icon size={20} />
              {tool.isDropdown && <ChevronDown size={16} className="ml-1" />}
            </button>

            {/* Pen Tools Dropdown */}
            {tool.id === 'pen' && showPenMenu && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-md shadow-lg p-2 z-30">
                {penTools.map(penTool => (
                  <button
                    key={penTool.id}
                    onClick={() => {
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
              <div className="absolute top-full left-0 mt-1 bg-white rounded-md shadow-lg p-2 z-30">
                {shapes.map(shape => (
                  <button
                    key={shape.id}
                    onClick={() => {
                      setSelectedTool(shape.id);
                      setShowShapesMenu(false);
                    }}
                    className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-md w-full"
                  >
                    <shape.icon size={16} />
                    <span>{shape.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="h-6 w-px bg-gray-200 mx-2" />
        
        <button
          onClick={undo}
          className="p-2 rounded-md hover:bg-gray-100"
          title="Undo"
          disabled={history.length === 0}
        >
          <Undo2 size={20} className={history.length === 0 ? 'opacity-50' : ''} />
        </button>
        
        <button
          onClick={redo}
          className="p-2 rounded-md hover:bg-gray-100"
          title="Redo"
          disabled={redoStack.length === 0}
        >
          <Redo2 size={20} className={redoStack.length === 0 ? 'opacity-50' : ''} />
        </button>
        
        <button
          onClick={clearCanvas}
          className="p-2 rounded-md hover:bg-gray-100"
          title="Clear Board"
        >
          <Trash2 size={20} />
        </button>

        <div className="h-6 w-px bg-gray-200 mx-2" />
        
          {/* Line Width Selector */}
          <div className="relative">
            <button
              onClick={() => setShowLineWidthMenu(!showLineWidthMenu)}
              className="p-2 rounded-md hover:bg-gray-100 flex items-center"
              title="Line Width"
            >
              <div 
                className="w-6 h-1 rounded-full" 
                style={{ 
                  backgroundColor: color, 
                  height: `${lineWidth}px` 
                }}
              />
            </button>
            
            {showLineWidthMenu && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-md shadow-lg p-2 z-30 w-40">
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={lineWidth}
                  onChange={(e) => setLineWidth(parseInt(e.target.value))}
                  className="w-full"
                  title="Line width"
                />
                <div className="text-center text-sm mt-1">
                  Width: {lineWidth}px
                </div>
              </div>
            )}
          </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            {['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'].map((colorOption) => (
              <button
                key={colorOption}
                onClick={() => setColor(colorOption)}
                className={`w-6 h-6 p-0 rounded-full border-2 ${
                  color === colorOption ? 'border-blue-500' : 'border-transparent'
                }`}
                style={{ 
                  backgroundColor: colorOption,
                  boxShadow: color === colorOption 
                    ? '0 0 0 2px white, 0 0 0 4px blue' 
                    : 'none'
                }}
                title={`Select ${colorOption}`}
              />
            ))}
            {/* Custom color picker */}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-6 h-6 p-0 border-none rounded-full cursor-pointer"
              title="Custom color"
            />
          </div>

          {/* Fill Color for Shapes */}
          {(selectedTool.startsWith('rectangle') || 
            selectedTool.startsWith('circle') || 
            selectedTool.startsWith('triangle') || 
            selectedTool.startsWith('star') || 
            selectedTool.startsWith('hexagon')) && (
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setFillColor('#ffffff')}
                className={`w-6 h-6 p-0 rounded-full border-2 ${
                  fillColor === '#ffffff' ? 'border-blue-500' : 'border-transparent'
                } bg-white`}
                title="No fill"
              >
              </button>
              {['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'].map((colorOption) => (
                <button
                  key={colorOption}
                  onClick={() => setFillColor(colorOption)}
                  className={`w-6 h-6 p-0 rounded-full border-2 ${
                    fillColor === colorOption ? 'border-blue-500' : 'border-transparent'
                  }`}
                  style={{ 
                    backgroundColor: colorOption,
                    boxShadow: fillColor === colorOption 
                      ? '0 0 0 2px white, 0 0 0 4px blue' 
                      : 'none'
                  }}
                  title={`Select ${colorOption} fill`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      lastX.current = x;
      lastY.current = y;
      shapeStartX.current = x;
      shapeStartY.current = y;

      if (selectedTool === 'text') {
        const userText = prompt('Enter text:');
        if (userText) {
          const drawData: DrawData = {
            roomId,
            startX: x,
            startY: y,
            endX: x,
            endY: y,
            color,
            lineWidth,
            tool: 'text',
            text: userText
          };
          const ctx = canvasRef.current?.getContext('2d');
          if (ctx) {
            drawShape(ctx, drawData);
            socket.emit('draw', drawData);
            addToHistory({ type: 'draw', data: drawData });
          }
        }
      } else if (['pen', 'marker', 'highlighter', 'eraser'].includes(selectedTool)) {
        setCurrentPath([{ x, y }]);
      } else if(selectedTool == 'select') {
          const selectedDrawings = findObjectsAtPoint(x, y);
          setSelectedObjects(selectedDrawings);
      } else if(selectedTool == 'move') {
        if (selectedObjects.length > 0) {
          dragStartX.current = x;
          dragStartY.current = y;
        }
      } else if(selectedTool == 'fill') {
        fillArea(x, y, color);
      }
    }
  };

  // Fill area around a point with a specific color
  const fillArea = (x: number, y: number, fillColor: string) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    // Simple flood fill using canvas context
    ctx.fillStyle = fillColor;
    ctx.fillFlood(x, y);
  };

  // Find objects at a specific point
  const findObjectsAtPoint = (x: number, y: number): DrawData[] => {
    // Implement point-in-shape detection for various shapes
    // This is a simplified version and can be expanded
    return history
      .filter(entry => entry.type === 'draw' && entry.data)
      .map(entry => entry.data!)
      .filter(drawing => {
        switch (drawing.tool) {
          case 'rectangle':
            return x >= drawing.startX && x <= drawing.endX &&
                   y >= drawing.startY && y <= drawing.endY;
          case 'circle':
            const centerX = drawing.startX;
            const centerY = drawing.startY;
            const radius = Math.sqrt(
              Math.pow(drawing.endX - centerX, 2) +
              Math.pow(drawing.endY - centerY, 2)
            );
            return Math.sqrt(
              Math.pow(x - centerX, 2) + 
              Math.pow(y - centerY, 2)
            ) <= radius;
          default:
            return false;
        }
      });
  };

  // Handle text input submission
  const handleTextSubmit = () => {
    if (textValue.trim()) {
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

      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        drawShape(ctx, drawData);
        socket.emit('draw', drawData);
        addToHistory({ type: 'draw', data: drawData });
      }

      setTextValue('');
      setShowTextInput(false);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || selectedTool === 'text' || selectedTool === 'select' || selectedTool === 'move') return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    if (['rectangle', 'circle', 'triangle', 'star', 'hexagon'].includes(selectedTool)) {
      // Draw on preview canvas
      const previewCtx = previewCanvasRef.current?.getContext('2d');
      if (previewCtx) {
        previewCtx.clearRect(0, 0, previewCanvasRef.current!.width, previewCanvasRef.current!.height);
        
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
    } else if (['pen', 'marker', 'highlighter', 'eraser'].includes(selectedTool)) {
      setCurrentPath(prev => [...prev, { x: currentX, y: currentY }]);
      
      // Draw locally for immediate feedback
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(lastX.current, lastY.current);
        ctx.lineTo(currentX, currentY);
        ctx.strokeStyle = selectedTool === 'eraser' ? '#FFFFFF' : color;
        ctx.lineWidth = lineWidth;
        if (selectedTool === 'highlighter') {
          ctx.globalAlpha = 0.3;
        }
        ctx.stroke();
        ctx.closePath();
        ctx.globalAlpha = 1.0;
      }
      
      lastX.current = currentX;
      lastY.current = currentY;
    }
  };

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
  
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
  
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
  
    if (['rectangle', 'circle', 'triangle', 'star', 'hexagon'].includes(selectedTool)) {
      // Shape drawing logic remains the same
      const previewCtx = previewCanvasRef.current?.getContext('2d');
      if (previewCtx) {
        previewCtx.clearRect(0, 0, previewCanvasRef.current!.width, previewCanvasRef.current!.height);
      }
      
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
      
      socket.emit('draw', drawData);
    } else if (currentPath.length > 0) {
      // Emit the complete path data
      const strokeData: StrokeData = {
        roomId,
        startX: currentPath[0].x,
        startY: currentPath[0].y,
        endX: currentPath[currentPath.length - 1].x,
        endY: currentPath[currentPath.length - 1].y,
        color,
        lineWidth,
        tool: selectedTool,
        path: currentPath
      };
      
      socket.emit('draw', strokeData);
      setCurrentPath([]);
    }
  
    setIsDrawing(false);
  };

  return (
    <div ref={containerRef} className="fixed inset-0 bg-gray-50">
      <div className="absolute top-4 left-4 bg-white p-2 rounded-md shadow-md z-10">
        <p className="text-sm text-gray-600">Room ID: {roomId}</p>
        <p className="text-sm text-gray-600">User: {username}</p>
      </div>

      {renderToolbar()}

      <button
        onClick={() => setShowChat(!showChat)}
        className="absolute bottom-4 right-4 bg-blue-500 text-white rounded-full p-3 shadow-lg hover:bg-blue-600 z-10"
      >
        {showChat ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {showChat && (
        <div className="absolute right-4 bottom-20 w-80 h-96 bg-white rounded-lg shadow-xl z-10">
          <Chat socket={socket} roomId={roomId} username={username} />
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
        className="absolute bottom-4 left-4 bg-green-500 text-white rounded-full p-3 shadow-lg hover:bg-green-600 z-10"
      >
        <Download size={24} />
      </button>

      <canvas
        ref={canvasRef}
        className="absolute inset-0 bg-white"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
      />
      <canvas
        ref={previewCanvasRef}
        className="absolute inset-0 pointer-events-none"
      />
    </div>
  );
};

export default Whiteboard;