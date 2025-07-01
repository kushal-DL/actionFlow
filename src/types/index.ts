// Author: Kushal Sharma
export interface Task {
  id: string;
  text: string;
  completed: boolean;
  owner: string;
  date?: string; // YYYY-MM-DD. For daily, weekly (start of week), misc (creation).
  sprint?: string; // e.g., '25.3-P1S1'
}

export interface Contact {
  id: string;
  name: string;
  email: string;
}

export interface Sprint {
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export type TaskCategory = 'daily' | 'weekly' | 'sprint' | 'misc' | 'defaultDaily' | 'defaultWeekly' | 'defaultSprint';

export type ContactCategory = 'contacts';

export type TaskStoreState = {
  activeSprintName: string;
  sprints: Sprint[];
  dailyTasks: Task[];
  weeklyTasks: Task[];
  sprintTasks: Task[];
  miscTasks: Task[];
  contacts: Contact[];
  myContactId: string | null;
  defaultDailyTasks: Task[];
  defaultWeeklyTasks: Task[];
  defaultSprintTasks: Task[];
};
