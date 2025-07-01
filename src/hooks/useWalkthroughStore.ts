// Author: Kushal Sharma
"use client";

import React from 'react';
import { create } from 'zustand';

export interface TourStep {
  element?: string; // CSS selector for the element to highlight
  title: string;
  content: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  action?: () => void; // Action to take before showing step
}

// Define tour steps here
const tourSteps: TourStep[] = [
  {
    title: 'Welcome to ActionFlow!',
    content: 'This guided tour will walk you through the main features of the application. Click "Next" to begin.',
  },
  {
    element: '#app-header',
    title: 'The Header',
    content: 'Here you can see the app title, export your tasks to a CSV file, reset card heights, and navigate to the Settings page.',
    placement: 'bottom',
  },
  {
    element: '#header-sprint-selector',
    title: 'Active Sprint',
    content: 'This shows your currently active sprint. All tasks added to the "sprint" category will be assigned here. You can change the active sprint at any time.',
    placement: 'bottom',
  },
  {
    element: '#main-tabs-list',
    title: 'Main Views',
    content: 'Switch between different views to focus on your tasks. The Overview shows a summary, while other tabs provide detailed views.',
    placement: 'bottom',
  },
  {
    element: '[data-testid="tasklist-daily"]',
    title: "Today's Checklist",
    content: 'This card on the Overview page shows all tasks you need to complete today.',
    placement: 'right',
  },
  {
    element: '#add-task-btn-daily',
    title: 'Adding a Task',
    content: 'Click here to add a new task. You can also press Shift + A to quickly open the input field.',
    placement: 'top',
  },
  {
    element: '#daily-1',
    title: 'Managing a Task',
    content: React.createElement('div', { className: 'space-y-2 text-sm' },
      React.createElement('p', null,
          React.createElement('span', { className: 'font-semibold' }, 'Click'),
          ' on a task to mark it complete.'
      ),
      React.createElement('p', null,
          React.createElement('span', { className: 'font-semibold' }, 'Double-click'),
          ' to edit its text and owner.'
      ),
      React.createElement('p', null,
          React.createElement('span', { className: 'font-semibold' }, 'Hover'),
          ' over a task to see the edit and delete buttons.'
      )
    ),
    placement: 'right',
  },
  {
    element: '#daily-1',
    title: 'Drag and Drop',
    content: 'You can drag and drop tasks between checklists on the Overview page to quickly re-categorize them. Try dragging this task to another list!',
    placement: 'right',
  },
  {
    element: '#jarvis-trigger-button',
    title: 'Meet Jarvis, Your AI Assistant',
    content: 'Click here or press Alt + J to open the Jarvis chat panel. Jarvis can help you manage your tasks with natural language.',
    placement: 'left',
    action: () => {
      // Close the panel if it's open, so the user has to click
      const jarvisPanel = document.querySelector('[data-testid="jarvis-sheet-content"][data-state="open"]');
      if (jarvisPanel) {
        (document.querySelector('#jarvis-trigger-button') as HTMLElement)?.click();
      }
    }
  },
  {
    element: '#jarvis-controls',
    title: 'Using Jarvis',
    content: 'You can ask Jarvis questions like "What do I have to do today?", create tasks by typing "Jarvis, remind me to...", or use the buttons for summarization and live transcription.',
    placement: 'top',
    action: () => {
      const jarvisPanel = document.querySelector('[data-testid="jarvis-sheet-content"][data-state="open"]');
      if (!jarvisPanel) {
        (document.querySelector('#jarvis-trigger-button') as HTMLElement)?.click();
      }
    }
  },
  {
    element: '#settings-button',
    title: 'Application Settings',
    content: 'Now, let\'s check out the settings page. The tour will continue there.',
    placement: 'left',
    action: () => {
       (document.querySelector('#settings-button')?.closest('a') as HTMLElement)?.click();
    }
  },
  {
    element: '[data-radix-value="defaults"]',
    title: 'Managing Defaults',
    content: 'In Settings, you can manage your default task templates, sprints, and contacts. These save you time by pre-populating your lists.',
    placement: 'bottom',
  },
  {
    element: '[data-radix-value="reset"]',
    title: 'Reset Options',
    content: 'This tab allows you to clear tasks from your active sprint or perform a full factory reset of all application data. Use with caution!',
    placement: 'bottom',
  },
   {
    title: 'Keyboard Shortcuts',
    content: React.createElement('div', { className: 'text-sm' },
      React.createElement('p', { className: 'mb-2' }, 'Boost your productivity with these shortcuts:'),
      React.createElement('ul', { className: 'list-disc pl-5 space-y-1' },
          React.createElement('li', null, React.createElement('span', { className: 'font-semibold' }, 'Alt + 1-5:'), ' Switch views'),
          React.createElement('li', null, React.createElement('span', { className: 'font-semibold' }, 'Shift + A:'), ' Add a new task'),
          React.createElement('li', null, React.createElement('span', { className: 'font-semibold' }, '↑ / ↓ Arrows:'), ' Navigate tasks'),
          React.createElement('li', null, React.createElement('span', { className: 'font-semibold' }, 'Spacebar:'), ' Toggle task completion'),
          React.createElement('li', null, React.createElement('span', { className: 'font-semibold' }, 'Enter:'), ' Edit focused task'),
          React.createElement('li', null, React.createElement('span', { className: 'font-semibold' }, 'Delete:'), ' Delete focused task'),
          React.createElement('li', null, React.createElement('span', { className: 'font-semibold' }, 'Alt + J:'), ' Open/Close Jarvis'),
          React.createElement('li', null, React.createElement('span', { className: 'font-semibold' }, 'Alt + S:'), ' Go to Settings')
      )
    ),
  },
  {
    title: 'Tour Complete!',
    content: 'You\'ve now seen the core features of ActionFlow. Feel free to explore and organize your work. You can restart this tour anytime from the Settings page.',
  },
];


interface WalkthroughState {
  steps: TourStep[];
  currentStepIndex: number;
  isActive: boolean;
  start: () => void;
  end: () => void;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
}

export const useWalkthroughStore = create<WalkthroughState>((set, get) => ({
  steps: tourSteps,
  currentStepIndex: 0,
  isActive: false,
  start: () => set({ isActive: true, currentStepIndex: 0 }),
  end: () => set({ isActive: false }),
  next: () => {
    const { currentStepIndex, steps } = get();
    if (currentStepIndex < steps.length - 1) {
      set({ currentStepIndex: currentStepIndex + 1 });
    } else {
      set({ isActive: false });
    }
  },
  prev: () => {
    const { currentStepIndex } = get();
    if (currentStepIndex > 0) {
      set({ currentStepIndex: currentStepIndex - 1 });
    }
  },
  goTo: (index: number) => {
    const { steps } = get();
    if (index >= 0 && index < steps.length) {
      set({ currentStepIndex: index });
    }
  },
}));
