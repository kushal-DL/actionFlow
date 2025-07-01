// Author: Kushal Sharma
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import WalkthroughProvider from '@/components/actionflow/WalkthroughProvider';

export const metadata: Metadata = {
  title: 'ActionFlow',
  description: 'Track your daily, weekly, and sprint actions.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"></link>
      </head>
      <body className="font-body antialiased">
        <WalkthroughProvider>
          {children}
        </WalkthroughProvider>
        <Toaster />
      </body>
    </html>
  );
}
