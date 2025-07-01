// Author: Kushal Sharma
"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Task, TaskCategory, Contact } from "@/types";
import TaskItem from "./TaskItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X, Eye, EyeOff } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUIStore } from "@/hooks/useUIStore";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";


interface TaskListProps {
  category: TaskCategory;
  title: string;
  tasks: Task[];
  contacts: Contact[];
  icon: React.ReactNode;
  addTask: (category: TaskCategory, text: string) => void;
  toggleTask: (category: TaskCategory, taskId: string) => void;
  deleteTask: (category: TaskCategory, taskId: string) => void;
  updateTask: (category: TaskCategory, taskId: string, updates: Partial<Task>) => void;
  showCheckbox?: boolean;
  includedTasksConfig?: {
    title: string;
    tasks: Task[];
    category: TaskCategory;
  }[];
  focusedTaskId?: string | null;
  view: "overview" | TaskCategory;
}

export default function TaskList({
  category,
  title,
  tasks,
  contacts,
  icon,
  addTask,
  toggleTask,
  deleteTask,
  updateTask,
  showCheckbox = true,
  includedTasksConfig,
  focusedTaskId,
  view
}: TaskListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskText, setNewTaskText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [showIncluded, setShowIncluded] = useState(false);

  const [ownerFilter, setOwnerFilter] = useState('all');
  const [hideCompleted, setHideCompleted] = useState(false);

  const { cardHeight, setCardHeight, showProgress, showFilters } = useUIStore();
  const [isResizing, setIsResizing] = useState(false);
  const [canScroll, setCanScroll] = useState(false);
  const scrollAreaViewportRef = useRef<HTMLDivElement>(null);

  const { setNodeRef, isOver } = useDroppable({
    id: category,
  });

  useEffect(() => {
    if (isAdding) {
      inputRef.current?.focus();
    }
  }, [isAdding]);

  const handleAddTask = () => {
    if (newTaskText.trim()) {
      addTask(category, newTaskText);
      setNewTaskText("");
      setIsAdding(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddTask();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewTaskText("");
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

  const uniqueOwners = useMemo(() => {
    const owners = new Set<string>();
    tasks.forEach(task => owners.add(task.owner));
    contacts.forEach(contact => owners.add(contact.name));
    return ['all', ...Array.from(owners).sort()];
  }, [tasks, contacts]);
  
  const filteredByOwnerTasks = useMemo(() => {
      if (ownerFilter === 'all') return tasks;
      return tasks.filter(task => task.owner === ownerFilter);
  }, [tasks, ownerFilter]);

  const visibleTasks = useMemo(() => {
    if (!hideCompleted) return filteredByOwnerTasks;
    return filteredByOwnerTasks.filter(task => !task.completed);
  }, [filteredByOwnerTasks, hideCompleted]);

  const progress = useMemo(() => {
    if (filteredByOwnerTasks.length === 0) return 0;
    const completedCount = filteredByOwnerTasks.filter(t => t.completed).length;
    return (completedCount / filteredByOwnerTasks.length) * 100;
  }, [filteredByOwnerTasks]);
  
  useEffect(() => {
    checkScrollability();
    const element = scrollAreaViewportRef.current;
    if (!element) return;
    
    const resizeObserver = new ResizeObserver(checkScrollability);
    resizeObserver.observe(element);
    
    return () => resizeObserver.disconnect();
  }, [visibleTasks, cardHeight, checkScrollability, showIncluded]);

  const hasIncludedTasks = includedTasksConfig && includedTasksConfig.length > 0;

  return (
    <Card
      ref={setNodeRef}
      id={`tasklist-card-${category}`}
      data-testid={`tasklist-${category}`}
      className={cn(
        "relative flex flex-col h-full shadow-md hover:shadow-xl transition-all duration-300",
        isResizing ? 'select-none' : '',
        isOver ? 'border-primary ring-2 ring-primary' : ''
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <CardHeader className="p-4 flex flex-col gap-4">
        <div className="flex flex-row items-start justify-between">
            <CardTitle className="flex items-center gap-3 text-xl font-semibold">
              {icon}
              {title}
            </CardTitle>
            {hasIncludedTasks && (
               <div className="flex items-center space-x-2">
                <Label htmlFor={`show-all-${category}`} className="text-sm font-normal">Show All</Label>
                <Switch id={`show-all-${category}`} checked={showIncluded} onCheckedChange={setShowIncluded}/>
              </div>
            )}
        </div>
        
        {tasks.length > 0 && showCheckbox && (
            <div className="space-y-3">
                 {showProgress && (
                    <div className="px-1">
                        <Progress value={progress} className="h-1" />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>{Math.round(progress)}%</span>
                            <span>{filteredByOwnerTasks.filter(t=>t.completed).length} / {filteredByOwnerTasks.length} done</span>
                        </div>
                    </div>
                 )}
                 {showFilters && (
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                            <SelectTrigger className="w-full sm:w-[180px] h-9">
                                <SelectValue placeholder="Filter by owner..." />
                            </SelectTrigger>
                            <SelectContent>
                                {uniqueOwners.map(owner => (
                                    <SelectItem key={owner} value={owner}>
                                        {owner === 'all' ? 'All Owners' : owner}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setHideCompleted(!hideCompleted)}
                                    className={cn("h-9 w-9 shrink-0", hideCompleted && "bg-accent text-accent-foreground")}
                                >
                                    {hideCompleted ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{hideCompleted ? "Show completed tasks" : "Hide completed tasks"}</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                 )}
            </div>
        )}
      </CardHeader>
      <CardContent className="flex-grow flex flex-col gap-4 p-4 pt-0">
        <SortableContext items={visibleTasks.map(t => t.id)} id={category}>
          <ScrollArea 
            className="flex-grow pr-4 -mr-4"
            style={{ height: `${cardHeight}px` }}
            viewportRef={scrollAreaViewportRef}
          >
              <div className="space-y-1">
                {tasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No tasks yet. Add one!</p>
                ) : visibleTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No tasks match your filters.</p>
                ) : (
                  visibleTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      contacts={contacts}
                      isFocused={task.id === focusedTaskId}
                      onToggle={() => toggleTask(category, task.id)}
                      onDelete={() => deleteTask(category, task.id)}
                      onUpdate={(updates) => updateTask(category, task.id, updates)}
                      showCheckbox={showCheckbox}
                    />
                  ))
                )}
                
                {showIncluded && hasIncludedTasks && (
                    <Accordion type="multiple" className="w-full pt-4 mt-4 border-t">
                      {includedTasksConfig.map(config => {
                          const visibleIncludedTasks = hideCompleted ? config.tasks.filter(t => !t.completed) : config.tasks;
                          if (visibleIncludedTasks.length === 0) return null;

                          return (
                            <AccordionItem value={config.title} key={config.title}>
                              <AccordionTrigger className="text-sm font-medium hover:no-underline">
                                {config.title} ({visibleIncludedTasks.length})
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-1 pl-2 border-l-2">
                                  {visibleIncludedTasks.map(task => (
                                    <TaskItem
                                      key={task.id}
                                      task={task}
                                      contacts={contacts}
                                      isFocused={task.id === focusedTaskId}
                                      onToggle={() => toggleTask(config.category, task.id)}
                                      onDelete={() => deleteTask(config.category, task.id)}
                                      onUpdate={(updates) => updateTask(config.category, task.id, updates)}
                                      showCheckbox={showCheckbox}
                                    />
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                      })}
                    </Accordion>
                )}
              </div>
          </ScrollArea>
        </SortableContext>
        <div 
          className="mt-auto pt-4 border-t"
          data-scrollable={canScroll}
        >
          {isAdding ? (
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                type="text"
                placeholder="Enter new task..."
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="bg-card"
              />
              <Button size="icon" onClick={handleAddTask} disabled={!newTaskText.trim()}>
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
              id={`add-task-btn-${category}`}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Task
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
