// Author: Kushal Sharma
"use client";

import { useEffect } from 'react';
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { useActionFlowStore } from "@/hooks/useActionFlowStore";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Sun, Calendar, GanttChartSquare, Users, Settings as SettingsIcon, AlertTriangle, ArrowLeft } from "lucide-react";
import ContactList from "@/components/actionflow/ContactList";
import SprintList from "@/components/actionflow/SprintList";
import TaskList from "@/components/actionflow/TaskList";
import type { Task, TaskCategory } from "@/types";
import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsPage() {
  const { 
    state, 
    isLoaded,
    loadState, 
    addTask, 
    toggleTask, 
    deleteTask, 
    updateTask, 
    addSprint, 
    deleteSprint, 
    addContact, 
    updateContact, 
    deleteContact,
    setMyContact,
    clearActiveSprintTasks, 
    resetApplicationData 
  } = useActionFlowStore(s => ({ state: s, ...s }));

  const router = useRouter();

  useEffect(() => {
    if (loadState) {
      loadState();
    }
  }, [loadState]);

  const renderTaskList = (category: TaskCategory, title: string, tasks: Task[], icon: React.ReactNode) => (
    <TaskList
      category={category}
      title={title}
      tasks={tasks}
      contacts={state.contacts}
      addTask={addTask}
      toggleTask={toggleTask}
      deleteTask={deleteTask}
      updateTask={updateTask}
      icon={icon}
      showCheckbox={false}
    />
  );
  
  if (!isLoaded) {
    return (
        <main className="min-h-screen bg-background font-sans text-foreground">
             <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
                <header className="mb-8 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-10 w-48" />
                    </div>
                    <Skeleton className="h-10 w-36" />
                </header>
                <Skeleton className="h-10 w-1/2 mx-auto mb-6" />
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader>
                            <CardContent className="space-y-3 pt-6">
                                <Skeleton className="h-6 w-full" />
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="h-6 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </main>
    )
  }

  return (
    <main className="min-h-screen bg-background font-sans text-foreground flex flex-col">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 flex-grow w-full">
            <header className="mb-8 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <SettingsIcon className="h-8 w-8 text-primary" />
                    <h1 className="text-4xl font-bold tracking-tight text-foreground">Settings</h1>
                </div>
                <Link href="/" passHref>
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Tasks
                    </Button>
                </Link>
            </header>
            
            <Tabs defaultValue="defaults" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="defaults">Defaults</TabsTrigger>
                    <TabsTrigger value="reset">Reset Options</TabsTrigger>
                </TabsList>
                
                <TabsContent value="defaults">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        {renderTaskList("defaultDaily", "Default Daily Tasks", state.defaultDailyTasks, <Sun className="w-6 h-6 text-primary" />)}
                        {renderTaskList("defaultWeekly", "Default Weekly Tasks", state.defaultWeeklyTasks, <Calendar className="w-6 h-6 text-primary" />)}
                        <SprintList 
                            sprints={state.sprints}
                            addSprint={addSprint}
                            deleteSprint={deleteSprint}
                            icon={<GanttChartSquare className="w-6 h-6 text-primary" />}
                        />
                        <ContactList
                            contacts={state.contacts}
                            myContactId={state.myContactId}
                            setMyContact={setMyContact}
                            addContact={addContact}
                            updateContact={updateContact}
                            deleteContact={deleteContact}
                            icon={<Users className="w-6 h-6 text-primary" />}
                        />
                    </div>
                </TabsContent>
                
                <TabsContent value="reset">
                    <Card className="max-w-xl mx-auto">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <SettingsIcon className="w-6 h-6 text-primary"/>
                                <h2 className="text-xl font-semibold">Application Reset</h2>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <h3 className="font-semibold">Clear Active Sprint Tasks</h3>
                                    <p className="text-sm text-muted-foreground">Permanently delete all tasks from the sprint "{state.activeSprintName || 'N/A'}".</p>
                                </div>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" className="mt-2 sm:mt-0" disabled={!state.activeSprintName}>Clear Tasks</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will permanently delete all tasks from the active sprint: <span className="font-semibold text-foreground">{state.activeSprintName}</span>. This action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={clearActiveSprintTasks}>Yes, clear tasks</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>

                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg bg-destructive/10 border-destructive/20">
                                <div>
                                    <h3 className="font-semibold text-destructive">Reset All Application Data</h3>
                                    <p className="text-sm text-destructive/80">Permanently delete ALL tasks, sprints, and contacts. The application will be restored to its default state.</p>
                                </div>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" className="mt-2 sm:mt-0">Reset Application</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive"/>Confirm Total Reset</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                You are about to delete <span className="font-bold">ALL</span> data, including every task, sprint, and contact you have created. This cannot be undone. Are you sure you wish to proceed?
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={resetApplicationData} className="bg-destructive hover:bg-destructive/90">Yes, I understand. Reset everything.</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
        <footer className="text-center text-xs text-muted-foreground py-4">
            Created by: Kushal Sharma
        </footer>
    </main>
  );
}
