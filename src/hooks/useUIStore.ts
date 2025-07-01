// Author: Kushal Sharma
"use client";

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const DEFAULT_CARD_HEIGHT = 330; // 320px, which is Tailwind's h-80 (20rem)

interface UIState {
  cardHeight: number;
  showProgress: boolean;
  showFilters: boolean;
  setCardHeight: (height: number) => void;
  resetCardHeight: () => void;
  toggleShowProgress: () => void;
  toggleShowFilters: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      cardHeight: DEFAULT_CARD_HEIGHT,
      showProgress: true,
      showFilters: true,
      setCardHeight: (height) => {
        const newHeight = Math.max(120, Math.min(800, height));
        set({ cardHeight: newHeight });
      },
      resetCardHeight: () => set({ cardHeight: DEFAULT_CARD_HEIGHT }),
      toggleShowProgress: () => set(state => ({ showProgress: !state.showProgress })),
      toggleShowFilters: () => set(state => ({ showFilters: !state.showFilters })),
    }),
    {
      name: 'actionflow-ui-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
