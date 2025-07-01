// Author: Kushal Sharma
"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, Loader2, Bot, FileText, Mic, Square, Plus, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { askTaskAssistant } from '@/ai/flows/task-assistant-flow';
import { summarizeText } from '@/ai/flows/summarize-text-flow';
import { createTasksFromText, CreatedTask, CreateTasksOutput } from '@/ai/flows/create-tasks-flow';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useActionFlowStore } from '@/hooks/useActionFlowStore';
import type { Task, TaskCategory } from '@/types';
import { Card, CardContent } from '../ui/card';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertTriangle } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatAssistantProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    isTourActive?: boolean;
}

export default function ChatAssistant({ isOpen, onOpenChange, isTourActive = false }: ChatAssistantProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hello! I'm Jarvis. Ask me about your tasks, or use the buttons below." },
  ]);

  const [showSummarizeDialog, setShowSummarizeDialog] = useState(false);
  const [textToSummarize, setTextToSummarize] = useState('');

  const [showListenDialog, setShowListenDialog] = useState(false);
  const [isLiveListening, setIsLiveListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const liveRecognitionRef = useRef<SpeechRecognition | null>(null);
  const liveFinalTranscriptRef = useRef('');

  const [isQueryListening, setIsQueryListening] = useState(false);
  const queryRecognitionRef = useRef<SpeechRecognition | null>(null);
  const queryFinalTranscriptRef = useRef('');

  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [taskText, setTaskText] = useState('');
  
  const [pendingClarification, setPendingClarification] = useState<string | null>(null);
  
  // State for the "Add Tasks" dialog
  const [addTaskDialogState, setAddTaskDialogState] = useState<'input' | 'loading' | 'confirmation' | 'error'>('input');
  const [addTaskData, setAddTaskData] = useState<CreateTasksOutput | null>(null);
  const [addTaskConfirmationView, setAddTaskConfirmationView] = useState<'detailed' | 'simple'>('detailed');
  const [editingTask, setEditingTask] = useState<{ index: number, text: string, isOriginal: boolean } | null>(null);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { state: actionFlowState, addTask } = useActionFlowStore(s => ({ state: s, addTask: s.addTask }));

  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

  const handleRegularQuery = async (query: string) => {
    try {
      const allTasks = JSON.stringify({
        dailyTasks: actionFlowState.dailyTasks,
        weeklyTasks: actionFlowState.weeklyTasks,
        sprintTasks: actionFlowState.sprintTasks,
        miscTasks: actionFlowState.miscTasks,
      });
      const now = new Date();
      const response = await askTaskAssistant({
        query,
        allTasks,
        currentDate: format(now, 'yyyy-MM-dd'),
        startOfWeek: format(startOfWeek(now, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
        endOfWeek: format(endOfWeek(now, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
      });
      setMessages(prev => [...prev, { role: 'assistant', content: response.answer }]);
    } catch (error) {
      console.error('Error calling task assistant:', error);
      const description = error instanceof Error ? error.message : 'Could not connect to the AI.';
      toast({ variant: 'destructive', title: 'Assistant Error', description });
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting to my brain." }]);
    }
  };
  
  const handleJarvisCommand = async (query: string) => {
      try {
        const response = await createTasksFromText({
          query,
          contacts: JSON.stringify(actionFlowState.contacts),
        });

        if (response.clarification) {
          setMessages(prev => [...prev, { role: 'assistant', content: response.clarification! }]);
          setPendingClarification(query);
          return true;
        } 
        
        const tasksToCreate = response.originalTask ? [response.originalTask] : response.tasks;
        
        if (tasksToCreate && tasksToCreate.length > 0) {
            tasksToCreate.forEach(task => {
                const options: Partial<Task> = {
                    owner: task.owner,
                    date: (task.category === 'daily' || task.category === 'misc' || task.category === 'weekly') ? format(new Date(), "yyyy-MM-dd") : undefined,
                    sprint: task.category === 'sprint' ? actionFlowState.activeSprintName : undefined,
                };
                addTask(task.category as TaskCategory, task.text, options);
            });

            const confirmationMessage = tasksToCreate.length === 1
                ? `Okay, I've added "${tasksToCreate[0].text}" to your ${tasksToCreate[0].category} list.`
                : `I've added ${tasksToCreate.length} tasks for you.`;
            
            setMessages(prev => [...prev, { role: 'assistant', content: confirmationMessage }]);
            return true; // Command was handled
        }
        
        return false; // Not a task creation command
      } catch (error) {
        console.warn('Task creation failed or was not applicable, falling back to general query:', error);
        if (error instanceof Error && error.message.includes("invalid_enum_value")) {
            return false;
        }
        toast({ variant: 'destructive', title: 'Task Creation Error', description: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}` });
        return true; 
      }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = input.trim();
    if (!query || isLoading) return;

    const userMessage: Message = { role: 'user', content: query };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    let wasHandled = false;

    if (pendingClarification) {
      const combinedQuery = `${pendingClarification}\nUser's answer: ${query}`;
      setPendingClarification(null);
      wasHandled = await handleJarvisCommand(combinedQuery);
    } else if (query.toLowerCase().startsWith('jarvis')) {
      wasHandled = await handleJarvisCommand(query);
    }
    
    if (!wasHandled) {
      await handleRegularQuery(query);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    if (typeof window === 'undefined' || (!window.SpeechRecognition && !window.webkitSpeechRecognition)) {
      console.warn('Speech Recognition not supported in this browser.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    const liveRec = new SpeechRecognition();
    liveRec.continuous = true;
    liveRec.interimResults = true;
    liveRec.lang = 'en-US';
    liveRec.onresult = (event) => {
      let interim = '';
      let final = liveFinalTranscriptRef.current;
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcriptPart + ' ';
        } else {
          interim += transcriptPart;
        }
      }
      liveFinalTranscriptRef.current = final;
      setTranscript(final + interim);
    };
    liveRec.onend = () => {
        setIsLiveListening(false);
    }
    liveRec.onerror = (event) => {
      if (event.error !== 'no-speech') {
        toast({ variant: 'destructive', title: 'Transcription Error', description: `An error occurred: ${event.error}` });
      }
      setIsLiveListening(false);
    };
    liveRecognitionRef.current = liveRec;

    const queryRec = new SpeechRecognition();
    queryRec.continuous = true; 
    queryRec.interimResults = true;
    queryRec.lang = 'en-US';
    queryRec.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = queryFinalTranscriptRef.current
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPart + ' ';
        } else {
          interimTranscript += transcriptPart;
        }
      }
      queryFinalTranscriptRef.current = finalTranscript;
      setInput(finalTranscript + interimTranscript);
    };
    queryRec.onend = () => {
      setIsQueryListening(false);
    };
    queryRec.onerror = (event) => {
      if (event.error !== 'no-speech') {
        toast({ variant: 'destructive', title: 'Speech-to-Text Error', description: `An error occurred: ${event.error}` });
      }
      setIsQueryListening(false);
    };
    queryRecognitionRef.current = queryRec;
  }, [toast]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (isOpen) onOpenChange(false);
        if (showListenDialog) {
          setShowListenDialog(false);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOpen, showListenDialog, onOpenChange]);

  const handleSummarize = async () => {
    if (!textToSummarize.trim() || isLoading) return;
    setShowSummarizeDialog(false);
    const userMessage: Message = { role: 'user', content: `Summarize: ${textToSummarize.substring(0, 50)}...` };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    try {
      const response = await summarizeText({ textToSummarize });
      setMessages(prev => [...prev, { role: 'assistant', content: response.summary }]);
    } catch (error) {
      console.error('Error calling summarize flow:', error);
      const description = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast({ variant: 'destructive', title: 'Summarization Error', description });
    } finally {
      setIsLoading(false);
      setTextToSummarize('');
    }
  };

  const handleStartListening = () => {
    if (liveRecognitionRef.current && !isLiveListening) {
      liveFinalTranscriptRef.current = '';
      setTranscript('');
      liveRecognitionRef.current.start();
      setIsLiveListening(true);
    }
  };
  
  const handleStopAndSave = useCallback(async () => {
    if (liveRecognitionRef.current && isLiveListening) {
      liveRecognitionRef.current.stop();
      
      const finalTranscript = liveFinalTranscriptRef.current.trim();
      if (finalTranscript) {
        try {
          const res = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: finalTranscript }),
          });
          const result = await res.json();
          if (result.success) toast({ title: 'Success', description: result.message });
          else throw new Error(result.message);
        } catch (error) {
          toast({ variant: 'destructive', title: 'Save Error', description: String(error) });
        }
      } else {
        toast({ title: 'Nothing to save', description: 'No speech was transcribed.' });
      }
    }
  }, [isLiveListening, toast]);
  
  const handleClearTranscript = () => {
    setTranscript('');
    liveFinalTranscriptRef.current = '';
  };
  
  const handleListenDialogChange = (open: boolean) => {
      if (!open) {
          if (liveRecognitionRef.current && isLiveListening) {
              liveRecognitionRef.current.stop();
          }
      }
      setShowListenDialog(open);
  }
  
  const handleQueryListen = () => {
    if (!queryRecognitionRef.current) return;
    if (isQueryListening) {
      queryRecognitionRef.current.stop();
    } else {
      setIsQueryListening(true);
      queryFinalTranscriptRef.current = ''; 
      setInput('');
      queryRecognitionRef.current.start();
    }
  };
  
  const handleCreateTasksInPopup = async () => {
    if (!taskText.trim()) return;
    setAddTaskDialogState('loading');
    try {
      const response = await createTasksFromText({
        query: taskText,
        contacts: JSON.stringify(actionFlowState.contacts),
      });

      if (response.clarification || !response.tasks || response.tasks.length === 0) {
        setAddTaskData({ tasks: [], originalTask: null, clarification: response.clarification || "I couldn't identify any tasks from your request. Please try rephrasing." });
        setAddTaskDialogState('error');
      } else {
        setAddTaskData(response);
        setAddTaskConfirmationView(response.originalTask ? 'detailed' : 'simple');
        setAddTaskDialogState('confirmation');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setAddTaskData({ tasks: [], originalTask: null, clarification: `Failed to process request. Please ensure your local AI model is running and configured correctly. Details: ${message}` });
      setAddTaskDialogState('error');
    }
  };

  const handleConfirmTasksFromPopup = () => {
    if (!addTaskData) return;
    const tasksToAdd = (addTaskData.originalTask && addTaskConfirmationView === 'simple')
      ? [addTaskData.originalTask]
      : addTaskData.tasks;

    if (!tasksToAdd || tasksToAdd.length === 0) return;

    tasksToAdd.forEach(task => {
      const options: Partial<Task> = {
        owner: task.owner,
        date: (task.category === 'daily' || task.category === 'misc' || task.category === 'weekly') ? format(new Date(), 'yyyy-MM-dd') : undefined,
        sprint: task.category === 'sprint' ? actionFlowState.activeSprintName : undefined,
      };
      addTask(task.category as TaskCategory, task.text, options);
    });

    toast({ title: 'Tasks Added', description: `Successfully added ${tasksToAdd.length} task(s).` });
    setShowAddTaskDialog(false);
  };

  const handleUpdatePendingTaskInPopup = (taskIndex: number, updates: Partial<CreatedTask>, isOriginal = false) => {
    if (!addTaskData) return;
    setAddTaskData(prevData => {
      if (!prevData) return null;
      const newData = { ...prevData };
      if (isOriginal && newData.originalTask) {
        newData.originalTask = { ...newData.originalTask, ...updates };
      } else if (!isOriginal) {
        const newTasks = [...newData.tasks];
        newTasks[taskIndex] = { ...newTasks[taskIndex], ...updates };
        newData.tasks = newTasks;
      }
      return newData;
    });
  };

  const renderPopupTaskEditor = (task: CreatedTask, index: number, isOriginal = false) => {
    const isEditingThisTask = editingTask?.index === index && editingTask.isOriginal === isOriginal;
    return (
      <div key={index} className="text-xs p-3 rounded-md bg-background border space-y-2">
        {isEditingThisTask ? (
          <Input
            autoFocus
            value={editingTask.text}
            onChange={(e) => setEditingTask({ ...editingTask, text: e.target.value })}
            onBlur={() => {
              if (editingTask) handleUpdatePendingTaskInPopup(editingTask.index, { text: editingTask.text }, isOriginal);
              setEditingTask(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') {
                if (editingTask) handleUpdatePendingTaskInPopup(editingTask.index, { text: editingTask.text }, isOriginal);
                setEditingTask(null);
              }
            }}
            className="h-8 text-sm font-semibold"
          />
        ) : (
          <p
            className="font-semibold text-sm cursor-text"
            onDoubleClick={() => setEditingTask({ index, text: task.text, isOriginal })}
          >
            {task.text}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={task.category}
            onValueChange={(newCategory: 'daily' | 'weekly' | 'sprint' | 'misc') =>
              handleUpdatePendingTaskInPopup(index, { category: newCategory }, isOriginal)
            }
          >
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="sprint">Sprint</SelectItem>
              <SelectItem value="misc">Misc</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={task.owner}
            onValueChange={(newOwner) =>
              handleUpdatePendingTaskInPopup(index, { owner: newOwner }, isOriginal)
            }
          >
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Owner" /></SelectTrigger>
            <SelectContent>
              {actionFlowState.contacts.map(c => (
                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => {
        if (!open) {
          if (isQueryListening && queryRecognitionRef.current) {
            queryRecognitionRef.current.stop();
          }
        }
        onOpenChange(open);
      }} modal={!isTourActive}>
        <SheetTrigger asChild>
          <Button id="jarvis-trigger-button" className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg" size="icon">
            <MessageSquare className="h-8 w-8" />
          </Button>
        </SheetTrigger>
        <SheetContent data-testid="jarvis-sheet-content" className="flex flex-col w-full sm:max-w-md p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="flex items-center gap-2"><Bot />Jarvis</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full" ref={scrollAreaRef}>
              <div className="p-4 space-y-4">
                {messages.map((message, index) => (
                  <div key={index} className={cn("flex items-end gap-2", message.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div className={cn("max-w-[80%] rounded-lg p-3 text-sm", message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                      <pre className="whitespace-pre-wrap font-sans">{message.content}</pre>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
          <div id="jarvis-controls" className="p-4 border-t bg-background">
            <div className="flex gap-2 mb-2">
              <Button variant="outline" size="sm" onClick={() => setShowAddTaskDialog(true)} disabled={isLoading}><Plus className="mr-2 h-4 w-4" />Add Tasks</Button>
              <Button variant="outline" size="sm" onClick={() => setShowSummarizeDialog(true)} disabled={isLoading}><FileText className="mr-2 h-4 w-4" />Summarize</Button>
              <Button variant="outline" size="sm" onClick={() => liveRecognitionRef.current ? setShowListenDialog(true) : toast({ variant: 'destructive', title: 'Unsupported Browser' })} disabled={isLoading}><Mic className="mr-2 h-4 w-4" />Listen</Button>
            </div>
            <form id="jarvis-form" onSubmit={handleSend} className="flex items-center gap-2">
              <div className="relative flex-grow">
                <Input id="jarvis-input" value={input} onChange={e => setInput(e.target.value)} placeholder={isQueryListening ? "Listening..." : "Ask Jarvis or type a query..."} disabled={isLoading} />
                <Button type="button" size="icon" variant="ghost" onClick={handleQueryListen} disabled={!queryRecognitionRef.current} className={cn("absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8", isQueryListening ? "text-destructive" : "")}>
                  {isQueryListening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              </div>
              <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Dialogs */}
      <Dialog open={showSummarizeDialog} onOpenChange={setShowSummarizeDialog}>
        <DialogContent><DialogHeader><DialogTitle>Summarize Text</DialogTitle></DialogHeader>
          <Textarea placeholder="Paste text here..." value={textToSummarize} onChange={(e) => setTextToSummarize(e.target.value)} className="h-64" />
          <DialogFooter><Button onClick={handleSummarize} disabled={isLoading || !textToSummarize.trim()}>{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Summarizing...</> : "Summarize"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddTaskDialog} onOpenChange={(open) => {
        setShowAddTaskDialog(open);
        if (!open) {
          setTimeout(() => {
            setTaskText('');
            setAddTaskDialogState('input');
            setAddTaskData(null);
          }, 300);
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Tasks with Jarvis</DialogTitle>
            {addTaskDialogState === 'input' && <DialogDescription>Describe the tasks you want to add in plain English.</DialogDescription>}
          </DialogHeader>
          
          {addTaskDialogState === 'input' && (
            <>
              <Textarea placeholder="e.g., The TPS report is due from Bill by end of day, and remind me to prepare for the weekly sync." value={taskText} onChange={(e) => setTaskText(e.target.value)} className="h-48" />
              <DialogFooter>
                <Button onClick={handleCreateTasksInPopup} disabled={!taskText.trim()}>Create Tasks</Button>
              </DialogFooter>
            </>
          )}

          {addTaskDialogState === 'loading' && (
            <div className="flex items-center justify-center h-48 gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Analyzing and creating tasks...</span>
            </div>
          )}
          
          {addTaskDialogState === 'error' && (
            <>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {addTaskData?.clarification || "An unknown error occurred."}
                </AlertDescription>
              </Alert>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddTaskDialogState('input')}>Go Back</Button>
              </DialogFooter>
            </>
          )}

          {addTaskDialogState === 'confirmation' && addTaskData && (
            <>
              <Card className="w-full bg-secondary border-primary/50">
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-3">Please confirm the tasks below.</p>
                  
                  {addTaskData.originalTask ? (
                    <Tabs
                      value={addTaskConfirmationView}
                      onValueChange={(value) => setAddTaskConfirmationView(value as 'detailed' | 'simple')}
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-2 h-9">
                        <TabsTrigger value="detailed">Detailed</TabsTrigger>
                        <TabsTrigger value="simple">Simple</TabsTrigger>
                      </TabsList>
                      <TabsContent value="detailed" className="space-y-3 mt-4">
                        <ScrollArea className="max-h-60 pr-3">
                          <div className="space-y-3">
                            {addTaskData.tasks.map((task, i) => renderPopupTaskEditor(task, i, false))}
                          </div>
                        </ScrollArea>
                      </TabsContent>
                      <TabsContent value="simple" className="space-y-3 mt-4">
                        {renderPopupTaskEditor(addTaskData.originalTask, 0, true)}
                      </TabsContent>
                    </Tabs>
                  ) : (
                    <ScrollArea className="max-h-72 pr-3 mt-4">
                      <div className="space-y-3">
                        {addTaskData.tasks.map((task, i) => renderPopupTaskEditor(task, i, false))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setAddTaskDialogState('input')}>Back</Button>
                <Button onClick={handleConfirmTasksFromPopup}>Confirm & Add Tasks</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>


      <Dialog open={showListenDialog} onOpenChange={handleListenDialogChange}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Live Transcription</DialogTitle>
                <DialogDescription>Your microphone is being used for live transcription. The transcript can be saved to a file.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-64 w-full rounded-md border p-4">
                {transcript || <span className="text-muted-foreground">Waiting for audio...</span>}
            </ScrollArea>
            <DialogFooter className="sm:justify-end gap-2">
                {isLiveListening ? (
                    <>
                        <Button onClick={() => handleListenDialogChange(false)} variant="ghost">Cancel</Button>
                        <Button onClick={handleStopAndSave} variant="destructive"><Square className="mr-2 h-4 w-4" />Stop & Save</Button>
                    </>
                ) : (
                    <>
                        {transcript && (
                            <Button onClick={handleClearTranscript} variant="outline" className="mr-auto"><Trash2 className="mr-2 h-4 w-4" />Clear</Button>
                        )}
                        <Button onClick={() => handleListenDialogChange(false)} variant="ghost">Close</Button>
                        <Button onClick={handleStartListening}><Mic className="mr-2 h-4 w-4" />Start Listening</Button>
                    </>
                )}
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
