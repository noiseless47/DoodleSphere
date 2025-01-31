import { ReactElement } from 'react';
import { Tool } from './whiteboard';

// Base interface for all tools
interface BaseToolProps {
  id: string;
}

// Separator tool type
export interface SeparatorTool extends BaseToolProps {
  isSeparator: true;
}

// Regular tool type
export interface RegularTool extends BaseToolProps {
  icon: React.ComponentType<any>;
  name: string;
  action?: () => void;
  disabled?: boolean;
  isDropdown?: boolean;
  group?: string;
  defaultTool?: string;
  isSeparator?: false;
}

// Combined tool type
export type BasicTool = SeparatorTool | RegularTool;

// Type guard to check if tool is regular tool
export function isRegularTool(tool: BasicTool): tool is RegularTool {
  return !('isSeparator' in tool) || !tool.isSeparator;
}

export type ToolType = Tool | 'pen' | 'marker' | 'highlighter' | 'eraser' | 'text' | 'fill' | 'move' | 'image' | 'select'; 