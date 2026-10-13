import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripHorizontal } from 'lucide-react';

interface SortableBlockProps {
  id: string;
  children: React.ReactNode;
}

export function SortableBlock({ id, children }: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div 
        {...attributes} 
        {...listeners} 
        className="absolute -top-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 border shadow-sm rounded-full p-1 cursor-grab active:cursor-grabbing z-20"
        title="Arraste para reordenar"
      >
        <GripHorizontal className="h-4 w-4 text-muted-foreground" />
      </div>
      {children}
    </div>
  );
}
