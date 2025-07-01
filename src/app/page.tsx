// Author: Kushal Sharma
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/actionflow/Header";
import TaskList from "@/components/actionflow/TaskList";
import { useActionFlowStore } from "@/hooks/useActionFlowStore";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sun, Calendar, Zap, ListChecks, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO, isToday } from "date-fns";
import type { Task, TaskCategory } from "@/types";
import ChatAssistant from "@/components/actionflow/ChatAssistant";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useWalkthroughStore } from "@/hooks/useWalkthroughStore";


export default function Home() {
  const {
    state,
    isLoaded,
    loadState,
    addTask,
    toggleTask,
    deleteTask,
    updateTask,
    setActiveSprint,
    updateSprintDates,
    addDefaultTasksForDate,
    exportToCsv,
    moveTask,
    reorderTask
  } = useActionFlowStore(s => ({ state: s, ...s }));

  const router = useRouter();
  const [view, setView] = useState<"overview" | TaskCategory>("overview");
  const [dailyDate, setDailyDate] = useState<Date | undefined>(new Date());
  const [weeklyDate, setWeeklyDate] = useState<Date | undefined>(new Date());
  const [selectedSprintName, setSelectedSprintName] = useState<string>('');

  // Keyboard navigation state
  const [focusedTask, setFocusedTask] = useState<{ category: TaskCategory, id: string } | null>(null);
  const [isJarvisOpen, setIsJarvisOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<{ category: TaskCategory, id: string } | null>(null);
  const isTourActive = useWalkthroughStore(s => s.isActive);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadState();
  }, [loadState]);

  useEffect(() => {
    if (isLoaded && state.activeSprintName) {
      setSelectedSprintName(state.activeSprintName);
    }
  }, [isLoaded, state.activeSprintName]);
  
  useEffect(() => {
    if (isLoaded) {
      setSelectedSprintName(state.activeSprintName);
    }
  }, [isLoaded, state.activeSprintName])

  useEffect(() => {
    if (isLoaded && dailyDate && addDefaultTasksForDate) {
      addDefaultTasksForDate(dailyDate, 'daily');
    }
  }, [isLoaded, dailyDate, addDefaultTasksForDate]);

  useEffect(() => {
    if (isLoaded && weeklyDate && addDefaultTasksForDate) {
      addDefaultTasksForDate(weeklyDate, 'weekly');
    }
  }, [isLoaded, weeklyDate, addDefaultTasksForDate]);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const selectedDateStr = dailyDate ? format(dailyDate, "yyyy-MM-dd") : "";
  const startOfCurrentWeekStr = format(startOfWeek(new Date(), { weekStartsOn: 0 }), "yyyy-MM-dd");
  const startOfSelectedWeek = weeklyDate ? startOfWeek(weeklyDate, { weekStartsOn: 0 }) : new Date();
  const endOfSelectedWeek = weeklyDate ? endOfWeek(weeklyDate, { weekStartsOn: 0 }) : new Date();
  const startOfSelectedWeekStr = format(startOfSelectedWeek, 'yyyy-MM-dd');

  const dailyTasksForToday = state.dailyTasks.filter(t => t.date === todayStr);
  const weeklyTasksForThisWeek = state.weeklyTasks.filter(t => t.date === startOfCurrentWeekStr);
  
  const dailyTasksForPicker = state.dailyTasks.filter(t => t.date === selectedDateStr);
  const weeklyTasksForPicker = state.weeklyTasks.filter(t => {
      if (!t.date) return false;
      const taskWeekStart = format(startOfWeek(parseISO(t.date), { weekStartsOn: 0 }), 'yyyy-MM-dd');
      return taskWeekStart === startOfSelectedWeekStr;
  });
  
  const activeSprintTasks = state.sprintTasks.filter(t => t.sprint === state.activeSprintName);
  const tasksForSprintInView = state.sprintTasks.filter(t => t.sprint === selectedSprintName);
  const sprintInView = state.sprints.find(s => s.name === selectedSprintName);

  const visibleTasksMap = useMemo(() => ({
    overview: [
        ...dailyTasksForToday.map(t => ({...t, category: 'daily' as TaskCategory})),
        ...weeklyTasksForThisWeek.map(t => ({...t, category: 'weekly' as TaskCategory})),
        ...activeSprintTasks.map(t => ({...t, category: 'sprint' as TaskCategory})),
        ...state.miscTasks.map(t => ({...t, category: 'misc' as TaskCategory}))
    ],
    daily: dailyTasksForPicker.map(t => ({...t, category: 'daily' as TaskCategory})),
    weekly: weeklyTasksForPicker.map(t => ({...t, category: 'weekly' as TaskCategory})),
    sprint: tasksForSprintInView.map(t => ({...t, category: 'sprint' as TaskCategory})),
    misc: state.miscTasks.map(t => ({...t, category: 'misc' as TaskCategory}))
  }), [dailyTasksForToday, weeklyTasksForThisWeek, activeSprintTasks, state.miscTasks, dailyTasksForPicker, weeklyTasksForPicker, tasksForSprintInView]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') target.blur();
        return;
      }

      if (e.altKey) {
        e.preventDefault();
        if (e.key >= '1' && e.key <= '5') {
            const views: ("overview" | TaskCategory)[] = ['overview', 'daily', 'weekly', 'sprint', 'misc'];
            setView(views[parseInt(e.key, 10) - 1]);
            setFocusedTask(null);
        }
        if (e.key.toLowerCase() === 's') router.push('/settings');
        if (e.key.toLowerCase() === 'j') setIsJarvisOpen(prev => !prev);
        return;
      }
      
      if (e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        let categoryToAddTo: TaskCategory | null = view === 'overview' ? 'daily' : view;
        if(categoryToAddTo) {
            const button = document.getElementById(`add-task-btn-${categoryToAddTo}`);
            button?.click();
        }
        return;
      }
      
      if (focusedTask) {
        if (e.key === ' ') {
          e.preventDefault();
          toggleTask(focusedTask.category, focusedTask.id);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          document.getElementById(focusedTask.id)?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
          setFocusedTask(null);
        } else if (e.key === 'Delete') {
          e.preventDefault();
          setTaskToDelete(focusedTask);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setFocusedTask(null);
        }
      }

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const currentTasks = visibleTasksMap[view] || [];
        if (currentTasks.length === 0) return;

        const currentIndex = focusedTask ? currentTasks.findIndex(t => t.id === focusedTask.id) : -1;
        let nextIndex;

        if (e.key === 'ArrowDown') {
          nextIndex = currentIndex === -1 ? 0 : Math.min(currentIndex + 1, currentTasks.length - 1);
        } else { // ArrowUp
          nextIndex = currentIndex === -1 ? currentTasks.length - 1 : Math.max(currentIndex - 1, 0);
        }
        
        const nextTask = currentTasks[nextIndex];
        if (nextTask) {
          setFocusedTask({ category: nextTask.category, id: nextTask.id });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedTask, view, router, state, visibleTasksMap]);

  useEffect(() => {
    if (focusedTask) {
        document.getElementById(focusedTask.id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedTask]);


  const handleDragEnd = (event: DragEndEvent) => {
    setFocusedTask(null); // Unfocus on any drag operation
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;
    
    const sourceCategory = active.data.current?.sortable.containerId as TaskCategory;
    const destinationCategory = (over.data.current?.sortable?.containerId || over.id) as TaskCategory;

    const taskCategories: TaskCategory[] = ['daily', 'weekly', 'sprint', 'misc'];
    if (!taskCategories.includes(sourceCategory) || !taskCategories.includes(destinationCategory)) {
        return;
    }

    if (sourceCategory === destinationCategory) {
        const taskList = state[`${sourceCategory}Tasks`];
        const oldIndex = taskList.findIndex(t => t.id === activeId);
        const newIndex = taskList.findIndex(t => t.id === overId);
        if (oldIndex !== -1 && newIndex !== -1) reorderTask(sourceCategory, oldIndex, newIndex);
    } else {
        const destList = state[`${destinationCategory}Tasks`];
        const newIndex = over.data.current?.sortable ? destList.findIndex(t => t.id === overId) : destList.length;
        const finalNewIndex = newIndex === -1 ? destList.length : newIndex;
        moveTask(activeId, sourceCategory, destinationCategory, finalNewIndex);
    }
  };

  const handleDeleteConfirm = () => {
    if (taskToDelete) {
        deleteTask(taskToDelete.category, taskToDelete.id);
        setTaskToDelete(null);
        setFocusedTask(null);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-screen-2xl mx-auto p-4 sm:p-6 lg:p-8">
          <Skeleton className="h-12 w-1/3 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-8 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-6 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const renderTaskList = (
    category: TaskCategory, 
    title: string, 
    tasks: Task[], 
    icon: React.ReactNode, 
    options?: { date?: string, sprint?: string }, 
    showCheckbox = true,
    includedTasksConfig?: { title: string, tasks: Task[], category: TaskCategory }[]
  ) => (
    <TaskList
      category={category}
      title={title}
      tasks={tasks}
      contacts={state.contacts}
      addTask={(cat, text) => addTask(cat, text, options)}
      toggleTask={toggleTask}
      deleteTask={deleteTask}
      updateTask={updateTask}
      icon={icon}
      showCheckbox={showCheckbox}
      includedTasksConfig={includedTasksConfig}
      focusedTaskId={focusedTask?.category === category ? focusedTask.id : null}
      view={view}
    />
  );
  
  return (
    <main className="min-h-screen bg-background font-sans text-foreground flex flex-col" onClick={() => setFocusedTask(null)}>
      <div className="flex-grow">
        <TooltipProvider>
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8" onClick={(e) => e.stopPropagation()}>
            <Header
              sprints={state.sprints}
              activeSprintName={state.activeSprintName}
              setActiveSprint={setActiveSprint}
              exportToCsv={exportToCsv}
            />
            
            <Tabs value={view} onValueChange={(v) => { setView(v as any); setFocusedTask(null); }} className="w-full">
              <TabsList id="main-tabs-list" className="grid w-full grid-cols-5 mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="daily">Today</TabsTrigger>
                <TabsTrigger value="weekly">This Week</TabsTrigger>
                <TabsTrigger value="sprint">Sprint</TabsTrigger>
                <TabsTrigger value="misc">Misc</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview">
                <DndContext sensors={sensors} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
                  <div id="overview-checklists" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {renderTaskList("daily", "Today's Checklist", dailyTasksForToday, <Sun className="w-6 h-6 text-primary" />, { date: todayStr })}
                    {renderTaskList("weekly", "This Week's Checklist", weeklyTasksForThisWeek, <Calendar className="w-6 h-6 text-primary" />, { date: startOfCurrentWeekStr })}
                    {renderTaskList("sprint", "Active Sprint Checklist", activeSprintTasks, <Zap className="w-6 h-6 text-primary" />, { sprint: state.activeSprintName })}
                    {renderTaskList("misc", "Miscellaneous Tasks", state.miscTasks, <ListChecks className="w-6 h-6 text-primary" />, { date: todayStr })}
                  </div>
                </DndContext>
              </TabsContent>

              <TabsContent value="daily">
                <div className="flex justify-center mb-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant={"outline"} className="w-[280px] justify-start text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4" />
                        {dailyDate ? format(dailyDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarPicker mode="single" selected={dailyDate} onSelect={(d) => { setDailyDate(d); setFocusedTask(null); }} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="max-w-3xl mx-auto">
                  {renderTaskList("daily", dailyDate && isToday(dailyDate) ? "Today's Tasks" : `Tasks for ${format(dailyDate || new Date(), "PPP")}`, dailyTasksForPicker, <Sun className="w-6 h-6 text-primary" />, { date: selectedDateStr })}
                </div>
              </TabsContent>

              <TabsContent value="weekly">
                <div className="flex justify-center mb-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant={"outline"} className="w-[280px] justify-start text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4" />
                        {weeklyDate ? `Week of ${format(startOfSelectedWeek, "PPP")}` : <span>Pick a week</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarPicker mode="single" selected={weeklyDate} onSelect={(d) => { setWeeklyDate(d); setFocusedTask(null); }} showOutsideDays={false} weekStartsOn={0} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="max-w-3xl mx-auto">
                  {renderTaskList(
                    "weekly", 
                    startOfSelectedWeekStr === startOfCurrentWeekStr ? "This Week's Tasks" : `Tasks for week of ${format(startOfSelectedWeek, "MMM do")}`, 
                    weeklyTasksForPicker, 
                    <Calendar className="w-6 h-6 text-primary" />, 
                    { date: startOfSelectedWeekStr },
                    true,
                    [
                      { title: "Today's Tasks", tasks: state.dailyTasks.filter(t => t.date && isWithinInterval(parseISO(t.date), { start: startOfSelectedWeek, end: endOfSelectedWeek })), category: 'daily' }
                    ]
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="sprint">
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-4">
                    <div id="sprint-view-selector" className="w-full max-w-sm">
                        <Select value={selectedSprintName} onValueChange={(s) => { setSelectedSprintName(s); setFocusedTask(null); }}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a sprint to view" />
                            </SelectTrigger>
                            <SelectContent>
                                {state.sprints.length > 0 ? (
                                  state.sprints.map(sprint => (
                                      <SelectItem key={sprint.name} value={sprint.name}>{sprint.name}</SelectItem>
                                  ))
                                ) : (
                                  <div className="p-4 text-center text-sm text-muted-foreground">No sprints defined.</div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                 <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Start:</span>
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button variant={"outline"} className="w-[240px] justify-start text-left font-normal" disabled={!sprintInView}>
                                <Calendar className="mr-2 h-4 w-4" />
                                {sprintInView?.startDate ? format(parseISO(sprintInView.startDate), "PPP") : <span>Pick a start date</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                            <CalendarPicker 
                                mode="single" 
                                selected={sprintInView?.startDate ? parseISO(sprintInView.startDate) : undefined} 
                                onSelect={(date) => date && updateSprintDates(selectedSprintName, format(date, 'yyyy-MM-dd'))} 
                                initialFocus 
                            />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">End:</span>
                         <Popover>
                            <PopoverTrigger asChild>
                            <Button variant={"outline"} className="w-[240px] justify-start text-left font-normal" disabled={!sprintInView}>
                                <Calendar className="mr-2 h-4 w-4" />
                                {sprintInView?.endDate ? format(parseISO(sprintInView.endDate), "PPP") : <span>Pick an end date</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                            <CalendarPicker 
                                mode="single" 
                                selected={sprintInView?.endDate ? parseISO(sprintInView.endDate) : undefined} 
                                onSelect={(date) => date && updateSprintDates(selectedSprintName, undefined, format(date, 'yyyy-MM-dd'))} 
                                initialFocus 
                            />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
                <div className="max-w-3xl mx-auto">
                  {renderTaskList(
                    "sprint",
                    sprintInView ? `Tasks for ${selectedSprintName}` : 'Select a Sprint', 
                    tasksForSprintInView, 
                    <Zap className="w-6 h-6 text-primary" />, 
                    { sprint: selectedSprintName },
                    true,
                    sprintInView && sprintInView.startDate && sprintInView.endDate ? [
                      { title: "Today's Tasks", tasks: state.dailyTasks.filter(t => t.date && isWithinInterval(parseISO(t.date), { start: parseISO(sprintInView.startDate!), end: parseISO(sprintInView.endDate!) })), category: 'daily' },
                      { title: "This Week's Tasks", tasks: state.weeklyTasks.filter(t => t.date && isWithinInterval(parseISO(t.date), { start: parseISO(sprintInView.startDate!), end: parseISO(sprintInView.endDate!) })), category: 'weekly' }
                    ] : []
                  )}
                </div>
              </TabsContent>

              <TabsContent value="misc">
                 <div className="max-w-3xl mx-auto">
                  {renderTaskList("misc", "Miscellaneous Tasks", state.miscTasks, <ListChecks className="w-6 h-6 text-primary" />, { date: todayStr })}
                </div>
              </TabsContent>

            </Tabs>
          </div>
          <ChatAssistant isOpen={isJarvisOpen} onOpenChange={setIsJarvisOpen} isTourActive={isTourActive} />
        </TooltipProvider>

        <AlertDialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive"/>Delete Task</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this task? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setTaskToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <footer className="text-center text-xs text-muted-foreground py-4">
        Created by: Kushal Sharma
      </footer>
    </main>
  );
}
