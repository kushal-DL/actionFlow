// Author: Kushal Sharma
"use client";

import { useActionFlowStore } from "@/hooks/useActionFlowStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Sun, Calendar, GanttChartSquare, Users, Settings as SettingsIcon, AlertTriangle } from "lucide-react";
import ContactList from "./ContactList";
import SprintList from "./SprintList";
import TaskList from "./TaskList";
import type { Task, TaskCategory } from "@/types";

interface SettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  store: ReturnType<typeof useActionFlowStore>;
}

export default function SettingsDialog({ isOpen, onOpenChange, store }: SettingsDialogProps) {
  const { state, addTask, toggleTask, deleteTask, updateTask, addSprint, deleteSprint, addContact, updateContact, deleteContact, clearActiveSprintTasks, resetApplicationData } = store;

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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Application Settings & Defaults</DialogTitle>
          <DialogDescription>
            Manage default tasks, contacts, sprints, and application data.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="defaults" className="flex-grow flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="defaults">Defaults</TabsTrigger>
            <TabsTrigger value="reset">Reset Options</TabsTrigger>
          </TabsList>
          
          <TabsContent value="defaults" className="flex-grow overflow-auto p-1">
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
                addContact={addContact}
                updateContact={updateContact}
                deleteContact={deleteContact}
                icon={<Users className="w-6 h-6 text-primary" />}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="reset" className="flex-grow overflow-auto p-1">
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
      </DialogContent>
    </Dialog>
  );
}
