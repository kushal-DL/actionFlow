// Author: Kushal Sharma
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Download, Rocket, Settings, RotateCcw, HelpCircle } from "lucide-react";
import type { Sprint } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUIStore } from '@/hooks/useUIStore';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useWalkthroughStore } from '@/hooks/useWalkthroughStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import Link from 'next/link';


interface HeaderProps {
  sprints: Sprint[];
  activeSprintName: string;
  setActiveSprint: (sprintName: string) => void;
  exportToCsv: () => void;
}

export default function Header({
  sprints,
  activeSprintName,
  setActiveSprint,
  exportToCsv,
}: HeaderProps) {
  const router = useRouter();
  const { resetCardHeight } = useUIStore();
  const startTour = useWalkthroughStore(s => s.start);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  return (
    <>
      <header className="mb-8">
        <div id="app-header" className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2">
          <div className="flex items-center gap-4">
            <Rocket className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight text-foreground">ActionFlow</h1>
          </div>
          <div className="flex items-center gap-2 mt-4 sm:mt-0">
            <Button onClick={exportToCsv}><Download className="mr-2" /> Export</Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={resetCardHeight} variant="outline" size="icon">
                  <RotateCcw className="h-5 w-5" />
                  <span className="sr-only">Reset Card Height</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reset Card Height</p>
              </TooltipContent>
            </Tooltip>
            
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" id="help-button">
                        <HelpCircle className="h-5 w-5" />
                        <span className="sr-only">Help</span>
                      </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Help</p>
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={startTour}>Start Guided Tour</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsAboutOpen(true)}>About ActionFlow</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild variant="outline" size="icon" id="settings-button">
                  <Link href="/settings">
                    <Settings className="h-5 w-5" />
                    <span className="sr-only">Settings</span>
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Settings</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="flex items-center gap-2 group w-full max-w-sm">
          <Select value={activeSprintName} onValueChange={setActiveSprint}>
              <SelectTrigger id="header-sprint-selector" className="text-2xl font-semibold text-muted-foreground h-auto border-none shadow-none p-0 focus:ring-0">
                  <SelectValue placeholder="Select a sprint" />
              </SelectTrigger>
              <SelectContent>
                  {sprints.length > 0 ? (
                    sprints.map(sprint => (
                        <SelectItem key={sprint.name} value={sprint.name}>{sprint.name}</SelectItem>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">No sprints defined.</div>
                  )}
              </SelectContent>
          </Select>
        </div>
      </header>
      
      <Dialog open={isAboutOpen} onOpenChange={setIsAboutOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>About ActionFlow</DialogTitle>
            </DialogHeader>
            <div className="text-sm text-muted-foreground pt-2 space-y-3">
              <p>
                  ActionFlow is a smart task management application built with Next.js and React. It helps you organize your daily, weekly, and sprint-based tasks with the help of an AI assistant named Jarvis.
              </p>
              <p>
                  This application was created by Kushal Sharma.
              </p>
            </div>
            <DialogFooter>
                <Button onClick={() => setIsAboutOpen(false)}>Close</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
