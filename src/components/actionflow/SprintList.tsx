// Author: Kushal Sharma
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Sprint } from "@/types";
import SprintItem from "./SprintItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUIStore } from "@/hooks/useUIStore";
import { cn } from "@/lib/utils";

interface SprintListProps {
  sprints: Sprint[];
  icon: React.ReactNode;
  addSprint: (name: string) => void;
  deleteSprint: (name: string) => void;
}

export default function SprintList({
  sprints,
  icon,
  addSprint,
  deleteSprint,
}: SprintListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newSprintName, setNewSprintName] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  const { cardHeight, setCardHeight } = useUIStore();
  const [isResizing, setIsResizing] = useState(false);
  const [canScroll, setCanScroll] = useState(false);
  const scrollAreaViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAdding) {
      nameInputRef.current?.focus();
    }
  }, [isAdding]);

  const handleAddSprint = () => {
    if (newSprintName.trim()) {
      addSprint(newSprintName.trim());
      setNewSprintName("");
      setIsAdding(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddSprint();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewSprintName("");
    }
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    document.body.style.cursor = 'ns-resize';
    setIsResizing(true);
    const startY = e.clientY;
    const startHeight = cardHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      setCardHeight(startHeight + deltaY);
    };

    const handleMouseUp = () => {
      document.body.style.cursor = 'default';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  const checkScrollability = useCallback(() => {
    const element = scrollAreaViewportRef.current;
    if (element) {
      setCanScroll(element.scrollHeight > element.clientHeight);
    }
  }, []);
  
  useEffect(() => {
    checkScrollability();
    const element = scrollAreaViewportRef.current;
    if (!element) return;
    
    const resizeObserver = new ResizeObserver(checkScrollability);
    resizeObserver.observe(element);
    
    return () => resizeObserver.disconnect();
  }, [sprints, cardHeight, checkScrollability]);

  return (
    <Card className={cn(
        "relative flex flex-col h-full shadow-md hover:shadow-xl transition-shadow duration-300",
        isResizing ? 'select-none' : ''
      )}
    >
      <CardHeader className="p-4">
        <CardTitle className="flex items-center gap-3 text-xl font-semibold">
          {icon}
          Sprint Management
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col gap-4 p-4 pt-0">
        <ScrollArea 
          className="flex-grow pr-4 -mr-4"
          style={{ height: `${cardHeight}px` }}
          viewportRef={scrollAreaViewportRef}
        >
          <div className="space-y-1">
            {sprints.length > 0 ? (
              sprints.map((sprint) => (
                <SprintItem
                  key={sprint.name}
                  sprint={sprint}
                  onDelete={() => deleteSprint(sprint.name)}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No sprints defined yet.</p>
            )}
          </div>
        </ScrollArea>
        <div 
          className="mt-auto pt-4 border-t"
          data-scrollable={canScroll}
        >
          {isAdding ? (
            <div className="flex items-center gap-2">
              <Input
                ref={nameInputRef}
                type="text"
                placeholder="New Sprint Name"
                value={newSprintName}
                onChange={(e) => setNewSprintName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="bg-card"
              />
              <Button size="icon" onClick={handleAddSprint} disabled={!newSprintName.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsAdding(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Sprint
            </Button>
          )}
        </div>
      </CardContent>
      <div
        className="w-full h-2 cursor-ns-resize absolute bottom-0 left-0 z-10"
        onMouseDown={handleResizeMouseDown}
        title="Drag to resize card height"
      />
    </Card>
  );
}
