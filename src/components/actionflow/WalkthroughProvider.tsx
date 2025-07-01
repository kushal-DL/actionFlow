// Author: Kushal Sharma
"use client";

import React from 'react';
import WalkthroughGuide from './WalkthroughGuide';

export default function WalkthroughProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <WalkthroughGuide />
    </>
  );
}
