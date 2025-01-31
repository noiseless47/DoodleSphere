import { RegularTool, SeparatorTool } from '../types/tools';
import {
  MousePointer, PenTool, Square, Eraser, Type,
  PaintBucket, Move, Image, Edit3, Highlighter,
  Circle, Triangle, Star, Hexagon, ArrowRight, Minus,
  Heart, Zap, Moon, Sun, Plus, Hash, CircleDot, Box
} from 'lucide-react';

export const basicTools: RegularTool[] = [
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
];

export const shapes = [
  { id: 'rectangle', icon: Square },
  { id: 'circle', icon: Circle },
  { id: 'triangle', icon: Triangle },
  { id: 'star', icon: Star },
  { id: 'hexagon', icon: Hexagon },
  { id: 'diamond', icon: Square },
  { id: 'arrow', icon: ArrowRight },
  { id: 'line', icon: Minus },
  { id: 'heart', icon: Heart },
  { id: 'bolt', icon: Zap },
  { id: 'moon', icon: Moon },
  { id: 'sun', icon: Sun },
  { id: 'plus', icon: Plus },
  { id: 'hash', icon: Hash },
  { id: 'dot', icon: CircleDot },
  { id: 'box', icon: Box }
] as const;

export const penTools = [
  { id: 'pen', icon: PenTool, name: 'Pen', width: 2 },
  { id: 'marker', icon: Edit3, name: 'Marker', width: 5 },
  { id: 'highlighter', icon: Highlighter, name: 'Highlighter', width: 20 }
] as const;

export const lineWidthPresets = [
  { size: 2, label: 'Fine' },
  { size: 4, label: 'Medium' },
  { size: 6, label: 'Thick' },
  { size: 8, label: 'Extra Thick' },
  { size: 12, label: 'Super Thick' }
]; 