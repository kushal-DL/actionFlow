// Author: Kushal Sharma
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { TaskStoreState } from '@/types';

const dataFilePath = path.join(process.cwd(), 'src', 'data', 'tasks.json');

// The default state is now completely empty.
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

// Simplified migration/check for data structure.
const migrateData = (data: any): TaskStoreState => {
    // A simple check to see if the main keys exist.
    if (data.sprints && Array.isArray(data.sprints)) {
        return {
            ...defaultState, // provide defaults for any missing keys
            ...data, // override with loaded data
            myContactId: data.myContactId !== undefined ? data.myContactId : defaultState.myContactId,
        } as TaskStoreState;
    }
    // If not, it's likely old data or corrupted, so we return a default structure.
    return {
        ...defaultState,
        ...data,
        sprints: data.sprints || [],
        activeSprintName: data.activeSprintName || '',
        myContactId: data.myContactId !== undefined ? data.myContactId : defaultState.myContactId,
    };
};

async function readData(): Promise<TaskStoreState> {
  try {
    const data = await fs.readFile(dataFilePath, 'utf-8');
    let state: TaskStoreState = migrateData(JSON.parse(data));
    return state;
  } catch (error) {
    // If the file doesn't exist or is invalid, create it with the default state.
    await writeData(defaultState);
    return defaultState;
  }
}

async function writeData(data: TaskStoreState): Promise<void> {
  await fs.mkdir(path.dirname(dataFilePath), { recursive: true });
  await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function GET() {
  const data = await readData();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    await writeData(data);
    return NextResponse.json({ success: true, message: 'Data saved successfully.' });
  } catch (error) {
    console.error('Failed to save data:', error);
    return NextResponse.json({ success: false, message: 'Failed to save data.' }, { status: 500 });
  }
}
