// Author: Kushal Sharma
"use client";

import { useState, useEffect, useRef } from 'react';
import { Contact } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Edit, Check, Mail, User, Star } from "lucide-react";
import { cn } from '@/lib/utils';

interface ContactItemProps {
  contact: Contact;
  isMe: boolean;
  onUpdate: (updates: Partial<Omit<Contact, 'id'>>) => void;
  onDelete: () => void;
  onSetAsMe: () => void;
}

export default function ContactItem({ contact, isMe, onUpdate, onDelete, onSetAsMe }: ContactItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const editContainerRef = useRef<HTMLDivElement>(null);

  const handleStartEditing = () => {
    setEditName(contact.name);
    setEditEmail(contact.email);
    setIsEditing(true);
  };

  useEffect(() => {
    if (isEditing) {
        editContainerRef.current?.querySelector('input')?.focus();
    }
  }, [isEditing]);

  const handleUpdate = () => {
    const trimmedName = editName.trim();
    const trimmedEmail = editEmail.trim();
    
    if (!trimmedName) {
      setIsEditing(false);
      return;
    }
    
    if (trimmedName !== contact.name || trimmedEmail !== contact.email) {
      onUpdate({ name: trimmedName, email: trimmedEmail });
    }
    
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleUpdate();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (editContainerRef.current && !editContainerRef.current.contains(e.relatedTarget as Node)) {
        handleUpdate();
    }
  }

  return (
    <div className="relative flex items-center gap-2 rounded-md hover:bg-secondary/50 transition-colors duration-200 group p-2">
       <Button variant="ghost" size="icon" onClick={onSetAsMe} className="h-8 w-8 text-muted-foreground hover:text-amber-500 shrink-0">
        <Star className={cn("h-4 w-4", isMe && "fill-amber-400 text-amber-500")} />
        <span className="sr-only">Set as my contact</span>
      </Button>
      {isEditing ? (
        <div ref={editContainerRef} onBlur={handleBlur} className="flex-grow flex flex-col items-start gap-2">
            <Input
              value={editName}
              placeholder="Name"
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8 flex-grow bg-background"
            />
             <Input
              value={editEmail}
              placeholder="Email"
              onChange={(e) => setEditEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8 flex-grow bg-background"
            />
        </div>
      ) : (
        <div
          onDoubleClick={handleStartEditing}
          className="flex-grow flex flex-col items-start gap-1 cursor-pointer"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <User className="w-4 h-4 text-muted-foreground" />
            <span>{contact.name}</span>
          </div>
          {contact.email && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="w-3 h-3" />
              <span>{contact.email}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center self-start">
        {isEditing ? (
           <Button variant="ghost" size="icon" onClick={handleUpdate} className="h-8 w-8">
             <Check className="h-4 w-4" />
           </Button>
        ) : (
          <div className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0 p-1 rounded-md bg-background/80 backdrop-blur-sm shadow-lg transition-opacity duration-200",
            "opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
         )}>
            <Button variant="ghost" size="icon" onClick={handleStartEditing} className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <Edit className="h-4 w-4" />
                <span className="sr-only">Edit Contact</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete Contact</span>
            </Button>
        </div>
        )}
      </div>
    </div>
  );
}
