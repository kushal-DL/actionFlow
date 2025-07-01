// Author: Kushal Sharma
"use client";

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const DEFAULT_CARD_HEIGHT = 330; // 320px, which is Tailwind's h-80 (20rem)

interface UIState {
  cardHeight: number;
  setCardHeight: (height: number) => void;
  resetCardHeight: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      cardHeight: DEFAULT_CARD_HEIGHT,
      setCardHeight: (height) => {
        const newHeight = Math.max(120, Math.min(800, height));
        set({ cardHeight: newHeight });
      },
      resetCardHeight: () => set({ cardHeight: DEFAULT_CARD_HEIGHT }),
    }),
    {
      name: 'actionflow-ui-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
