'use client'; // Explicitly declare this is a client component

import { SessionProvider } from 'next-auth/react';

export function SessionProviderWrapper({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
