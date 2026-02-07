'use client';
import { useState } from 'react';
import {
  Brush,
  Move,
  MousePointer2,
  ZoomIn,
  ZoomOut,
  Settings2,
  Trash2,
  Magnet,
  Lock,
  Eye,
  Type,
  Ruler,
  PanelLeft,
  GitBranch,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const mainTools = [
  { icon: MousePointer2, label: 'Cursor' },
  { icon: Move, label: 'Trend Line' },
];
const drawingTools = [
  { icon: Brush, label: 'Brush' },
  { icon: GitBranch, label: 'Fibonacci Retracement' },
  { icon: Type, label: 'Text' },
  { icon: Ruler, label: 'Measure' },
];
const utilityTools = [
  { icon: Magnet, label: 'Magnet' },
  { icon: Lock, label: 'Lock' },
  { icon: Eye, label: 'Visibility' },
  { icon: Settings2, label: 'Settings' },
];

const drawingColors = [
    'hsl(120 100% 50%)',
    'hsl(0 84.2% 60.2%)',
    'hsl(130 100% 95%)',
    'hsl(220 80% 60%)',
    'hsl(48 95% 60%)',
];

export default function DrawingToolbar({ 
    onClear,
    zoomIn,
    zoomOut,
    activeTool,
    setActiveTool,
    drawingColor,
    onDrawingColorChange,
}: { 
    onClear: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
    activeTool: string;
    setActiveTool: (tool: string) => void;
    drawingColor: string;
    onDrawingColorChange: (color: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);

  const renderToolButton = (tool: {icon: React.ElementType, label: string}) => (
    <Tooltip key={tool.label}>
        <TooltipTrigger asChild>
            <Button 
                variant={activeTool === tool.label ? 'secondary' : 'ghost'} 
                size="icon" 
                className="w-8 h-8" 
                onClick={() => setActiveTool(tool.label)}
            >
                <tool.icon className="w-4 h-4" />
            </Button>
        </TooltipTrigger>
        <TooltipContent side="right">{tool.label}</TooltipContent>
    </Tooltip>
  );

  const isDrawingToolActive = ['Brush', 'Trend Line', 'Text', 'Fibonacci Retracement', 'Measure'].includes(activeTool);

  return (
    <TooltipProvider>
      <div className="flex flex-col items-center gap-1 p-1 border bg-card/80 backdrop-blur-sm rounded-lg">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setIsOpen(!isOpen)}>
              <PanelLeft className={`w-4 h-4 transition-transform ${!isOpen ? 'rotate-180' : ''}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{isOpen ? 'Hide Toolbar' : 'Show Toolbar'}</TooltipContent>
        </Tooltip>

        {isOpen && (
          <>
            <Separator className="my-1" />
            {mainTools.map(tool => renderToolButton(tool))}
            <Separator className="my-1" />
            {drawingTools.map(tool => renderToolButton(tool))}

            {isDrawingToolActive && (
                 <Popover>
                    <PopoverTrigger asChild>
                         <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="w-8 h-8">
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: drawingColor }} />
                                </Button>
                             </TooltipTrigger>
                            <TooltipContent side="right">Drawing Color</TooltipContent>
                        </Tooltip>
                    </PopoverTrigger>
                    <PopoverContent side="right" className="w-auto p-2">
                        <div className="flex gap-1">
                            {drawingColors.map(color => (
                                <Button
                                    key={color}
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "w-6 h-6 rounded-full p-0",
                                        drawingColor === color && "ring-2 ring-ring ring-offset-2 ring-offset-background"
                                    )}
                                    onClick={() => onDrawingColorChange(color)}
                                >
                                    <div className="w-full h-full rounded-full" style={{ backgroundColor: color }}/>
                                </Button>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>
            )}

            <Separator className="my-1" />
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-8 h-8" onClick={zoomIn}><ZoomIn className="w-4 h-4" /></Button>
                </TooltipTrigger>
                <TooltipContent side="right">Zoom In</TooltipContent>
            </Tooltip>
             <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-8 h-8" onClick={zoomOut}><ZoomOut className="w-4 h-4" /></Button>
                </TooltipTrigger>
                <TooltipContent side="right">Zoom Out</TooltipContent>
            </Tooltip>
            <div className="flex-grow" />
            {utilityTools.map(tool => renderToolButton(tool))}
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onClear}>
                    <Trash2 className="w-4 h-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Clear Drawings & Indicators</TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
