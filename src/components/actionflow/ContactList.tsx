// Author: Kushal Sharma
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Contact } from "@/types";
import ContactItem from "./ContactItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUIStore } from "@/hooks/useUIStore";
import { cn } from "@/lib/utils";

interface ContactListProps {
  contacts: Contact[];
  myContactId: string | null;
  icon: React.ReactNode;
  addContact: (name: string, email: string) => void;
  updateContact: (contactId: string, updates: Partial<Contact>) => void;
  deleteContact: (contactId: string) => void;
  setMyContact: (contactId: string) => void;
}

export default function ContactList({
  contacts,
  myContactId,
  icon,
  addContact,
  updateContact,
  deleteContact,
  setMyContact,
}: ContactListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  const { cardHeight, setCardHeight } = useUIStore();
  const [isResizing, setIsResizing] = useState(false);
  const [canScroll, setCanScroll] = useState(false);
  const scrollAreaViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAdding) {
      nameInputRef.current?.focus();
    }
  }, [isAdding]);

  const handleAddContact = () => {
    if (newContactName.trim()) {
      addContact(newContactName.trim(), newContactEmail.trim());
      setNewContactName("");
      setNewContactEmail("");
      setIsAdding(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddContact();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewContactName("");
      setNewContactEmail("");
    }
  };
  
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    document.body.style.cursor = 'ns-resize';
    setIsResizing(true);
    const startY = e.clientY;
    const startHeight = cardHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      setCardHeight(startHeight + deltaY);
    };

    const handleMouseUp = () => {
      document.body.style.cursor = 'default';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  const checkScrollability = useCallback(() => {
    const element = scrollAreaViewportRef.current;
    if (element) {
      setCanScroll(element.scrollHeight > element.clientHeight);
    }
  }, []);
  
  useEffect(() => {
    checkScrollability();
    const element = scrollAreaViewportRef.current;
    if (!element) return;
    
    const resizeObserver = new ResizeObserver(checkScrollability);
    resizeObserver.observe(element);
    
    return () => resizeObserver.disconnect();
  }, [contacts, cardHeight, checkScrollability]);

  return (
    <Card className={cn(
        "relative flex flex-col h-full shadow-md hover:shadow-xl transition-shadow duration-300",
        isResizing ? 'select-none' : ''
      )}
    >
      <CardHeader className="p-4">
        <CardTitle className="flex items-center gap-3 text-xl font-semibold">
          {icon}
          Contact List
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col gap-4 p-4 pt-0">
        <ScrollArea 
          className="flex-grow pr-4 -mr-4"
          style={{ height: `${cardHeight}px` }}
          viewportRef={scrollAreaViewportRef}
        >
          <div className="space-y-1">
            {contacts.length > 0 ? (
              contacts.map((contact) => (
                <ContactItem
                  key={contact.id}
                  contact={contact}
                  isMe={contact.id === myContactId}
                  onSetAsMe={() => setMyContact(contact.id)}
                  onUpdate={(updates) => updateContact(contact.id, updates)}
                  onDelete={() => deleteContact(contact.id)}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No contacts yet. Add one!</p>
            )}
          </div>
        </ScrollArea>
        <div 
          className="mt-auto pt-4 border-t"
          data-scrollable={canScroll}
        >
          {isAdding ? (
            <div className="flex flex-col gap-2">
              <Input
                ref={nameInputRef}
                type="text"
                placeholder="Contact Name"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="bg-card"
              />
              <Input
                type="email"
                placeholder="Contact Email (optional)"
                value={newContactEmail}
                onChange={(e) => setNewContactEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                className="bg-card"
              />
              <div className="flex items-center gap-2">
                 <Button className="flex-grow" size="sm" onClick={handleAddContact} disabled={!newContactName.trim()}>
                    <Plus className="mr-2 h-4 w-4" /> Add
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsAdding(false)}>
                    <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          )}
        </div>
      </CardContent>
       <div
        className="w-full h-2 cursor-ns-resize absolute bottom-0 left-0 z-10"
        onMouseDown={handleResizeMouseDown}
        title="Drag to resize card height"
      />
    </Card>
  );
}
