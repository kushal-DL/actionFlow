// Author: Kushal Sharma
"use client";

import { create } from 'zustand';
import type { Task, TaskCategory, TaskStoreState, Contact, Sprint } from '@/types';
import { toast } from "@/hooks/use-toast";
import { format, startOfWeek, addDays, startOfToday } from 'date-fns';

const defaultState: TaskStoreState = {
  activeSprintName: '',
  sprints: [],
  dailyTasks: [],
  weeklyTasks: [],
  sprintTasks: [],
  miscTasks: [],
  contacts: [],
  myContactId: null,
  defaultDailyTasks: [],
  defaultWeeklyTasks: [],
  defaultSprintTasks: [],
};

// The state managed by the undo/redo history
type HistoryState = Omit<TaskStoreState, 'isLoaded'>;

interface ActionFlowState extends TaskStoreState {
  isLoaded: boolean;
  past: HistoryState[];
  future: HistoryState[];
  loadState: () => Promise<void>;
  addTask: (category: TaskCategory, text: string, options?: Partial<Task>) => void;
  toggleTask: (category: TaskCategory, taskId: string) => void;
  deleteTask: (category: TaskCategory, taskId: string) => void;
  deleteTasks: (tasksToDelete: { id: string, category: TaskCategory }[]) => void;
  updateTask: (category: TaskCategory, taskId: string, updates: Partial<Task>) => void;
  completeTasks: (tasksToComplete: { id: string, category: TaskCategory }[]) => void;
  moveTask: (taskId: string, sourceCategory: TaskCategory, destinationCategory: TaskCategory, destinationIndex: number) => void;
  reorderTask: (category: TaskCategory, oldIndex: number, newIndex: number) => void;
  addContact: (name: string, email: string) => void;
  updateContact: (contactId: string, updates: Partial<Contact>) => void;
  deleteContact: (contactId: string) => void;
  addSprint: (name: string) => void;
  deleteSprint: (sprintName: string) => void;
  setActiveSprint: (sprintName: string) => void;
  updateSprintDates: (sprintName: string, startDate?: string, endDate?: string) => void;
  clearActiveSprintTasks: () => void;
  resetApplicationData: () => void;
  addDefaultTasksForDate: (date: Date, category: 'daily' | 'weekly') => void;
  exportToCsv: () => void;
  setMyContact: (contactId: string) => void;
  undo: () => void;
  redo: () => void;
}

const _saveState = async (state: TaskStoreState) => {
  try {
    const stateToSave = { ...state };
    // Don't persist isLoaded or history flags
    const { isLoaded, past, future, ...rest } = stateToSave as any;
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rest),
    });
  } catch (error) {
    console.error("Failed to save state to server", error);
    // Toast is not available here, but we can log it.
  }
};

const categoryDisplayMap: Record<string, string> = {
  daily: 'Today',
  weekly: 'This Week',
  sprint: 'Sprint',
  misc: 'Misc',
};

export const useActionFlowStore = create<ActionFlowState>()((set, get) => {
  const _saveToHistory = () => {
    const { past, future, isLoaded, ...currentState } = get();
    const newPast = [...past, currentState];
    set({ past: newPast.slice(-20), future: [] }); // Limit history to last 20 states
  };

  return {
    ...defaultState,
    isLoaded: false,
    past: [],
    future: [],
  
    loadState: async () => {
      if (get().isLoaded) return;
      try {
        const response = await fetch('/api/tasks');
        if (!response.ok) throw new Error('Failed to fetch tasks');
        let storedState = await response.json();

        const today = startOfToday();
        const todayFormatted = format(today, 'yyyy-MM-dd');
        const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 0 });
        const startOfCurrentWeekFormatted = format(startOfCurrentWeek, 'yyyy-MM-dd');
        
        const hasTasksForToday = storedState.dailyTasks.some((task: Task) => task.date === todayFormatted);
        if (!hasTasksForToday && storedState.defaultDailyTasks.length > 0) {
            const newDefaultDailyTasks = storedState.defaultDailyTasks.map((task: Task) => ({ ...task, id: `daily-${Date.now()}-${Math.random()}`, date: todayFormatted, completed: false }));
            storedState.dailyTasks.push(...newDefaultDailyTasks);
        }

        const hasTasksForThisWeek = storedState.weeklyTasks.some((task: Task) => task.date === startOfCurrentWeekFormatted);
        if (!hasTasksForThisWeek && storedState.defaultWeeklyTasks.length > 0) {
            const newDefaultWeeklyTasks = storedState.defaultWeeklyTasks.map((task: Task) => ({...task, id: `weekly-${Date.now()}-${Math.random()}`, date: startOfCurrentWeekFormatted, completed: false}));
            storedState.weeklyTasks.push(...newDefaultWeeklyTasks);
        }
        set({ ...storedState, isLoaded: true, past: [], future: [] });
      } catch (error) {
        console.error("Failed to load state from server, using default", error);
        set({ ...defaultState, isLoaded: true, past: [], future: [] });
      }
    },

    addTask: (category: TaskCategory, text: string, options?: Partial<Task>) => {
      _saveToHistory();
      if (!text.trim()) return;
      const state = get();
      const myContact = state.contacts.find(c => c.id === state.myContactId);
      const defaultOwner = myContact?.name || state.contacts[0]?.name || 'Unassigned';
      
      const categoryKey = `${category}Tasks` as keyof TaskStoreState;
      const newTask: Task = {
        id: options?.id || `${category}-${Date.now()}-${Math.random()}`,
        text: text.trim(),
        completed: options?.completed || false,
        owner: options?.owner || defaultOwner,
      };
      if (!category.startsWith('default')) {
          if (category === 'sprint') {
              newTask.sprint = options?.sprint || state.activeSprintName;
          } else {
              newTask.date = options?.date || format(new Date(), 'yyyy-MM-dd');
          }
      }
      const newState = { ...state, [categoryKey]: [...(state[categoryKey] as Task[]), newTask] };
      set({ [categoryKey]: [...(state[categoryKey] as Task[]), newTask] });
      _saveState(get());
    },

    toggleTask: (category: TaskCategory, taskId: string) => {
      _saveToHistory();
      const categoryKey = `${category}Tasks` as keyof TaskStoreState;
      set(state => {
        const newState = {
          ...state,
          [categoryKey]: (state[categoryKey] as Task[]).map(task =>
            task.id === taskId ? { ...task, completed: !task.completed } : task
          ),
        };
        _saveState(newState);
        return newState;
      });
    },
    
    deleteTask: (category: TaskCategory, taskId: string) => {
      _saveToHistory();
      const categoryKey = `${category}Tasks` as keyof TaskStoreState;
      set(state => {
        const newState = {
          ...state,
          [categoryKey]: (state[categoryKey] as Task[]).filter(task => task.id !== taskId),
        };
        _saveState(newState);
        return newState;
      });
    },

    deleteTasks: (tasksToDelete: { id: string, category: TaskCategory }[]) => {
      if (tasksToDelete.length === 0) return;
      _saveToHistory();
      set(state => {
        const newState = { ...state };
        const tasksToDeleteMap = new Map<TaskCategory, Set<string>>();
        for (const task of tasksToDelete) {
          if (!tasksToDeleteMap.has(task.category)) {
            tasksToDeleteMap.set(task.category, new Set());
          }
          tasksToDeleteMap.get(task.category)!.add(task.id);
        }
        for (const [category, idsToDelete] of tasksToDeleteMap.entries()) {
          const categoryKey = `${category}Tasks` as keyof TaskStoreState;
          const taskList = newState[categoryKey] as Task[] | undefined;
          if (taskList) {
            (newState as any)[categoryKey] = taskList.filter(t => !idsToDelete.has(t.id));
          }
        }
        _saveState(newState);
        toast({ title: 'Tasks Deleted', description: `Successfully deleted ${tasksToDelete.length} task(s).` });
        return newState;
      });
    },

    updateTask: (category: TaskCategory, taskId: string, updates: Partial<Task>) => {
      _saveToHistory();
      set(state => {
        const newState = { ...state };
        const ownerUpdate = updates.owner?.trim();
        if (ownerUpdate) {
          const ownerExists = newState.contacts.some(c => c.name.toLowerCase() === ownerUpdate.toLowerCase());
          if (!ownerExists) {
            const newContact: Contact = {
              id: `contact-${Date.now()}-${Math.random()}`,
              name: ownerUpdate,
              email: '',
            };
            newState.contacts = [...newState.contacts, newContact];
          }
        }
        const categoryKey = `${category}Tasks` as keyof TaskStoreState;
        newState[categoryKey] = (newState[categoryKey] as Task[]).map(task =>
          task.id === taskId ? { ...task, ...updates } : task
        );
        _saveState(newState);
        return newState;
      });
    },

    completeTasks: (tasksToComplete: { id: string, category: TaskCategory }[]) => {
      if (tasksToComplete.length === 0) return;
      _saveToHistory();
      set(state => {
        const newState = { ...state };
        let updatedCount = 0;
        const tasksToCompleteMap = new Map<TaskCategory, Set<string>>();
        for (const task of tasksToComplete) {
            if (!tasksToCompleteMap.has(task.category)) {
                tasksToCompleteMap.set(task.category, new Set());
            }
            tasksToCompleteMap.get(task.category)!.add(task.id);
        }
        for (const [category, idsToComplete] of tasksToCompleteMap.entries()) {
            const categoryKey = `${category}Tasks` as keyof TaskStoreState;
            const taskList = newState[categoryKey] as Task[] | undefined;
            if (taskList) {
                (newState as any)[categoryKey] = taskList.map(task => {
                    if (idsToComplete.has(task.id) && !task.completed) {
                        updatedCount++;
                        return { ...task, completed: true };
                    }
                    return task;
                });
            }
        }
        if (updatedCount > 0) {
            _saveState(newState);
            toast({ title: 'Tasks Updated', description: `Successfully marked ${updatedCount} task(s) as complete.` });
        } else {
            toast({ title: 'No Changes', description: 'Selected tasks may have already been complete.' });
        }
        return newState;
      });
    },

    reorderTask: (category: TaskCategory, oldIndex: number, newIndex: number) => {
      _saveToHistory();
      set(state => {
          const categoryKey = `${category}Tasks` as const;
          const list = state[categoryKey] as Task[];
          if (!list || oldIndex < 0 || newIndex < 0 || oldIndex >= list.length || newIndex >= list.length) {
              return state;
          }
          const newList = [...list];
          const [movedItem] = newList.splice(oldIndex, 1);
          newList.splice(newIndex, 0, movedItem);
          const newState = { ...state, [categoryKey]: newList };
          _saveState(newState);
          return newState;
      });
    },

    moveTask: (taskId: string, sourceCategory: TaskCategory, destinationCategory: TaskCategory, destinationIndex: number) => {
      _saveToHistory();
      set(state => {
        const sourceKey = `${sourceCategory}Tasks` as const;
        const destinationKey = `${destinationCategory}Tasks` as const;
        const sourceList = state[sourceKey] as Task[];
        const taskToMove = sourceList.find(t => t.id === taskId);
        if (!taskToMove) return state;
        const newSourceList = sourceList.filter(t => t.id !== taskId);
        const updatedTask = { ...taskToMove };
        delete updatedTask.date;
        delete updatedTask.sprint;
        if (destinationCategory === 'daily' || destinationCategory === 'misc') updatedTask.date = format(new Date(), 'yyyy-MM-dd');
        else if (destinationCategory === 'weekly') updatedTask.date = format(startOfWeek(new Date(), { weekStartsOn: 0 }), "yyyy-MM-dd");
        else if (destinationCategory === 'sprint') updatedTask.sprint = state.activeSprintName;
        const newDestinationList = [...(state[destinationKey] as Task[])];
        newDestinationList.splice(destinationIndex, 0, updatedTask);
        const destDisplayName = categoryDisplayMap[destinationCategory as keyof typeof categoryDisplayMap] || destinationCategory;
        const newState = { ...state, [sourceKey]: newSourceList, [destinationKey]: newDestinationList };
        _saveState(newState);
        toast({ title: "Task Moved", description: `Task moved to ${destDisplayName} checklist.` });
        return newState;
      });
    },
    
    addContact: (name: string, email: string) => {
      _saveToHistory();
      if (!name.trim()) return;
      const newContact: Contact = { id: `contact-${Date.now()}-${Math.random()}`, name, email };
      set(state => {
        const newState = { ...state, contacts: [...state.contacts, newContact] };
        _saveState(newState);
        return newState;
      });
    },
    
    updateContact: (contactId: string, updates: Partial<Contact>) => {
      _saveToHistory();
      set(state => {
        const originalContact = state.contacts.find(c => c.id === contactId);
        if (!originalContact) return state;
        const oldName = originalContact.name;
        const newName = updates.name;
        const newState = { ...state };
        newState.contacts = state.contacts.map(c => c.id === contactId ? { ...c, ...updates } : c);
        if (newName && newName.trim() && oldName !== newName) {
          const updateTaskOwners = (tasks: Task[]): Task[] => tasks.map(task => task.owner === oldName ? { ...task, owner: newName } : task);
          newState.dailyTasks = updateTaskOwners(state.dailyTasks);
          newState.weeklyTasks = updateTaskOwners(state.weeklyTasks);
          newState.sprintTasks = updateTaskOwners(state.sprintTasks);
          newState.miscTasks = updateTaskOwners(state.miscTasks);
          newState.defaultDailyTasks = updateTaskOwners(state.defaultDailyTasks);
          newState.defaultWeeklyTasks = updateTaskOwners(state.defaultWeeklyTasks);
          newState.defaultSprintTasks = updateTaskOwners(state.defaultSprintTasks);
        }
        _saveState(newState);
        return newState;
      });
    },

    deleteContact: (contactId: string) => {
      _saveToHistory();
      set(state => {
        const contactToDelete = state.contacts.find(c => c.id === contactId);
        if (!contactToDelete) return state;
        const isDeletingMyContact = state.myContactId === contactId;
        const myContact = state.contacts.find(c => c.id === state.myContactId);
        const reassignmentOwner = !isDeletingMyContact && myContact ? myContact.name : '';
        const reassignTasks = (tasks: Task[]): Task[] => tasks.map(task => task.owner === contactToDelete.name ? { ...task, owner: reassignmentOwner } : task);
        const newState = { ...state };
        newState.dailyTasks = reassignTasks(state.dailyTasks);
        newState.weeklyTasks = reassignTasks(state.weeklyTasks);
        newState.sprintTasks = reassignTasks(state.sprintTasks);
        newState.miscTasks = reassignTasks(state.miscTasks);
        newState.defaultDailyTasks = reassignTasks(state.defaultDailyTasks);
        newState.defaultWeeklyTasks = reassignTasks(state.defaultWeeklyTasks);
        newState.defaultSprintTasks = reassignTasks(state.defaultSprintTasks);
        newState.contacts = state.contacts.filter(c => c.id !== contactId);
        if (isDeletingMyContact) newState.myContactId = null;
        _saveState(newState);
        toast({ title: 'Contact Deleted', description: `Tasks reassigned from ${contactToDelete.name}.` });
        return newState;
      });
    },

    addSprint: (name: string) => {
      _saveToHistory();
      if (!name.trim()) return;
      const state = get();
      const nameExists = state.sprints.some(s => s.name.toLowerCase() === name.trim().toLowerCase());
      if (nameExists) {
          toast({ variant: "destructive", title: "Duplicate Sprint", description: "A sprint with this name already exists." });
          return;
      }
      const today = format(new Date(), 'yyyy-MM-dd');
      const newSprint: Sprint = { name: name.trim(), startDate: today, endDate: format(addDays(new Date(), 13), 'yyyy-MM-dd') };
      const sprints = [...state.sprints, newSprint];
      const activeSprintName = sprints.length === 1 ? newSprint.name : state.activeSprintName;
      set({ sprints, activeSprintName });
      _saveState(get());
      toast({ title: "Sprint Added", description: `"${newSprint.name}" has been created.` });
    },

    deleteSprint: (sprintName: string) => {
      _saveToHistory();
      set(state => {
        const isSprintInUse = state.sprintTasks.some(task => task.sprint === sprintName);
        if (isSprintInUse) {
          toast({ variant: 'destructive', title: 'Cannot Delete Sprint', description: 'This sprint has tasks assigned to it.' });
          return state;
        }
        const newSprints = state.sprints.filter(s => s.name !== sprintName);
        let newActiveSprintName = state.activeSprintName;
        if (state.activeSprintName === sprintName) newActiveSprintName = newSprints[0]?.name || '';
        const newState = { ...state, sprints: newSprints, activeSprintName: newActiveSprintName };
        _saveState(newState);
        toast({ title: 'Sprint Deleted', description: `"${sprintName}" has been removed.` });
        return newState;
      });
    },

    setActiveSprint: (sprintName: string) => {
      _saveToHistory();
      set({ activeSprintName: sprintName });
      _saveState(get());
      toast({ title: "Active Sprint Changed", description: `You are now viewing "${sprintName}".` });
    },

    updateSprintDates: (sprintName: string, startDate?: string, endDate?: string) => {
      _saveToHistory();
      set(state => {
        const newState = { ...state, sprints: state.sprints.map(s => s.name === sprintName ? { ...s, startDate: startDate || s.startDate, endDate: endDate || s.endDate } : s) };
        _saveState(newState);
        return newState;
      });
    },

    clearActiveSprintTasks: () => {
      _saveToHistory();
      set(state => {
        if (!state.activeSprintName) {
          toast({ variant: 'destructive', title: 'No Active Sprint', description: 'There is no active sprint selected.' });
          return state;
        }
        const newState = { ...state, sprintTasks: state.sprintTasks.filter(task => task.sprint !== state.activeSprintName) };
        _saveState(newState);
        toast({ title: 'Sprint Tasks Cleared', description: `All tasks for "${state.activeSprintName}" have been deleted.` });
        return newState;
      });
    },

    resetApplicationData: () => {
      _saveToHistory();
      set({ ...defaultState, isLoaded: true, past: [], future: [] }); // Keep isLoaded true, clear history
      _saveState(defaultState);
      toast({ title: 'Application Reset', description: 'All data has been cleared.' });
    },

    addDefaultTasksForDate: (date: Date, category: 'daily' | 'weekly') => {
      set(state => {
        let newState = { ...state };
        let didChange = false;
        if (category === 'daily') {
          const dateStr = format(date, 'yyyy-MM-dd');
          const hasTasks = state.dailyTasks.some(task => task.date === dateStr);
          if (!hasTasks && state.defaultDailyTasks.length > 0) {
            const newTasks = state.defaultDailyTasks.map(task => ({ ...task, id: `daily-${Date.now()}-${Math.random()}`, date: dateStr, completed: false }));
            newState = { ...state, dailyTasks: [...state.dailyTasks, ...newTasks] };
            didChange = true;
          }
        } else if (category === 'weekly') {
          const startOfWeekDate = startOfWeek(date, { weekStartsOn: 0 });
          const dateStr = format(startOfWeekDate, 'yyyy-MM-dd');
          const hasTasks = state.weeklyTasks.some(task => task.date === dateStr);
          if (!hasTasks && state.defaultWeeklyTasks.length > 0) {
            const newTasks = state.defaultWeeklyTasks.map(task => ({ ...task, id: `weekly-${Date.now()}-${Math.random()}`, date: dateStr, completed: false }));
            newState = { ...state, weeklyTasks: [...state.weeklyTasks, ...newTasks] };
            didChange = true;
          }
        }
        if (didChange) {
          _saveState(newState);
        }
        return newState;
      });
    },

    exportToCsv: () => {
      const { activeSprintName, ...taskLists } = get();
      let csvContent = "data:text/csv;charset=utf-8,Category,Task,Owner,Status,Date,Sprint\n";
      (['dailyTasks', 'weeklyTasks', 'sprintTasks', 'miscTasks'] as const).forEach((key) => {
        const categoryName = key.replace('Tasks', '').replace(/^\w/, c => c.toUpperCase());
        const tasks = taskLists[key] as Task[];
        tasks.forEach(task => {
          const row = [ categoryName, `"${task.text.replace(/"/g, '""')}"`, task.owner, task.completed ? 'Completed' : 'Pending', task.date || '', task.sprint || '' ].join(',');
          csvContent += row + "\n";
        });
      });
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `actionflow_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Export Successful", description: "Your tasks have been exported to a CSV file." });
    },

    setMyContact: (contactId: string) => {
      _saveToHistory();
      set(state => {
        const contact = state.contacts.find(c => c.id === contactId);
        if (contact) {
          const newState = { ...state, myContactId: contactId };
          _saveState(newState);
          toast({ title: "My Contact Set", description: `"${contact.name}" is now the default owner for new tasks.` });
          return newState;
        }
        return state;
      });
    },
    
    undo: () => {
      const { past, future, isLoaded, ...currentState } = get();
      if (past.length === 0) return;
      const previousState = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);
      const newFuture = [currentState, ...future];
      set({ ...previousState, past: newPast, future: newFuture });
      _saveState(get());
      toast({ title: "Undo", description: "Reverted the last action." });
    },

    redo: () => {
      const { past, future, isLoaded, ...currentState } = get();
      if (future.length === 0) return;
      const nextState = future[0];
      const newFuture = future.slice(1);
      const newPast = [...past, currentState];
      set({ ...nextState, past: newPast, future: newFuture });
       _saveState(get());
      toast({ title: "Redo", description: "Restored the undone action." });
    },
  };
});
