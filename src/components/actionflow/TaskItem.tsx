// Author: Kushal Sharma
"use client";

import { useState, useEffect, useRef } from 'react';
import { Task, Contact, TaskCategory } from "@/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Trash2, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TaskItemProps {
  task: Task;
  contacts: Contact[];
  onToggle: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<Omit<Task, 'id' | 'completed' | 'date'>>) => void;
  showCheckbox?: boolean;
  isFocused?: boolean;
}

export default function TaskItem({ task, contacts, onToggle, onDelete, onUpdate, showCheckbox = true, isFocused = false }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [editOwner, setEditOwner] = useState("");
  const [isOwnerPopoverOpen, setIsOwnerPopoverOpen] = useState(false);
  
  const textInputRef = useRef<HTMLInputElement>(null);
  const editContainerRef = useRef<HTMLDivElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: isEditing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto',
  };

  const handleStartEditing = () => {
    setEditText(task.text);
    setEditOwner(task.owner);
    setIsEditing(true);
  };
  
  useEffect(() => {
    if (isEditing) {
      textInputRef.current?.focus();
      textInputRef.current?.select();
    }
  }, [isEditing]);

  const handleUpdate = () => {
    if (!isEditing) return;

    const trimmedText = editText.trim();
    // Revert to original owner if the field is cleared
    const finalOwner = editOwner.trim() || task.owner;

    if (!trimmedText) {
      setIsEditing(false);
      return;
    }
    
    if (trimmedText !== task.text || finalOwner !== task.owner) {
      onUpdate({ text: trimmedText, owner: finalOwner });
    }
    
    setIsEditing(false);
    setIsOwnerPopoverOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleUpdate();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setIsOwnerPopoverOpen(false);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (editContainerRef.current && !editContainerRef.current.contains(e.relatedTarget as Node)) {
        handleUpdate();
    }
  }

  const filteredContacts = contacts.filter((contact) =>
    editOwner && contact.name.toLowerCase().includes(editOwner.toLowerCase())
  );

  return (
    <div
      ref={setNodeRef}
      id={task.id}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "relative group flex gap-3 rounded-md hover:bg-secondary/50 transition-colors duration-200 p-2 touch-none",
        isFocused && "ring-2 ring-inset ring-primary"
        )}
      onClick={(e) => {
        if (!isEditing) {
            const target = e.target as HTMLElement;
            // Prevent toggling when clicking on interactive elements inside
            if (target.closest('button, a, input')) return;
            onToggle();
        }
      }}
      onDoubleClick={(e) => {
         if (!isEditing) {
            const target = e.target as HTMLElement;
            if (target.closest('button, a, input, [role=checkbox]')) return;
            handleStartEditing();
        }
      }}
    >
      {showCheckbox && (
        <Checkbox
          id={`${task.id}-checkbox`}
          checked={task.completed}
          onCheckedChange={onToggle}
          onClick={(e) => e.stopPropagation()}
          className="data-[state=checked]:bg-accent data-[state=checked]:border-accent-foreground self-center"
        />
      )}
      {isEditing ? (
        <div ref={editContainerRef} onBlur={handleBlur} className="flex-grow flex items-center gap-2">
            <Input
              ref={textInputRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onFocus={() => setIsOwnerPopoverOpen(false)}
              onKeyDown={handleKeyDown}
              className="h-8 flex-grow bg-background"
            />
             <Popover open={isOwnerPopoverOpen} onOpenChange={setIsOwnerPopoverOpen}>
                <PopoverAnchor>
                    <Input
                      value={editOwner}
                      placeholder="Owner"
                      autoComplete="off"
                      onFocus={() => setIsOwnerPopoverOpen(true)}
                      onChange={(e) => {
                        setEditOwner(e.target.value);
                        if (!isOwnerPopoverOpen) {
                          setIsOwnerPopoverOpen(true);
                        }
                      }}
                      onKeyDown={(e) => {
                         if (e.key === 'Enter') {
                            e.preventDefault();
                            handleUpdate();
                          } else if (e.key === 'Escape') {
                            setIsEditing(false);
                            setIsOwnerPopoverOpen(false);
                          }
                      }}
                      className="h-8 w-32 bg-background"
                    />
                </PopoverAnchor>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <div className="flex flex-col max-h-48 overflow-y-auto">
                        {filteredContacts.length > 0 ? (
                            filteredContacts.map(contact => (
                                <div
                                    key={contact.id}
                                    className="flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        setEditOwner(contact.name);
                                        setIsOwnerPopoverOpen(false);
                                        textInputRef.current?.focus();
                                    }}
                                >
                                    {contact.name}
                                </div>
                            ))
                        ) : (
                          <p className="p-2 text-xs text-muted-foreground">
                            Type to add a new owner.
                          </p>
                        )}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
      ) : (
        <div
          className={cn(
            "flex-grow flex items-center justify-between gap-2 min-w-0"
          )}
        >
          <label
            htmlFor={`${task.id}-checkbox`}
            className={cn(
              "text-sm cursor-pointer transition-all duration-300 min-w-0 pr-2 break-words",
              task.completed ? "line-through text-muted-foreground" : "text-foreground"
            )}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {task.text}
          </label>
          {task.owner && (
            <Badge variant="secondary" className="font-normal flex-shrink-0 text-center max-w-[85px]">
              {task.owner}
            </Badge>
          )}
        </div>
      )}

      {!isEditing && (
         <div className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0 p-1 rounded-md bg-background/80 backdrop-blur-sm shadow-lg transition-opacity duration-200",
            "opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
         )}>
            <Button variant="ghost" size="icon" onClick={(e) => {e.stopPropagation(); handleStartEditing();}} className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <Edit className="h-4 w-4" />
                <span className="sr-only">Edit Task</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={(e) => {e.stopPropagation(); onDelete();}} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete Task</span>
            </Button>
        </div>
      )}
    </div>
  );
}
