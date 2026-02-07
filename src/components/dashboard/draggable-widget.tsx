'use client';
import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface DraggableWidgetProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  isPinned?: boolean;
  disabled?: boolean;
}

export const DraggableWidget: React.FC<DraggableWidgetProps> = ({ id, children, className, isPinned, disabled }) => {
  const isDisabled = !!isPinned || !!disabled;
  
  const { isDragging, attributes, listeners, setNodeRef: setDraggableNodeRef } = useDraggable({
    id,
    disabled: isDisabled,
  });
  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({
    id,
    disabled: isDisabled,
  });

  const setNodeRef = (node: HTMLElement | null) => {
    setDraggableNodeRef(node);
    setDroppableNodeRef(node);
  };
  
  const dropOverlay = (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-accent bg-accent/20 backdrop-blur-sm">
      <span className="text-lg font-bold text-[#71FF95]">Drop Here</span>
    </div>
  );

  const footprint = (
    <Card className="h-full w-full border-2 border-dashed border-muted-foreground/50" />
  );

  return (
    <div ref={setNodeRef} {...attributes} className={cn('relative', className)}>
      <div style={{ visibility: isDragging ? 'hidden' : 'visible' }} className="relative h-full">
        {React.cloneElement(children as React.ReactElement, { dragListeners: listeners })}
        {isOver && !isDragging && dropOverlay}
      </div>

      {isDragging && (
        <div className="absolute inset-0">
          {footprint}
        </div>
      )}
    </div>
  );
};
