import { IColor } from "react-color-palette";

export interface DrawData {
  roomId: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: IColor;
  lineWidth: number;
  tool: string;
  text?: string;
  imageData?: string;
  width?: number;
  height?: number;
  fillColor?: string;
  path?: { x: number; y: number; }[];
}

export type Tool = 'rectangle' | 'circle' | 'triangle' | 'star' | 'hexagon' | 
  'diamond' | 'pentagon' | 'octagon' | 'cross' | 'arrow' | 'line' | 'hash' | 
  'box' | 'circleDot' | 'heart' | 'bolt' | 'moon' | 'sun' | 'plus' | 'dot' | 
  'ring' | 'parallelogram' | 'trapezoid' | 'ellipse' | 'smallSquare'; 