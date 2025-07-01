// Author: Kushal Sharma
"use client";

import { Sprint } from "@/types";
import { Button } from "@/components/ui/button";
import { Trash2, GanttChartSquare } from "lucide-react";
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface SprintItemProps {
  sprint: Sprint;
  onDelete: () => void;
}

export default function SprintItem({ sprint, onDelete }: SprintItemProps) {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div 
      className="relative flex items-center gap-3 rounded-md hover:bg-secondary/50 transition-colors duration-200 group p-2"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
        <GanttChartSquare className="w-4 h-4 text-muted-foreground" />
        <span className="flex-grow text-sm font-medium text-foreground">{sprint.name}</span>
        <div className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 flex items-center p-1 rounded-md bg-background/80 backdrop-blur-sm shadow-lg transition-opacity duration-200",
            isHovering ? "opacity-100" : "opacity-0 pointer-events-none"
        )}>
            <Button variant="ghost" size="icon" onClick={onDelete} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete Sprint</span>
            </Button>
        </div>
    </div>
  );
}
