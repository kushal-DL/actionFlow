// Author: Kushal Sharma
"use client";

import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useWalkthroughStore } from '@/hooks/useWalkthroughStore';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';

const PADDING = 10;
const Z_INDEX = 9999;

export default function WalkthroughGuide() {
  const { isActive, currentStepIndex, steps, next, prev, end } = useWalkthroughStore();
  const [targetBox, setTargetBox] = useState<DOMRect | null>(null);

  const currentStep = steps[currentStepIndex];

  useLayoutEffect(() => {
    if (!isActive || !currentStep) {
      setTargetBox(null);
      return;
    }

    if (currentStep.action) {
      currentStep.action();
    }

    const updatePosition = () => {
      if (currentStep.element) {
        const element = document.querySelector(currentStep.element);
        if (element) {
          setTargetBox(element.getBoundingClientRect());
        } else {
          console.warn(`Walkthrough element not found: ${currentStep.element}`);
          setTargetBox(null);
        }
      } else {
        setTargetBox(null); // It's a modal step
      }
    };
    
    // Sometimes the DOM needs a moment to update after an action (like a route change or animation)
    setTimeout(updatePosition, 550);

    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('resize', updatePosition);
    };
  }, [currentStep, isActive]);

  if (!isActive) return null;
  
  // Modal / Centered Step
  if (!currentStep.element || !targetBox) {
    return (
        <Dialog open={isActive} onOpenChange={(open) => !open && end()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{currentStep.title}</DialogTitle>
                </DialogHeader>
                <div className="py-4 text-sm">
                    {currentStep.content}
                </div>
                 <DialogFooter className='sm:justify-between'>
                    <span className="text-xs text-muted-foreground">Step {currentStepIndex + 1} of {steps.length}</span>
                    <div className="flex gap-2">
                        {currentStepIndex > 0 && <Button variant="outline" onClick={prev}>Previous</Button>}
                        {currentStepIndex < steps.length - 1 ? (
                            <Button onClick={next}>Next</Button>
                        ) : (
                            <Button onClick={end}>Finish</Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
  }

  // Popover / Highlighted Step
  return (
    <>
      {/* Dimming overlay that is clickable to exit tour */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          // This path creates a full-screen rectangle, then a smaller one for the hole.
          // The 'evenodd' rule makes the overlapping area (the hole) transparent.
          clipPath: `path(evenodd, 'M 0 0 H ${window.innerWidth} V ${window.innerHeight} H 0 Z M ${targetBox.left - PADDING} ${targetBox.top - PADDING} H ${targetBox.right + PADDING} V ${targetBox.bottom + PADDING} H ${targetBox.left - PADDING} Z')`,
          zIndex: Z_INDEX,
        }}
        onClick={end}
      />
      
      {/* Highlight border around the cutout area */}
      <div
        style={{
            position: 'fixed',
            top: targetBox.top - PADDING,
            left: targetBox.left - PADDING,
            width: targetBox.width + PADDING * 2,
            height: targetBox.height + PADDING * 2,
            pointerEvents: 'none',
            borderRadius: '6px',
            border: '2px solid hsl(var(--primary))',
            boxShadow: '0 0 10px hsl(var(--primary))',
            zIndex: Z_INDEX,
        }}
      />

      {/* Popover Content Card */}
      <Card
        style={{
            position: 'fixed',
            zIndex: Z_INDEX + 1,
            ...getPositionStyles(targetBox, currentStep.placement),
        }}
        className={cn("w-80 animate-in fade-in-50 slide-in-from-top-10 ")}
      >
        <CardHeader>
          <CardTitle className="text-lg">{currentStep.title}</CardTitle>
           <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={end}>
              <X className="h-4 w-4" />
           </Button>
        </CardHeader>
        <CardContent className="text-sm">
            {currentStep.content}
        </CardContent>
        <CardFooter className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Step {currentStepIndex + 1} of {steps.length}</span>
          <div className="flex gap-2">
            {currentStepIndex > 0 && (
              <Button variant="outline" size="sm" onClick={prev}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Prev
              </Button>
            )}
            {currentStepIndex < steps.length - 1 ? (
                <Button size="sm" onClick={next}>
                    Next <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
            ) : (
                <Button size="sm" onClick={end}>Finish</Button>
            )}
          </div>
        </CardFooter>
        <Progress value={((currentStepIndex + 1) / steps.length) * 100} className="h-1" />
      </Card>
    </>
  );
}


function getPositionStyles(box: DOMRect, placement?: 'top' | 'bottom' | 'left' | 'right'): React.CSSProperties {
    const styles: React.CSSProperties = {};
    const cardWidth = 320; // w-80
    const cardHeight = 250; // estimate
    const spacing = PADDING + 10;
    
    switch (placement) {
        case 'top':
            styles.top = box.top - cardHeight - spacing;
            styles.left = box.left + box.width / 2 - cardWidth / 2;
            break;
        case 'left':
            styles.top = box.top + box.height / 2 - cardHeight / 2;
            styles.left = box.left - cardWidth - spacing;
            break;
        case 'right':
            styles.top = box.top + box.height / 2 - cardHeight / 2;
            styles.left = box.left + box.width + spacing;
            break;
        case 'bottom':
        default:
            styles.top = box.top + box.height + spacing;
            styles.left = box.left + box.width / 2 - cardWidth / 2;
            break;
    }

    // Boundary checks to prevent going off-screen
    if (styles.left && (styles.left as number) < PADDING) styles.left = PADDING;
    if (styles.top && (styles.top as number) < PADDING) styles.top = PADDING;
    if (styles.left && (styles.left as number) + cardWidth > window.innerWidth - PADDING) {
        styles.left = window.innerWidth - cardWidth - PADDING;
    }
     if (styles.top && (styles.top as number) + cardHeight > window.innerHeight - PADDING) {
        styles.top = window.innerHeight - cardHeight - PADDING;
    }

    return styles;
}
